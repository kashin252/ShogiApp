# 課金エラー修正計画 (Purchase Error Fix Plan)

## 目的
「code unknown, missing purchase request configuration」というエラーを解消し、Android (およびiOS) での課金処理を正常に動作させること。

## 問題の原因
現在使用している `react-native-iap` (v14.7.7) では、`requestPurchase` メソッドの引数の仕様が大きく変更されています。
これまでの `requestPurchase({ sku: '...' })` という形式は古く、現在は以下のような階層構造を持つオブジェクトを渡す必要があります：

```typescript
// 新しい仕様の例
requestPurchase({
  request: {
    google: { skus: ['sku_id'] }, // Androidは配列
    apple: { sku: 'sku_id' }      // iOSは文字列
  },
  type: 'in-app'
})
```
この設定が不足しているため、Android側で「設定が見つからない」というエラーが発生しています。

## 変更内容

### [Services] 購入サービス
#### [MODIFY] [PurchaseService.ts](file:///Users/user/ShogiApp/src/services/PurchaseService.ts)
- `purchasePremium` メソッド内の `requestPurchase` 呼び出しを修正します。
- `Platform.select` または条件分岐を使用し、プラットフォームに応じた正しいリクエストオブジェクトを作成します。

## 検証計画

### 自動テスト
- 現在、課金処理に関する自動テストはありません。

### 手動検証 (ユーザー様による実施)
1. 修正後のコードでアプリをビルド・実行する。
2. Premium画面を開き、「購入する」ボタンをタップする。
3. エラーが出ずにGoogle Playの購入シート（価格などが表示される画面）が表示されることを確認する。
