# Android リリースビルド手順書

ローカル環境（自分のPC）で、Google Play Console アップロード用の AAB ファイルを作成する手順です。

## 1. 事前準備 (署名鍵の設定)
リリースビルドには署名鍵が必要です。本プロジェクトでは `credentials.json` の情報を利用するように設定済みです。

- **確認事項**: `credentials/android/keystore.jks` が存在すること。
- **設定ファイル**: `android/gradle.properties` に署名情報が記述されています（自動設定済み）。

## 2. バージョン更新
アップロード前に必ずバージョンコードを上げる必要があります。以下の2ファイルを修正してください。

1. **`android/app/build.gradle`**
   ```gradle
   defaultConfig {
       // ...
       versionCode 31  // ここを +1 する (例: 30 -> 31)
       // ...
   }
   ```

2. **`app.json`**
   ```json
   "android": {
     // ...
     "versionCode": 31  // build.gradleと同じ値にする
   }
   ```
   *(補足: `src/screens/PremiumScreen.tsx` の表示更新も推奨)*

## 3. ビルドコマンドの実行
ターミナルで以下のコマンドを実行します。

```bash
# Androidディレクトリに移動してビルド
cd android && ./gradlew clean bundleRelease
```

- `clean`: 古いビルドファイルを削除（エラー防止のため推奨）
- `bundleRelease`: リリース用 AAB ファイル生成

**所要時間**: 数分〜10分程度

## 4. 生成ファイルの確認
成功すると、以下のパスに AAB ファイルが生成されます。

`android/app/build/outputs/bundle/release/app-release.aab`

このファイルを Google Play Console にアップロードしてください。

## 補足: クラッシュ対策設定
現在、リリースビルドでのクラッシュを防ぐため、`android/app/build.gradle` で以下の設定が無効化されています。

```gradle
release {
    // ...
    shrinkResources false // リソース削除無効
    minifyEnabled false   // コード難読化無効 (R8無効)
    // ...
}
```
※ これらを `true` に戻すとアプリサイズは小さくなりますが、起動クラッシュのリスクがあります。
