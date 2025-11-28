import { Platform } from 'react-native';

// Web環境では広告SDKをインポートしない
let InterstitialAd: any = null;
let AdEventType: any = null;
let TestIds: any = null;

if (Platform.OS !== 'web') {
    try {
        const ads = require('react-native-google-mobile-ads');
        InterstitialAd = ads.InterstitialAd;
        AdEventType = ads.AdEventType;
        TestIds = ads.TestIds;
    } catch (error) {
        console.warn('react-native-google-mobile-ads not available:', error);
    }
}

// 広告ユニットID（本番環境では実際のIDに置き換える）
const AD_UNIT_ID = __DEV__ && TestIds ? TestIds.INTERSTITIAL : 'ca-app-pub-xxxxx/xxxxx';

export class AdService {
    private static interstitial: any = null;
    private static isAdLoaded = false;
    private static isAdShowing = false;

    /**
     * 広告SDK初期化
     */
    static async initAds(): Promise<void> {
        // Web環境では何もしない
        if (Platform.OS === 'web' || !InterstitialAd) {
            console.log('Ad service not available on web platform');
            return;
        }

        try {
            this.interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
                requestNonPersonalizedAdsOnly: false,
            });

            // 広告イベントリスナーを設定
            this.interstitial.addAdEventListener(AdEventType.LOADED, () => {
                this.isAdLoaded = true;
                console.log('Interstitial ad loaded');
            });

            this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
                this.isAdShowing = false;
                this.isAdLoaded = false;
                // 次の広告を事前読み込み
                this.loadInterstitialAd();
            });

            this.interstitial.addAdEventListener(AdEventType.ERROR, (error: any) => {
                console.error('Interstitial ad error:', error);
                this.isAdLoaded = false;
                this.isAdShowing = false;
            });

            // 初回読み込み
            await this.loadInterstitialAd();
            console.log('Ad service initialized');
        } catch (error) {
            console.error('Failed to initialize ads:', error);
        }
    }

    /**
     * インタースティシャル広告を読み込み
     */
    static async loadInterstitialAd(): Promise<void> {
        if (Platform.OS === 'web' || !InterstitialAd) {
            return;
        }

        try {
            if (!this.interstitial) {
                await this.initAds();
            }

            if (this.interstitial && !this.isAdLoaded && !this.isAdShowing) {
                await this.interstitial.load();
            }
        } catch (error) {
            console.error('Failed to load interstitial ad:', error);
        }
    }

    /**
     * インタースティシャル広告を表示
     */
    static async showInterstitialAd(): Promise<boolean> {
        if (Platform.OS === 'web' || !InterstitialAd) {
            console.log('Ad not available on web platform');
            return false;
        }

        try {
            if (!this.interstitial) {
                console.warn('Interstitial ad not initialized');
                return false;
            }

            if (!this.isAdLoaded) {
                console.warn('Interstitial ad not loaded yet');
                return false;
            }

            if (this.isAdShowing) {
                console.warn('Ad is already showing');
                return false;
            }

            this.isAdShowing = true;
            await this.interstitial.show();
            return true;
        } catch (error) {
            console.error('Failed to show interstitial ad:', error);
            this.isAdShowing = false;
            return false;
        }
    }

    /**
     * 広告が準備できているかチェック
     */
    static isAdReady(): boolean {
        if (Platform.OS === 'web' || !InterstitialAd) {
            return false;
        }
        return this.isAdLoaded && !this.isAdShowing;
    }
}
