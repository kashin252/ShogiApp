import { Platform, Alert } from 'react-native';
import { StorageService } from './StorageService';

// Web環境ではIAPをインポートしない
let InAppPurchases: any = null;

if (Platform.OS !== 'web') {
    try {
        InAppPurchases = require('react-native-iap');
    } catch (error) {
        console.warn('react-native-iap not available:', error);
    }
}

// 商品ID（実際の商品IDに置き換える必要があります）
const PRODUCT_IDS = {
    PREMIUM: '1_premium_upgrade',
};

export class PurchaseService {
    private static isInitialized = false;

    /**
     * IAP初期化
     */
    static async initIAP(): Promise<void> {
        if (Platform.OS === 'web' || !InAppPurchases) {
            console.log('IAP not available on web platform');
            return;
        }

        if (this.isInitialized) {
            return;
        }

        try {
            console.log('Attempting to initialize IAP...');
            const result = await InAppPurchases.initConnection();
            console.log('initConnection result:', result);

            if (Platform.OS === 'android') {
                try {
                    await InAppPurchases.flushFailedPurchasesCachedAsPendingAndroid();
                    console.log('Flushed failed purchases on Android');
                } catch (e) {
                    console.log('Flush failed (normal on first run):', e);
                }
            }

            this.isInitialized = true;
            console.log('IAP initialized successfully');

            // 購入状態を復元
            await this.restorePurchases();
        } catch (error) {
            console.error('Failed to initialize IAP:', error);
            throw error;
        }
    }

    /**
     * 商品情報を取得
     */
    static async getProducts(): Promise<any[]> {
        if (Platform.OS === 'web' || !InAppPurchases) {
            // Webまたはライブラリなしの場合はモックデータを返す（テスト用）
            return [{
                productId: PRODUCT_IDS.PREMIUM,
                localizedPrice: '￥800',
                title: 'Premium Upgrade',
                description: 'Unlock all premium features',
            }];
        }

        try {
            await this.initIAP();
            console.log('Fetching products for SKUs:', [PRODUCT_IDS.PREMIUM]);
            // v14ではgetProductsではなくfetchProductsを使用
            const products = await InAppPurchases.fetchProducts({
                skus: [PRODUCT_IDS.PREMIUM],
            });
            console.log('Products fetched from store:', products);
            if (!products || products.length === 0) {
                console.warn('No products found for the given SKUs. Check if the Product IDs match Google Play Console.');
            }
            return products || [];
        } catch (error) {
            console.error('Failed to get products:', error);
            return [];
        }
    }

    /**
     * プレミアム版を購入
     */
    static async purchasePremium(): Promise<boolean> {
        if (Platform.OS === 'web' || !InAppPurchases) {
            console.log('Mocking purchase on web platform');
            await new Promise(resolve => setTimeout(resolve, 1000)); // 通信待ちをシミュレート
            await StorageService.setPremium(true);
            return true;
        }

        try {
            await this.initIAP();

            // 購入前に商品情報を再確認（これを行わないとエラーになる場合がある）
            const products = await this.getProducts();
            if (products.length === 0) {
                Alert.alert('Error', '商品情報を取得できませんでした。ストアの設定を確認してください。');
                return false;
            }

            console.log('Requesting purchase for SKU:', PRODUCT_IDS.PREMIUM);

            // v15/v14対応: requestPurchaseの引数仕様変更に対応
            const purchase = await InAppPurchases.requestPurchase({
                sku: PRODUCT_IDS.PREMIUM, // 古いバージョン向けの後方互換性（念のため）
                andDangerouslyFinishTransactionAutomaticallyIOS: false,
                request: {
                    google: {
                        skus: [PRODUCT_IDS.PREMIUM], // Android: 配列で指定
                    },
                    apple: {
                        sku: PRODUCT_IDS.PREMIUM,    // iOS: 文字列で指定
                    }
                },
                type: 'in-app', // 商品タイプを指定
            });
            console.log('requestPurchase response:', purchase);

            if (purchase) {
                // 購入成功
                const purchaseItem = Array.isArray(purchase) ? purchase[0] : purchase;

                if (!purchaseItem) {
                    // フォールバック: 購入履歴から確認
                    console.log('Purchase item is null, checking purchase history...');
                    const purchases = await InAppPurchases.getAvailablePurchases();
                    const premiumPurchase = purchases.find((p: any) => p.productId === PRODUCT_IDS.PREMIUM);

                    if (premiumPurchase) {
                        console.log('Found purchase in history:', premiumPurchase);
                        await StorageService.setPremium(true);

                        // トランザクション完了
                        await InAppPurchases.finishTransaction({
                            purchase: premiumPurchase,
                            isConsumable: false,
                        });

                        return true;
                    } else {
                        throw new Error('Purchase successful but no item returned');
                    }
                }

                await StorageService.setPremium(true);

                // トランザクション完了処理
                await InAppPurchases.finishTransaction({
                    purchase: purchaseItem,
                    isConsumable: false,
                });

                console.log('Purchase successful:', purchase);
                return true;
            }

            return false;
        } catch (error: any) {
            if (error.code === 'E_USER_CANCELLED') {
                console.log('User cancelled the purchase');
            } else {
                console.error('Purchase failed at requestPurchase:', error);
                // 修正：本番環境に近いビルドでもエラー内容を把握できるように一時的にAlertを表示
                Alert.alert('Purchase Error (Debug)',
                    `Code: ${error.code || 'unknown'}\nMessage: ${error.message || 'no message'}`
                );
            }
            return false;
        }
    }

