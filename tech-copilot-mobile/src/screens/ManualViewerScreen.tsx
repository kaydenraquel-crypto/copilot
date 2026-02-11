import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    Linking,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getManual, getManualPdfUrl } from '../services/api';

interface ManualViewerScreenProps {
    manualId: string | number;
    onBack: () => void;
    onViewPDF?: (pdfUrl: string, title: string) => void;
}

interface ManualDetail {
    id: string | number;
    manufacturer?: string;
    brand?: string;
    model: string;
    manual_type?: string;
    equipment_type?: string;
    page_count?: number;
    file_size_mb?: number;
    source?: string;
    source_url?: string;
    extracted_sections?: {
        overview?: { text: string };
        specifications?: { text: string; data?: Record<string, any> };
        error_codes?: { codes?: Record<string, string> };
        troubleshooting?: { procedures?: string[] };
    };
    created_at?: string;
}

export default function ManualViewerScreen({ manualId, onBack, onViewPDF }: ManualViewerScreenProps) {
    const [manual, setManual] = useState<ManualDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('overview');

    useEffect(() => {
        loadManual();
    }, [manualId]);

    const loadManual = async () => {
        try {
            const response = await getManual(manualId);
            setManual(response.data);
        } catch (error) {
            console.error('Failed to load manual:', error);
            Alert.alert('Error', 'Failed to load manual details');
        } finally {
            setIsLoading(false);
        }
    };

    const openPDF = () => {
        const pdfUrl = getManualPdfUrl(manualId);
        Linking.openURL(pdfUrl).catch(() => {
            Alert.alert('Error', 'Could not open PDF');
        });
    };

    const sections = [
        { key: 'overview', label: 'Overview', icon: 'information-circle' },
        { key: 'specs', label: 'Specs', icon: 'list' },
        { key: 'errors', label: 'Error Codes', icon: 'warning' },
        { key: 'troubleshoot', label: 'Troubleshoot', icon: 'build' },
    ];

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Loading...</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            </SafeAreaView>
        );
    }

    if (!manual) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Not Found</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.centered}>
                    <Text style={styles.errorText}>Manual not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const renderSectionContent = () => {
        const extracted = manual.extracted_sections || {};

        switch (activeSection) {
            case 'overview':
                    return (
                    <View style={styles.sectionContent}>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>Manufacturer</Text>
                            <Text style={styles.infoValue}>{manual.manufacturer || manual.brand}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>Model</Text>
                            <Text style={styles.infoValue}>{manual.model}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>Manual Type</Text>
                            <Text style={styles.infoValue}>{manual.manual_type || manual.equipment_type}</Text>
                        </View>
                        {manual.page_count && (
                            <View style={styles.infoCard}>
                                <Text style={styles.infoLabel}>Pages</Text>
                                <Text style={styles.infoValue}>{manual.page_count}</Text>
                            </View>
                        )}
                        {manual.file_size_mb && (
                            <View style={styles.infoCard}>
                                <Text style={styles.infoLabel}>File Size</Text>
                                <Text style={styles.infoValue}>{manual.file_size_mb.toFixed(1)} MB</Text>
                            </View>
                        )}
                        {extracted.overview?.text && (
                            <View style={styles.textCard}>
                                <Text style={styles.textTitle}>Summary</Text>
                                <Text style={styles.textContent}>{extracted.overview.text}</Text>
                            </View>
                        )}
                    </View>
                );

            case 'specs':
                const specs = extracted.specifications?.data || {};
                return (
                    <View style={styles.sectionContent}>
                        {Object.keys(specs).length > 0 ? (
                            Object.entries(specs).map(([key, value]) => (
                                <View key={key} style={styles.infoCard}>
                                    <Text style={styles.infoLabel}>{key}</Text>
                                    <Text style={styles.infoValue}>{String(value)}</Text>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="document-text-outline" size={48} color="#334155" />
                                <Text style={styles.emptyText}>No specifications extracted yet</Text>
                                <Text style={styles.emptySubtext}>
                                    Specs will be available after AI processing
                                </Text>
                            </View>
                        )}
                    </View>
                );

            case 'errors':
                const errorCodes = extracted.error_codes?.codes || {};
                return (
                    <View style={styles.sectionContent}>
                        {Object.keys(errorCodes).length > 0 ? (
                            Object.entries(errorCodes).map(([code, description]) => (
                                <View key={code} style={styles.errorCard}>
                                    <View style={styles.errorCode}>
                                        <Text style={styles.errorCodeText}>{code}</Text>
                                    </View>
                                    <Text style={styles.errorDescription}>{String(description)}</Text>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="warning-outline" size={48} color="#334155" />
                                <Text style={styles.emptyText}>No error codes extracted yet</Text>
                                <Text style={styles.emptySubtext}>
                                    Error codes will be extracted by AI processing
                                </Text>
                            </View>
                        )}
                    </View>
                );

            case 'troubleshoot':
                const procedures = extracted.troubleshooting?.procedures || [];
                return (
                    <View style={styles.sectionContent}>
                        {procedures.length > 0 ? (
                            procedures.map((proc, index) => (
                                <View key={index} style={styles.procedureCard}>
                                    <Text style={styles.procedureText}>{proc}</Text>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="build-outline" size={48} color="#334155" />
                                <Text style={styles.emptyText}>No procedures extracted yet</Text>
                                <Text style={styles.emptySubtext}>
                                    Use AI Troubleshoot to get help with this equipment
                                </Text>
                            </View>
                        )}
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{manual.manufacturer || manual.brand}</Text>
                    <Text style={styles.headerSubtitle}>{manual.model}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* View PDF Button */}
            <TouchableOpacity style={styles.sourceButton} onPress={openPDF}>
                <Ionicons name="document-text" size={18} color="#3b82f6" />
                <Text style={styles.sourceText}>View PDF</Text>
            </TouchableOpacity>

            {/* Section Tabs */}
            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {sections.map((section) => (
                        <TouchableOpacity
                            key={section.key}
                            style={[styles.tab, activeSection === section.key && styles.tabActive]}
                            onPress={() => setActiveSection(section.key)}
                        >
                            <Ionicons
                                name={section.icon as any}
                                size={18}
                                color={activeSection === section.key ? '#3b82f6' : '#64748b'}
                            />
                            <Text style={[styles.tabText, activeSection === section.key && styles.tabTextActive]}>
                                {section.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {renderSectionContent()}
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
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#94a3b8',
    },
    sourceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1e293b',
        marginHorizontal: 16,
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
        gap: 8,
    },
    sourceText: {
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: '500',
    },
    tabContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        gap: 6,
        backgroundColor: '#1e293b',
    },
    tabActive: {
        backgroundColor: '#1e3a5f',
    },
    tabText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#3b82f6',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionContent: {
        gap: 12,
        paddingBottom: 40,
    },
    infoCard: {
        backgroundColor: '#1e293b',
        borderRadius: 10,
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        color: '#94a3b8',
        fontSize: 14,
    },
    infoValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    textCard: {
        backgroundColor: '#1e293b',
        borderRadius: 10,
        padding: 16,
        marginTop: 8,
    },
    textTitle: {
        color: '#94a3b8',
        fontSize: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    textContent: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 22,
    },
    errorCard: {
        backgroundColor: '#1e293b',
        borderRadius: 10,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    errorCode: {
        backgroundColor: '#ef4444',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    errorCodeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    errorDescription: {
        flex: 1,
        color: '#e2e8f0',
        fontSize: 14,
    },
    procedureCard: {
        backgroundColor: '#1e293b',
        borderRadius: 10,
        padding: 14,
    },
    procedureText: {
        color: '#e2e8f0',
        fontSize: 14,
        lineHeight: 22,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 16,
        fontWeight: '500',
        marginTop: 16,
    },
    emptySubtext: {
        color: '#64748b',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 16,
    },
});
