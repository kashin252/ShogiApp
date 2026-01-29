# EAS ビルド手順書

## 前提条件

- Node.js がインストールされていること
- EAS CLI がインストールされていること（初回のみ）
- Expo アカウントでログイン済みであること

## 1. EAS CLI のインストール（初回のみ）

```bash
npm install -g eas-cli
```

## 2. バージョンコードの更新

リリース前に必ず以下の2ファイルでバージョンコードを更新してください。

### app.json

```json
{
  "expo": {
    "android": {
      "versionCode": 42  // この数値を1ずつ増やす
    }
  }
}
```

### android/app/build.gradle

```gradle
defaultConfig {
    versionCode 42  // app.json と同じ値にする
    versionName "1.0.0"
}
```

**重要:** 両方のファイルで同じバージョンコードを使用してください。

## 3. EAS ローカルビルドの実行

```bash
# プロジェクトのルートディレクトリで実行
eas build --platform android --profile production --local
```

### オプション説明

- `--platform android`: Android用にビルド
- `--profile production`: production プロファイル（AAB形式）を使用
- `--local`: ローカル環境でビルド（クラウドを使わない）

## 4. ビルド完了後

ビルドが成功すると、以下のようなメッセージが表示されます：

```
Build successful
You can find the build artifacts in /Users/user/ShogiApp/build-XXXXXXXXXX.aab
```

生成された `.aab` ファイルをGoogle Play Consoleにアップロードします。

## 5. Google Play Console へのアップロード

1. [Google Play Console](https://play.google.com/console) にアクセス
2. アプリを選択
3. 「リリース」→「内部テスト」（または「製品版」）を選択
4. 「新しいリリースを作成」をクリック
5. 生成された `.aab` ファイルをアップロード
6. リリースノートを入力
7. 「審査に送信」をクリック

## トラブルシューティング

### ビルドが失敗する場合

1. **キャッシュをクリア**
   ```bash
   cd android && ./gradlew clean
   ```

2. **node_modules を再インストール**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **バージョンコードの整合性を確認**
   - `app.json` と `android/app/build.gradle` が一致しているか

### バージョンコードエラー

「バージョンコード XX はすでに使用されています」というエラーが出た場合：

1. 上記の2ファイルのバージョンコードを確認
2. Play Console で使用されている最新のバージョンコードより大きい値に設定
3. 再ビルド

## 参考: プロファイル設定（eas.json）

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

- `app-bundle`: AAB形式（Google Playへのアップロード用）
- `apk`: APK形式（直接インストール用、テスト向け）

## ビルド時間の目安

- 初回ビルド: 3〜5分
- 2回目以降: 2〜3分（キャッシュ利用）

## 注意事項

1. **署名鍵の管理**: EASが自動的に管理しています
2. **環境変数**: 必要に応じて `eas.json` に設定
3. **ローカルビルド vs クラウドビルド**: 
   - ローカル: より速い、ローカル環境に依存
   - クラウド (`--local`なし): より安定、時間がかかる
