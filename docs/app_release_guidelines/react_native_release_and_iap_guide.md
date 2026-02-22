# React Native (Expo) アプリのリリースビルドと課金(IAP)設定ガイド

本ドキュメントは、React Native (Expo) プロジェクトにおける Android 向けリリースビルド (AAB作成) の手順、および `react-native-iap` を用いたアプリ内課金機能の実装・設定方法をまとめたものです。

---

## 1. アプリのビルド方法 (AAB作成)

Google Play Store にアプリを提出するためには、最適化された Android App Bundle (AAB) 形式でビルドを行う必要があります。

### 1.1 バージョンの更新
リリースごとに、アプリの内部バージョン番号 (`versionCode`) をインクリメントする必要があります。
Play Store では、過去にアップロードしたAABと同じ `versionCode` を持つファイルをアップロードすることはできません。

- **app.json**
  ```json
  "android": {
      "versionCode": 82 // ← 前回より1つ増やす
  }
  ```
- **android/app/build.gradle**
  ```gradle
  defaultConfig {
      versionCode 82 // ← app.jsonと同じ値にする
  }
  ```

### 1.1.1 バージョン更新後の必須作業 (Expo Prebuild)
**【重要】** `app.json` の `versionCode` を変更しただけでは、React Native (Expo) のビルドキャッシュやネイティブディレクトリ (`android/`) に変更が浸透せず、古いバージョンのままビルドされてしまう事故が多発します。
バージョンを変更した後は、**必ず以下のコマンドを実行して Android ディレクトリの設定を同期・再生成**してください。

```bash
npx expo prebuild
```
※ 注: もし `npx expo prebuild --clean` を実行した場合は、後述の「1.4 ネイティブモジュール連携時の注意」に従って不足設定を補填してください。

### 1.2 SDKパスの設定 (エラー回避)
Androidのビルド時に `SDK location not found` エラーが発生する場合は、`android/local.properties` を作成（または確認）し、以下の記述を追加します。

```properties
# android/local.properties
sdk.dir=/Users/user/Library/Android/sdk
```

### 1.3 署名(キーストア)の設定
本番環境向けのAABをビルドするには、リリース用の署名鍵（`.jks` ファイル）の設定が必要です。

1. **gradle.properties への資格情報追加**
   `android/gradle.properties` に、署名ファイルへのパスとパスワードを記述します。
   ```properties
   MYAPP_UPLOAD_STORE_FILE=../../credentials/android/keystore.jks
   MYAPP_UPLOAD_STORE_PASSWORD=********
   MYAPP_UPLOAD_KEY_ALIAS=********
   MYAPP_UPLOAD_KEY_PASSWORD=********
   ```

2. **build.gradle の signingConfigs 設定**
   `android/app/build.gradle` でリリース用ビルドが上記の資格情報を読み込むようにします。
   ```gradle
   signingConfigs {
       release {
           if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
               storeFile file(MYAPP_UPLOAD_STORE_FILE)
               storePassword MYAPP_UPLOAD_STORE_PASSWORD
               keyAlias MYAPP_UPLOAD_KEY_ALIAS
               keyPassword MYAPP_UPLOAD_KEY_PASSWORD
           }
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
       }
   }
   ```

### 1.4 ネイティブモジュール (Rust/C++) 連携時の注意
Expo環境で独自のC++やRustコード（ローカルモジュール）を連携させている場合、`npx expo prebuild --clean` 等でAndroidディレクトリを再生成すると、一部の設定が消失し**アプリ起動時クラッシュ（nullエラー）**の原因になります。

- **トラブル回避策**：ローカルモジュールのディレクトリ（例: `modules/shogi-engine/package.json`）内には、必ず以下のように自動リンクの設定（`expo-module.config.json` 等への参照）を残す必要があります。
  ```json
  {
      "expo": {
          "modules": [
              "expo-module.config.json"
          ]
      }
  }
  ```

設定が完了したら、以下のコマンドでクリーンビルドとAABパッケージの生成を行います（確実を期すため、prebuild から一気に行うことを推奨します）。

```bash
npx expo prebuild
cd android
./gradlew clean bundleRelease
```

成功すると、以下のパスに出力されます。
`android/app/build/outputs/bundle/release/app-release.aab`

---

## 2. アプリ内課金 (IAP) の設定と実装

本プロジェクトでは `react-native-iap` (v14以降) を使用しています。

### 2.1 Google Play Console での準備
1. **アプリのリリース作成**
   IAPを利用するには、事前に「アルファ版」や「内部テスト版」として一度AABをPlay Consoleにアップロードしておく必要があります。
2. **プロダクトの作成**
   Play Console の「アプリ内アイテム（In-App Products）」または「定期購入（Subscriptions）」画面でアイテムを作成します。
   - **プロダクトID**: 例 `com.kashin252.shogiapp.premium` (コード側で指定するIDと完全一致させる)
   - **ステータス**: 必ず「有効（Active）」にする。

### 2.2 ライブラリの初期化 (App.tsx レベル)
アプリの起動時にストアコネクションを初期化します。

```tsx
import { initConnection, endConnection } from 'react-native-iap';

useEffect(() => {
  const initIAP = async () => {
    try {
      await initConnection();
    } catch (e) {
      console.error('IAP Initialization failed', e);
    }
  };
  initIAP();

  return () => {
    endConnection();
  };
}, []);
```

### 2.3 アイテムの取得と購入処理
※ v14 では、アイテム一覧の取得に `getProducts` ではなく `fetchProducts` を推奨・使用します。

```tsx
import { fetchProducts, requestPurchase } from 'react-native-iap';

const PRODUCT_IDS = ['com.kashin252.shogiapp.premium'];

// アイテム情報を取得
const fetchPremiumItem = async () => {
  try {
    const products = await fetchProducts({ skus: PRODUCT_IDS });
    // products[0] に価格やタイトル等の情報が入る
  } catch (err) {
    console.error('Failed to fetch products', err);
  }
};

// 購入処理の開始
const buyPremium = async () => {
  try {
    const purchase = await requestPurchase({
      skus: PRODUCT_IDS,
    });
    // 購入成功後のレシート検証・権限付与を実行
  } catch (err) {
    console.error('Purchase failed or cancelled', err);
  }
};
```

### 2.4 テスト環境での注意点
課金のテスト（アイテムが正しく取得できるか、購入ダイアログが出るか）を行う場合、以下の制約に気をつける必要があります。

1. **実機であること**: エミュレータではGoogle Playの決済システムが正しく動作しません。
2. **テストアカウントの登録**: Play Console の「ライセンステスト」メニューに、テストで使用するGoogleアカウントのメールアドレスを登録しておく必要があります。
3. **署名付きのリリースビルド推奨**: デバッグビルドではなく、実際にAAB等で署名されたバージョンを「クローズドテスト」や「内部テスト」に配信し、そこからインストールしたアプリでテストを行うのが最も確実です。（実機のローカルビルドでも、テストアカウントさえ一致していれば動く場合はあります）。
