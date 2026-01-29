import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    SafeAreaView,
    Alert,
} from 'react-native';
import { colors } from '../styles/colors';
import { PurchaseService } from '../services/PurchaseService';
import { StorageService } from '../services/StorageService';
import i18n from '../i18n/translations';

interface PremiumScreenProps {
    onClose: () => void;
}

export const PremiumScreen: React.FC<PremiumScreenProps> = ({ onClose }) => {
    const [isPremium, setIsPremium] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [price, setPrice] = useState('¥800');

    useEffect(() => {
        checkPremiumStatus();
        loadProducts();
    }, []);

    const checkPremiumStatus = async () => {
        const premium = await StorageService.isPremium();
        setIsPremium(premium);
    };

    const loadProducts = async () => {
        try {
            const products = await PurchaseService.getProducts();
            if (products && products.length > 0) {
                // ストアから取得した価格情報を反映
                if (products[0].localizedPrice) {
                    setPrice(products[0].localizedPrice);
                }
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        }
    };

    const handlePurchase = async () => {
        setIsLoading(true);
        try {
            const success = await PurchaseService.purchasePremium();
            if (success) {
                setIsPremium(true);
                Alert.alert(
                    i18n.t('modals.premium.alerts.purchaseSuccess.title'),
                    i18n.t('modals.premium.alerts.purchaseSuccess.message'),
                    [{ text: 'OK', onPress: onClose }]
                );
            } else {
                // 購入フローが失敗（キャンセル以外）
                Alert.alert(
                    i18n.t('modals.premium.alerts.purchaseError.title'),
                    i18n.t('modals.premium.alerts.purchaseError.message')
                );
            }
        } catch (error) {
            Alert.alert(
                i18n.t('modals.premium.alerts.purchaseError.title'),
                i18n.t('modals.premium.alerts.purchaseError.message')
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async () => {
        setIsLoading(true);
        try {
            await PurchaseService.restorePurchases();
            const premium = await StorageService.isPremium();
            if (premium) {
                setIsPremium(true);
                Alert.alert(
                    i18n.t('modals.premium.alerts.restoreSuccess.title'),
                    i18n.t('modals.premium.alerts.restoreSuccess.message'),
                    [{ text: 'OK', onPress: onClose }]
                );
            } else {
                Alert.alert(
                    i18n.t('modals.premium.alerts.restoreNotFound.title'),
                    i18n.t('modals.premium.alerts.restoreNotFound.message')
                );
            }
        } catch (error) {
            Alert.alert(
                i18n.t('modals.premium.alerts.restoreError.title'),
                i18n.t('modals.premium.alerts.restoreError.message')
            );
        } finally {
            setIsLoading(false);
        }
    };

    if (isPremium) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>{i18n.t('modals.premium.subscribedTitle')}</Text>
                            <Text style={styles.versionText}>Build: 40</Text>
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.premiumBadge}>👑</Text>
                        <Text style={styles.thankYouText}>
                            {i18n.t('modals.premium.thankYou')}
                        </Text>

                        <View style={styles.features}>
                            <View style={styles.feature}>
                                <Text style={styles.featureIcon}>✓</Text>
                                <Text style={styles.featureText}>{i18n.t('modals.premium.features.unlimited')}</Text>
                            </View>
                            <View style={styles.feature}>
                                <Text style={styles.featureIcon}>✓</Text>
                                <Text style={styles.featureText}>{i18n.t('modals.premium.features.noAds')}</Text>
                            </View>
                            <View style={styles.feature}>
                                <Text style={styles.featureIcon}>✓</Text>
                                <Text style={styles.featureText}>{i18n.t('modals.premium.features.allFeatures')}</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                        <Text style={styles.doneButtonText}>{i18n.t('modals.premium.done')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>{i18n.t('modals.premium.title')}</Text>
                        <Text style={styles.versionText}>Build: 40</Text>
                    </View>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <Text style={styles.subtitle}>{i18n.t('modals.premium.subtitle')}</Text>

                    <View style={styles.features}>
                        <View style={styles.feature}>
                            <Text style={styles.featureIcon}>✓</Text>
                            <Text style={styles.featureText}>{i18n.t('modals.premium.features.unlimited')}</Text>
                        </View>
                        <View style={styles.feature}>
                            <Text style={styles.featureIcon}>✓</Text>
                            <Text style={styles.featureText}>{i18n.t('modals.premium.features.noAds')}</Text>
                        </View>
                        <View style={styles.feature}>
                            <Text style={styles.featureIcon}>✓</Text>
                            <Text style={styles.featureText}>{i18n.t('modals.premium.features.oneTime')}</Text>
                        </View>
                        <View style={styles.feature}>
                            <Text style={styles.featureIcon}>✓</Text>
                            <Text style={styles.featureText}>{i18n.t('modals.premium.features.allFeatures')}</Text>
                        </View>
                    </View>

                    <View style={styles.priceBox}>
                        <Text style={styles.priceLabel}>{i18n.t('modals.premium.price.label')}</Text>
                        <Text style={styles.priceText}>{price}</Text>
                        <Text style={styles.priceNote}>{i18n.t('modals.premium.price.note')}</Text>
                    </View>

                    {isLoading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                    ) : (
                        <>
                            <TouchableOpacity style={styles.purchaseButton} onPress={handlePurchase}>
                                <Text style={styles.purchaseButtonText}>{i18n.t('modals.premium.purchase')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
                                <Text style={styles.restoreButtonText}>{i18n.t('modals.premium.restore')}</Text>
                            </TouchableOpacity>
                        </>
                    )}


                    <Text style={styles.note}>
                        {i18n.t('modals.premium.note')}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    closeButton: {
        padding: 8,
    },
    closeButtonText: {
        fontSize: 24,
        color: '#999',
    },
    versionText: {
        fontSize: 10,
        color: '#999',
    },
    content: {
        padding: 24,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 24,
    },
    features: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureIcon: {
        fontSize: 20,
        color: colors.primary,
        marginRight: 12,
        fontWeight: 'bold',
    },
    featureText: {
        fontSize: 16,
        color: colors.text,
    },
    priceBox: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
    },
    priceLabel: {
        fontSize: 14,
        color: '#fff',
        marginBottom: 8,
    },
    priceText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    priceNote: {
        fontSize: 12,
        color: '#fff',
    },
    loader: {
        marginVertical: 24,
    },
    purchaseButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    purchaseButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    restoreButton: {
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    restoreButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    note: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        lineHeight: 18,
    },
    premiumBadge: {
        fontSize: 48,
        textAlign: 'center',
        marginBottom: 16,
    },
    thankYouText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 28,
    },
    doneButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        margin: 24,
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
