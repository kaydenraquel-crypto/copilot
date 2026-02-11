import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface AIModel {
    id: string;
    name: string;
    provider: 'anthropic' | 'openai' | 'google';
    description: string;
    costTier: 'low' | 'medium';
    isNew?: boolean;
}

const AVAILABLE_MODELS: AIModel[] = [
    // Auto mode (smart selection)
    {
        id: 'auto',
        name: '🤖 Auto (Recommended)',
        provider: 'anthropic',  // fallback provider
        description: 'Smart selection: affordable yet accurate',
        costTier: 'low',
        isNew: true
    },
    // Anthropic Claude
    {
        id: 'claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        provider: 'anthropic',
        description: 'Best balance of speed & intelligence',
        costTier: 'medium',
        isNew: true
    },
    {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        provider: 'anthropic',
        description: 'Fastest, most cost-effective',
        costTier: 'low'
    },
    // OpenAI GPT-4o
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        description: 'Most capable OpenAI model',
        costTier: 'medium',
        isNew: true
    },
    {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'Fast and affordable',
        costTier: 'low'
    },
    // Google Gemini
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'google',
        description: 'Advanced reasoning, huge context',
        costTier: 'medium',
        isNew: true
    },
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        description: 'Ultra-fast for high volume',
        costTier: 'low',
        isNew: true
    },
];

interface ModelSelectorProps {
    selectedModelId: string;
    onSelectModel: (modelId: string) => void;
}

export default function ModelSelector({ selectedModelId, onSelectModel }: ModelSelectorProps) {
    const [modalVisible, setModalVisible] = useState(false);

    const selectedModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0];

    const getProviderColor = (provider: string) => {
        switch (provider) {
            case 'anthropic': return '#d97757'; // Claude orange
            case 'openai': return '#10a37f';    // OpenAI green
            case 'google': return '#4285f4';    // Google blue
            default: return '#64748b';
        }
    };

    const getCostBadge = (tier: string) => {
        return tier === 'low' ? '💰 Low Cost' : '⚡ Balanced';
    };

    const renderModelItem = (model: AIModel) => {
        const isSelected = model.id === selectedModelId;

        return (
            <TouchableOpacity
                key={model.id}
                style={[
                    styles.modelItem,
                    isSelected && styles.modelItemSelected
                ]}
                onPress={() => {
                    onSelectModel(model.id);
                    setModalVisible(false);
                }}
            >
                <View style={styles.modelHeader}>
                    <View style={styles.modelNameContainer}>
                        <Text style={[styles.modelName, isSelected && styles.modelNameSelected]}>
                            {model.name}
                        </Text>
                        {model.isNew && (
                            <View style={styles.newBadge}>
                                <Text style={styles.newBadgeText}>NEW</Text>
                            </View>
                        )}
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />}
                </View>
                <Text style={[styles.modelDesc, isSelected && styles.modelDescSelected]}>
                    {model.description}
                </Text>
                <View style={styles.metaRow}>
                    <View style={styles.providerBadge}>
                        <View style={[styles.providerDot, { backgroundColor: getProviderColor(model.provider) }]} />
                        <Text style={styles.providerName}>
                            {model.provider === 'anthropic' ? 'Claude' : model.provider === 'openai' ? 'GPT' : 'Gemini'}
                        </Text>
                    </View>
                    <Text style={styles.costBadge}>{getCostBadge(model.costTier)}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <>
            <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setModalVisible(true)}
            >
                <View style={styles.selectorContent}>
                    <Text style={styles.selectorLabel}>AI Model:</Text>
                    <Text style={styles.selectorValue}>{selectedModel.name}</Text>
                </View>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select AI Model</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modelList}
                            contentContainerStyle={styles.modelListContent}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Text style={styles.sectionTitle}>🤖 Smart Selection</Text>
                            {AVAILABLE_MODELS.filter(m => m.id === 'auto').map(renderModelItem)}

                            <Text style={styles.sectionTitle}>Claude (Anthropic)</Text>
                            {AVAILABLE_MODELS.filter(m => m.provider === 'anthropic' && m.id !== 'auto').map(renderModelItem)}

                            <Text style={styles.sectionTitle}>GPT (OpenAI)</Text>
                            {AVAILABLE_MODELS.filter(m => m.provider === 'openai').map(renderModelItem)}

                            <Text style={styles.sectionTitle}>Gemini (Google)</Text>
                            {AVAILABLE_MODELS.filter(m => m.provider === 'google').map(renderModelItem)}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    selectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1e293b',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 16,
    },
    selectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectorLabel: {
        color: '#94a3b8',
        fontSize: 14,
    },
    selectorValue: {
        color: '#e2e8f0',
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '82%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modelList: {
        flexGrow: 0,
    },
    modelListContent: {
        padding: 16,
        paddingBottom: 40,
    },
    sectionTitle: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 8,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    modelItem: {
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    modelItemSelected: {
        backgroundColor: '#1e3a5f',
        borderColor: '#3b82f6',
    },
    modelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    modelNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modelName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modelNameSelected: {
        color: '#60a5fa',
    },
    newBadge: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    newBadgeText: {
        color: '#000',
        fontSize: 10,
        fontWeight: 'bold',
    },
    modelDesc: {
        color: '#94a3b8',
        fontSize: 13,
        marginBottom: 8,
    },
    modelDescSelected: {
        color: '#cbd5e1',
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    providerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    providerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    providerName: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '500',
    },
    costBadge: {
        color: '#94a3b8',
        fontSize: 11,
    },
});
