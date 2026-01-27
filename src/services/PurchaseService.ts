import { Platform } from 'react-native';
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
    PREMIUM: 'premium_upgrade',
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
            await InAppPurchases.initConnection();
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
            return [];
        }

        try {
            await this.initIAP();
            const products = await InAppPurchases.getProducts({
                skus: [PRODUCT_IDS.PREMIUM],
            });
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
            console.log('Purchase not available on web platform');
            return false;
        }

        try {
            await this.initIAP();

            const purchase = await InAppPurchases.requestPurchase({
                sku: PRODUCT_IDS.PREMIUM,
            });

            if (purchase) {
                // 購入成功
                await StorageService.setPremium(true);

                // 購入を完了（配列の場合は最初の要素を使用）
                const purchaseItem = Array.isArray(purchase) ? purchase[0] : purchase;

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
                console.error('Purchase failed:', error);
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
}
