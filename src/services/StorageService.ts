import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isToday, parseISO } from 'date-fns';

const KEYS = {
    PLAY_COUNT: '@shogi_play_count',
    LAST_PLAY_DATE: '@shogi_last_play_date',
    IS_PREMIUM: '@shogi_is_premium',
    PURCHASE_DATE: '@shogi_purchase_date',
};

const MAX_FREE_PLAYS = 3;

export class StorageService {
    /**
     * 今日のプレイ回数を取得
     */
    static async getPlayCount(): Promise<number> {
        try {
            await this.resetPlayCountIfNeeded();
            const count = await AsyncStorage.getItem(KEYS.PLAY_COUNT);
            return count ? parseInt(count, 10) : 0;
        } catch (error) {
            console.error('Failed to get play count:', error);
            return 0;
        }
    }

    /**
     * プレイ回数を増やす
     */
    static async incrementPlayCount(): Promise<void> {
        try {
            const currentCount = await this.getPlayCount();
            await AsyncStorage.setItem(KEYS.PLAY_COUNT, (currentCount + 1).toString());
            await AsyncStorage.setItem(KEYS.LAST_PLAY_DATE, format(new Date(), 'yyyy-MM-dd'));
        } catch (error) {
            console.error('Failed to increment play count:', error);
        }
    }

    /**
     * 日付が変わっていたらプレイ回数をリセット
     */
    static async resetPlayCountIfNeeded(): Promise<void> {
        try {
            const lastPlayDate = await AsyncStorage.getItem(KEYS.LAST_PLAY_DATE);

            if (!lastPlayDate) {
                // 初回起動
                await AsyncStorage.setItem(KEYS.PLAY_COUNT, '0');
                await AsyncStorage.setItem(KEYS.LAST_PLAY_DATE, format(new Date(), 'yyyy-MM-dd'));
                return;
            }

            const lastDate = parseISO(lastPlayDate);
            if (!isToday(lastDate)) {
                // 日付が変わったのでリセット
                await AsyncStorage.setItem(KEYS.PLAY_COUNT, '0');
                await AsyncStorage.setItem(KEYS.LAST_PLAY_DATE, format(new Date(), 'yyyy-MM-dd'));
            }
        } catch (error) {
            console.error('Failed to reset play count:', error);
        }
    }

    /**
     * プレミアム版かどうかをチェック
     */
    static async isPremium(): Promise<boolean> {
        try {
            const isPremium = await AsyncStorage.getItem(KEYS.IS_PREMIUM);
            return isPremium === 'true';
        } catch (error) {
            console.error('Failed to check premium status:', error);
            return false;
        }
    }

    /**
     * プレミアム状態を保存
     */
    static async setPremium(value: boolean): Promise<void> {
        try {
            await AsyncStorage.setItem(KEYS.IS_PREMIUM, value.toString());
            if (value) {
                await AsyncStorage.setItem(KEYS.PURCHASE_DATE, new Date().toISOString());
            }
        } catch (error) {
            console.error('Failed to set premium status:', error);
        }
    }

    /**
     * プレイ可能かどうかをチェック
     */
    static async canPlay(): Promise<boolean> {
        const isPremium = await this.isPremium();
        if (isPremium) {
            return true;
        }

        const playCount = await this.getPlayCount();
        return playCount < MAX_FREE_PLAYS;
    }

    /**
     * 残りプレイ回数を取得
     */
    static async getRemainingPlays(): Promise<number> {
        const isPremium = await this.isPremium();
        if (isPremium) {
            return -1; // 無制限
        }

        const playCount = await this.getPlayCount();
        return Math.max(0, MAX_FREE_PLAYS - playCount);
    }

    /**
     * 購入日を取得
     */
    static async getPurchaseDate(): Promise<Date | null> {
        try {
            const dateStr = await AsyncStorage.getItem(KEYS.PURCHASE_DATE);
            return dateStr ? new Date(dateStr) : null;
        } catch (error) {
            console.error('Failed to get purchase date:', error);
            return null;
        }
    }

    /**
     * すべてのデータをクリア（デバッグ用）
     */
    static async clearAll(): Promise<void> {
        try {
            await AsyncStorage.multiRemove([
                KEYS.PLAY_COUNT,
                KEYS.LAST_PLAY_DATE,
                KEYS.IS_PREMIUM,
                KEYS.PURCHASE_DATE,
            ]);
        } catch (error) {
            console.error('Failed to clear storage:', error);
        }
    }

    private static isDevInitialized = false;

    /**
     * 開発環境用の初期化（起動時にデータをリセット）
     */
    static async initForDev(): Promise<void> {
        if (!__DEV__ || this.isDevInitialized) {
            return;
        }

        console.log('Initializing for dev: Clearing all data');
        await this.clearAll();
        this.isDevInitialized = true;
    }
}
