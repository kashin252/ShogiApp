import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import { colors } from '../styles/colors';
import i18n from '../i18n/translations';

interface InfoModalProps {
    visible: boolean;
    onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ visible, onClose }) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{i18n.t('modals.info.title')}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{i18n.t('modals.info.rule.title')}</Text>
                            <Text style={styles.text}>
                                {i18n.t('modals.info.rule.text')}
                            </Text>
                            <View style={styles.bulletList}>
                                <Text style={styles.bulletItem}>{i18n.t('modals.info.rule.bullet1')}</Text>
                                <Text style={styles.bulletItem}>{i18n.t('modals.info.rule.bullet2')}</Text>
                                <Text style={styles.bulletItem}>{i18n.t('modals.info.rule.bullet3')}</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{i18n.t('modals.info.history.title')}</Text>


                            <View style={styles.historyItem}>
                                <Text style={styles.version}>v1.0.0</Text>
                                <Text style={styles.date}>2026-01-25</Text>
                                <Text style={styles.historyText}>
                                    {i18n.t('modals.info.history.v1_0_0')}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>
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
        width: '90%',
        height: '80%',
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#f9f9f9',
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
        color: '#666',
        lineHeight: 24,
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        paddingLeft: 8,
    },
    text: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
        marginBottom: 8,
    },
    bulletList: {
        paddingLeft: 8,
    },
    bulletItem: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
        marginBottom: 4,
    },
    historyItem: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    version: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    date: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    historyText: {
        fontSize: 15,
        color: '#444',
        lineHeight: 22,
    },
});
