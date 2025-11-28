import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';

interface PromoteModalProps {
    visible: boolean;
    onPromote: () => void;
    onCancel: () => void;
}

export const PromoteModal: React.FC<PromoteModalProps> = ({
    visible,
    onPromote,
    onCancel,
}) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>成りますか？</Text>
                    <Text style={styles.modalMessage}>
                        敵陣に入りました。駒を成ることができます。
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={[styles.button, styles.promoteButton]} onPress={onPromote}>
                            <Text style={styles.buttonText}>成る</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
                            <Text style={[styles.buttonText, styles.cancelButtonText]}>成らない</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '80%',
        maxWidth: 320,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        color: colors.text,
    },
    modalMessage: {
        fontSize: 16,
        color: '#666',
        marginBottom: 24,
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    promoteButton: {
        backgroundColor: colors.primary,
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    cancelButtonText: {
        color: '#333',
    },
});
