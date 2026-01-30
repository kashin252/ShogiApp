# React Native IAP 実装手順書 (react-native-iap v14+)

このドキュメントでは、React Nativeアプリ（特にExpoを使用した場合）における、`react-native-iap` ライブラリを使用したアプリ内課金（In-App Purchase）の実装手順についてまとめます。

## 1. 前提条件

- **React Native**: 0.70以上推奨
- **Expo**: SDK 50以上推奨 (Config Pluginが利用可能な状態)
- **依存ライブラリ**: `react-native-iap` (v14.7.7以上)

## 2. インストール・セットアップ

### パッケージのインストール

```bash
npm install react-native-iap
# または
yarn add react-native-iap
```

### Expoの設定 (`app.json` / `app.config.js`)

Androidで課金を利用する場合、権限の設定が必要です。Expoの正規プラグインを使用することで、ビルド時に自動的に設定が行われます。

```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.yourapp",
      "permissions": [
        "com.android.vending.BILLING"
      ]
    },
    "plugins": [
      "react-native-iap"
    ]
  }
}
```

> **注意**: `com.android.vending.BILLING` 権限は必須です。

## 3. 実装のベストプラクティス

課金処理は複雑になりがちなため、専用のサービスクラス（シングルトン）を作成してロジックをカプセル化することを推奨します。

### サービスクラスの構成例 (`PurchaseService.ts`)

以下は、`react-native-iap` v14系に対応した基本的な実装例です。

```typescript
import { Platform, Alert } from 'react-native';
import * as RNIap from 'react-native-iap';

// 商品ID定義 (Android/iOSで共通のIDを使うと管理が楽です)
const PRODUCT_IDS = {
  PREMIUM: 'your_premium_product_id', 
};

export class PurchaseService {
  private static isInitialized = false;

  /**
   * 初期化処理
   * アプリ起動時や課金画面表示時に呼び出します。
   */
  static async initIAP(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (Platform.OS === 'web') return; // Webは非対応

      await RNIap.initConnection();
      
      if (Platform.OS === 'android') {
        // Androidの場合、保留中の購入をフラッシュすることが推奨されています
        await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.warn('IAP Initialization check:', error);
    }
  }

  /**
   * 商品情報の取得
   * v14から getProducts ではなく fetchProducts が推奨されています。
   */
  static async getProducts(): Promise<RNIap.Product[]> {
    await this.initIAP();
    try {
        const skus = [PRODUCT_IDS.PREMIUM];
        const products = await RNIap.fetchProducts({ skus });
        return products;
    } catch (error) {
        console.error('Failed to fetch products:', error);
        return [];
    }
  }

  /**
   * 購入処理
   */
  static async purchase(): Promise<boolean> {
    await this.initIAP();
    try {
      // v15/v14対応の新しいリクエスト形式
      const purchase = await RNIap.requestPurchase({
        sku: PRODUCT_IDS.PREMIUM,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
        request: {
            google: {
                skus: [PRODUCT_IDS.PREMIUM], // Androidは配列
            },
            apple: {
                sku: PRODUCT_IDS.PREMIUM,    // iOSは文字列
            }
        },
        type: 'in-app', // または 'subs' (サブスクリプションの場合)
      });

      if (purchase) {
        // 購入成功時のレシート検証などをここで行う推奨
        // ... (サーバーサイドでの検証など)

        // 購入完了処理 (重要: これをしないと返金される可能性があります)
        const purchaseItem = Array.isArray(purchase) ? purchase[0] : purchase;
        await RNIap.finishTransaction({
            purchase: purchaseItem,
            isConsumable: false, // 買い切りの場合はfalse
        });
        
        return true; 
      }
      return false;
    } catch (error) {
      if (error.code === 'E_USER_CANCELLED') {
        // ユーザーによるキャンセル
      } else {
        console.error('Purchase failed:', error);
      }
      return false;
    }
  }

  /**
   * 購入の復元 (Restore)
   * UIに「購入を復元」ボタンを設置し、そこから呼び出します。
   */
  static async restorePurchases(): Promise<boolean> {
    await this.initIAP();
    try {
      const purchases = await RNIap.getAvailablePurchases();
      const hasPremium = purchases.some(p => p.productId === PRODUCT_IDS.PREMIUM);
      
      if (hasPremium) {
        // 権限付与などの処理
        return true;
      }
    } catch (error) {
      console.error('Restore failed:', error);
    }
    return false;
  }
}
```

## 4. ストア設定・テストの流れ

### Google Play Console (Android)
1. **アプリ作成**: Consoleでアプリを作成。
2. **権限設定**: `AndroidManifest.xml` (Expoなら `app.json`) に `BILLING` 権限を含めたビルドをアップロード（内部テスト等のトラックへ）。
3. **商品登録**:
   - メニューの「収益化」>「アプリ内商品」で商品を作成。
   - `Product ID` (商品ID) がコード内のIDと一致していることを確認。
   - ステータスを「有効」にする。
4. **テスター登録**:
   - 「ライセンステスト」にテスターのGoogleアカウントを追加。
   - テストトラック（内部テスト等）にもテスターを追加し、招待URLから参加してもらう。
5. **テスト実施**:
   - 実機でテスト版アプリをインストールして購入フローを確認。
   - テストアカウントなら課金は発生しません（テストカードが使われます）。

### App Store Connect (iOS)
1. **契約**: 「有料アプリケーション契約」が有効になっていることを確認。
2. **商品登録**:
   - 「アプリ内課金」から商品を作成。
   - IDがコードと一致することを確認。
   - **審査用スクリーンショット**等が必須になる場合があるため注意。
3. **Sandboxテスター**:
   - 「ユーザーとアクセス」>「Sandboxテスター」でテスト用アカウントを作成。
4. **テスト実施**:
   - 実機の設定>App Store>Sandboxアカウント でテスト用アカウントにログイン（または購入時にログイン）し、テストを行う。

## 5. よくあるトラブル

- **商品が取得できない (Empty products)**:
  - 商品IDが間違っている。
  - アプリがストアに公開（またはテストトラックに公開）されていない。
  - 商品ステータスが「無効」になっている。
  - テスターアカウントでログインしていない。
  - **重要**: Google Playでは、一度ビルドをアップロードしないと商品情報を取得できない場合があります。

- **購入フローが始まらない**:
  - `initConnection` が完了していない。
  - 既に購入済み（非消費型アイテムの場合）。「復元」を試すか、テスト用に消費処理を行う必要があります。