    /**
     * 購入履歴を復元
     */
    static async restorePurchases(): Promise<void> {
        if (Platform.OS === 'web' || !InAppPurchases) {
            return;
        }

        try {
            await this.initIAP();

            const purchases = await InAppPurchases.getAvailablePurchases();

            // プレミアム商品が購入済みかチェック
            const hasPremium = purchases.some(
                (purchase: any) => purchase.productId === PRODUCT_IDS.PREMIUM
            );

            if (hasPremium) {
                await StorageService.setPremium(true);
                console.log('Premium purchase restored');
            }
        } catch (error) {
            console.error('Failed to restore purchases:', error);
        }
    }

    /**
     * IAP接続を終了
     */
    static async endConnection(): Promise<void> {
        if (Platform.OS === 'web' || !InAppPurchases) {
            return;
        }

        try {
            await InAppPurchases.endConnection();
            this.isInitialized = false;
            console.log('IAP connection ended');
        } catch (error) {
            console.error('Failed to end IAP connection:', error);
        }
    }

    /**
     * デバッグ用：強制的に購入成功状態にする
     */
    static async debugPurchase(): Promise<boolean> {
        if (!__DEV__) return false;

        await StorageService.setPremium(true);
        console.log('Debug purchase successful');
        return true;
    }

    /**
     * デバッグ用：詳細な診断レポートを取得
     */
    static async getProductsDiagnostic(): Promise<string> {
        if (Platform.OS === 'web' || !InAppPurchases) {
            return 'Diagnostic: Not available on web or library missing';
        }

        let report = `Diagnostic (Build 28)\nID: ${PRODUCT_IDS.PREMIUM}\n`;

        try {
            await this.initIAP();
            report += 'IAP Init: Success\n';

            // fetchProducts を使用 (v14の新API)
            report += '\n[In-app products via fetchProducts]\n';
            if (typeof InAppPurchases.fetchProducts === 'function') {
                try {
                    const products = await InAppPurchases.fetchProducts({ skus: [PRODUCT_IDS.PREMIUM] });
                    report += `Count: ${products.length}\n`;
                    if (products.length > 0) {
                        report += `Found! Title: ${products[0].title}\n`;
                        report += `Price: ${products[0].localizedPrice}\n`;
                    }
                } catch (e: any) {
                    report += `Error: ${e.message}\nCode: ${e.code}\n`;
                }
            } else {
                report += 'fetchProducts is not a function!\n';
            }

            if (report.includes('Count: 0') && !report.includes('Found')) {
                report += '\n[Conclusion] SKU not found.\nCheck:\n1. Play Console > In-app products\n2. Product status is "Active"\n3. Tester account is accepted';
            }

            return report;
        } catch (error: any) {
            report += `Failed at Init stage: ${error.message}`;
            return report;
        }
    }
}
