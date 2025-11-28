import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { colors } from '../styles/colors';

interface PlayLimitModalProps {
    visible: boolean;
    remainingPlays: number;
    onClose: () => void;
    onUpgrade: () => void;
}

export const PlayLimitModal: React.FC<PlayLimitModalProps> = ({
    visible,
    remainingPlays,
    onClose,
    onUpgrade,
}) => {
    const isLimitReached = remainingPlays === 0;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <Text style={styles.title}>
                        {isLimitReached ? '本日のプレイ回数上限' : 'プレイ回数'}
                    </Text>

                    {isLimitReached ? (
                        <>
                            <Text style={styles.message}>
                                本日の無料プレイ回数（3回）に達しました。{'\n'}
                                プレミアム版にアップグレードすると、無制限でプレイできます。
                            </Text>

                            <View style={styles.features}>
                                <Text style={styles.featureTitle}>プレミアム版の特典:</Text>
                                <Text style={styles.feature}>✓ 無制限プレイ</Text>
                                <Text style={styles.feature}>✓ 広告なし</Text>
                                <Text style={styles.feature}>✓ 買い切り（追加料金なし）</Text>
                            </View>

                            <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
                                <Text style={styles.upgradeButtonText}>プレミアム版にアップグレード</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
                                <Text style={styles.laterButtonText}>また明日</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.message}>
                                本日の残りプレイ回数: {remainingPlays}/3回
                            </Text>

                            <Text style={styles.hint}>
                                プレミアム版にアップグレードすると、{'\n'}
                                無制限でプレイできます。
                            </Text>

                            <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
                                <Text style={styles.upgradeButtonText}>プレミアム版を見る</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
                                <Text style={styles.laterButtonText}>閉じる</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '85%',
        maxWidth: 360,
        alignItems: 'stretch',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: colors.text,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 24,
    },
    hint: {
        fontSize: 14,
        color: '#999',
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 20,
    },
    features: {
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    feature: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    upgradeButton: {
        width: '100%',
        paddingVertical: 12,
        backgroundColor: colors.primary,
        borderRadius: 8,
        marginBottom: 12,
        alignItems: 'center',
    },
    upgradeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    laterButton: {
        width: '100%',
        paddingVertical: 12,
        backgroundColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
    },
    laterButtonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
