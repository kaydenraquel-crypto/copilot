import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { troubleshoot } from '../services/api';
import { TroubleshootingData } from '../types';
import ModelSelector from '../components/ModelSelector';

interface TroubleshootScreenProps {
    onBack: () => void;
}

export default function TroubleshootScreen({ onBack }: TroubleshootScreenProps) {
    const [manufacturer, setManufacturer] = useState('');
    const [model, setModel] = useState('');
    const [errorCode, setErrorCode] = useState('');
    const [symptom, setSymptom] = useState('');
    const [selectedModelId, setSelectedModelId] = useState('auto');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<TroubleshootingData | null>(null);
    const [cacheHit, setCacheHit] = useState(false);
    const [responseTime, setResponseTime] = useState(0);
    const [usedModelId, setUsedModelId] = useState<string | null>(null);
    const [autoSelected, setAutoSelected] = useState(false);

    const handleTroubleshoot = async () => {
        if (!manufacturer.trim() || !model.trim()) {
            Alert.alert('Error', 'Please enter manufacturer and model');
            return;
        }

        if (!errorCode.trim() && !symptom.trim()) {
            Alert.alert('Error', 'Please enter an error code or symptom');
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const response = await troubleshoot(
                manufacturer,
                model,
                errorCode || undefined,
                symptom || undefined,
                selectedModelId
            );
            setResult(response.data.troubleshooting);
            setCacheHit(response.data.cache_hit);
            setResponseTime(response.data.response_time_ms);
            setUsedModelId(response.data.model_id || selectedModelId);
            setAutoSelected(response.data.auto_selected || false);
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.response?.data?.detail || 'Failed to get troubleshooting help'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return '#ef4444';
            case 'high': return '#f97316';
            case 'medium': return '#eab308';
            case 'low': return '#22c55e';
            default: return '#64748b';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>AI Troubleshoot</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Input Form */}
                <View style={styles.form}>
                    {/* Model Selector */}
                    <ModelSelector
                        selectedModelId={selectedModelId}
                        onSelectModel={setSelectedModelId}
                    />

                    <Text style={styles.sectionTitle}>Equipment Info</Text>

                    <View style={styles.row}>
                        <View style={[styles.inputContainer, { flex: 1 }]}>
                            <Text style={styles.label}>Manufacturer</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Traulsen"
                                placeholderTextColor="#64748b"
                                value={manufacturer}
                                onChangeText={setManufacturer}
                                autoCapitalize="words"
                            />
                        </View>
                        <View style={[styles.inputContainer, { flex: 1 }]}>
                            <Text style={styles.label}>Model</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., G20010"
                                placeholderTextColor="#64748b"
                                value={model}
                                onChangeText={setModel}
                                autoCapitalize="characters"
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Error Code (optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., F1, E4, etc."
                            placeholderTextColor="#64748b"
                            value={errorCode}
                            onChangeText={setErrorCode}
                            autoCapitalize="characters"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Symptom / Problem Description</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            placeholder="Describe what's happening..."
                            placeholderTextColor="#64748b"
                            value={symptom}
                            onChangeText={setSymptom}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                        onPress={handleTroubleshoot}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <ActivityIndicator color="#fff" />
                                <Text style={styles.submitButtonText}>Analyzing...</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="flash" size={20} color="#fff" />
                                <Text style={styles.submitButtonText}>Get Diagnosis</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Results */}
                {result && (
                    <View style={styles.results}>
                        {/* Meta Info */}
                        <View style={styles.metaRow}>
                            <View style={[styles.badge, { backgroundColor: cacheHit ? '#22c55e' : '#3b82f6' }]}>
                                <Text style={styles.badgeText}>
                                    {cacheHit ? '⚡ Cached' : '🧠 AI Generated'}
                                </Text>
                            </View>
                            {usedModelId && (
                                <View style={[styles.badge, { backgroundColor: autoSelected ? '#8b5cf6' : '#6366f1' }]}>
                                    <Text style={styles.badgeText}>
                                        {autoSelected ? '🤖 ' : usedModelId.includes('claude') ? '🟠 ' : usedModelId.includes('gpt') ? '🟢 ' : '🔵 '}
                                        {usedModelId.replace(/-/g, ' ').split(' ').slice(0, 2).join(' ')}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.responseTime}>{(responseTime / 1000).toFixed(1)}s</Text>
                        </View>

                        {/* Error Definition */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="warning" size={20} color={getSeverityColor(result.severity)} />
                                <Text style={styles.cardTitle}>Error Definition</Text>
                                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(result.severity) }]}>
                                    <Text style={styles.severityText}>{result.severity?.toUpperCase()}</Text>
                                </View>
                            </View>
                            <Text style={styles.cardContent}>{result.error_definition}</Text>
                        </View>

                        {/* Troubleshooting Steps */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="list" size={20} color="#3b82f6" />
                                <Text style={styles.cardTitle}>Troubleshooting Steps</Text>
                            </View>
                            {result.troubleshooting_steps?.map((step, index) => (
                                <View key={index} style={styles.step}>
                                    <View style={styles.stepNumber}>
                                        <Text style={styles.stepNumberText}>{step.step}</Text>
                                    </View>
                                    <View style={styles.stepContent}>
                                        <Text style={styles.stepTitle}>{step.title}</Text>
                                        <Text style={styles.stepInstruction}>{step.instruction}</Text>
                                        {step.safety_warning && (
                                            <View style={styles.warning}>
                                                <Ionicons name="alert-circle" size={16} color="#f59e0b" />
                                                <Text style={styles.warningText}>{step.safety_warning}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Parts to Check */}
                        {result.parts_to_check?.length > 0 && (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="construct" size={20} color="#10b981" />
                                    <Text style={styles.cardTitle}>Parts to Check</Text>
                                </View>
                                {result.parts_to_check?.map((part, index) => (
                                    <View key={index} style={styles.part}>
                                        <Text style={styles.partName}>{part.name}</Text>
                                        {part.part_number && (
                                            <Text style={styles.partNumber}>P/N: {part.part_number}</Text>
                                        )}
                                        <Text style={styles.partDescription}>{part.description}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Common Causes */}
                        {result.common_causes?.length > 0 && (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="help-circle" size={20} color="#8b5cf6" />
                                    <Text style={styles.cardTitle}>Common Causes</Text>
                                </View>
                                {result.common_causes?.map((cause, index) => (
                                    <View key={index} style={styles.cause}>
                                        <Text style={styles.causeBullet}>•</Text>
                                        <Text style={styles.causeText}>{cause}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Repair Info */}
                        <View style={styles.infoRow}>
                            {result.estimated_repair_time_minutes && (
                                <View style={styles.infoItem}>
                                    <Ionicons name="time-outline" size={20} color="#64748b" />
                                    <Text style={styles.infoText}>
                                        ~{result.estimated_repair_time_minutes} min
                                    </Text>
                                </View>
                            )}
                            <View style={styles.infoItem}>
                                <Ionicons name="speedometer-outline" size={20} color="#64748b" />
                                <Text style={styles.infoText}>{result.difficulty}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    form: {
        gap: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    inputContainer: {
        gap: 6,
    },
    label: {
        fontSize: 14,
        color: '#94a3b8',
    },
    input: {
        backgroundColor: '#1e293b',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    multilineInput: {
        minHeight: 80,
        paddingTop: 12,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        paddingVertical: 16,
        gap: 8,
        marginTop: 8,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    results: {
        marginTop: 24,
        gap: 16,
        paddingBottom: 40,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    responseTime: {
        color: '#64748b',
        fontSize: 14,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    cardTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    cardContent: {
        fontSize: 15,
        color: '#e2e8f0',
        lineHeight: 22,
    },
    severityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    severityText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    step: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepContent: {
        flex: 1,
        gap: 4,
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    stepInstruction: {
        fontSize: 14,
        color: '#cbd5e1',
        lineHeight: 20,
    },
    warning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        padding: 10,
        borderRadius: 8,
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#fbbf24',
    },
    part: {
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        paddingVertical: 12,
    },
    partName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    partNumber: {
        fontSize: 13,
        color: '#3b82f6',
        marginTop: 2,
    },
    partDescription: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 4,
    },
    cause: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    causeBullet: {
        color: '#8b5cf6',
        fontSize: 16,
    },
    causeText: {
        flex: 1,
        fontSize: 14,
        color: '#e2e8f0',
    },
    infoRow: {
        flexDirection: 'row',
        gap: 24,
        justifyContent: 'center',
        paddingVertical: 8,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoText: {
        color: '#94a3b8',
        fontSize: 14,
        textTransform: 'capitalize',
    },
});
