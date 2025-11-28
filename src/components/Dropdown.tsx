import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    FlatList,
    TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '../styles/colors';

interface Option {
    label: string;
    value: any;
}

interface DropdownProps {
    label?: string;
    value: any;
    options: Option[];
    onSelect: (value: any) => void;
    placeholder?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
    label,
    value,
    options,
    onSelect,
    placeholder = '選択してください',
}) => {
    const [visible, setVisible] = useState(false);
    const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const selectedOption = options.find((opt) => opt.value === value);

    const handleSelect = (val: any) => {
        onSelect(val);
        setVisible(false);
    };

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}

            <TouchableOpacity
                style={styles.button}
                onPress={() => setVisible(true)}
                onLayout={(event) => setLayout(event.nativeEvent.layout)}
            >
                <Text style={[styles.buttonText, !selectedOption && styles.placeholder]}>
                    {selectedOption ? selectedOption.label : placeholder}
                </Text>
                <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{label || placeholder}</Text>
                            <FlatList
                                data={options}
                                keyExtractor={(item) => String(item.value)}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.optionItem,
                                            item.value === value && styles.optionItemSelected,
                                        ]}
                                        onPress={() => handleSelect(item.value)}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                item.value === value && styles.optionTextSelected,
                                            ]}
                                        >
                                            {item.label}
                                        </Text>
                                        {item.value === value && (
                                            <Text style={styles.checkMark}>✓</Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setVisible(false)}
                            >
                                <Text style={styles.closeButtonText}>閉じる</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    buttonText: {
        fontSize: 16,
        color: colors.text,
    },
    placeholder: {
        color: '#999',
    },
    arrow: {
        fontSize: 12,
        color: '#666',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '80%',
        maxWidth: 320,
        maxHeight: '60%',
        padding: 16,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        color: colors.text,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    optionItemSelected: {
        backgroundColor: '#f9f9f9',
    },
    optionText: {
        fontSize: 16,
        color: '#333',
    },
    optionTextSelected: {
        color: colors.primary,
        fontWeight: 'bold',
    },
    checkMark: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    closeButton: {
        marginTop: 16,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666',
    },
});
