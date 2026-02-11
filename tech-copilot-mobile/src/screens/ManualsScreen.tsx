import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { getManuals, searchManual, uploadManual } from '../services/api';
import { Manual } from '../types';

interface ManualsScreenProps {
    onBack: () => void;
    onViewManual?: (manualId: number) => void;
}

export default function ManualsScreen({ onBack, onViewManual }: ManualsScreenProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [manuals, setManuals] = useState<Manual[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasSearched, setHasSearched] = useState(false);

    // Web search modal
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [webManufacturer, setWebManufacturer] = useState('');
    const [webModel, setWebModel] = useState('');
    const [isSearchingWeb, setIsSearchingWeb] = useState(false);

    // Upload modal
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState<{ uri: string; name: string } | null>(null);
    const [uploadManufacturer, setUploadManufacturer] = useState('');
    const [uploadModel, setUploadModel] = useState('');
    const [uploadManualType, setUploadManualType] = useState<string>('service');
    const [isUploading, setIsUploading] = useState(false);

    // Auto-load manuals on mount
    useEffect(() => {
        loadManuals();
    }, []);

    const loadManuals = async () => {
        setIsLoading(true);
        try {
            const response = await getManuals();
            setManuals(response.data.manuals);
            setHasSearched(true);
        } catch (error) {
            console.error('Failed to fetch manuals:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async () => {
        setIsLoading(true);
        setHasSearched(true);
        try {
            const response = await getManuals(searchQuery || undefined);
            setManuals(response.data.manuals);
        } catch (error) {
            console.error('Failed to fetch manuals:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleWebSearch = async () => {
        if (!webManufacturer.trim() || !webModel.trim()) {
            Alert.alert('Error', 'Please enter manufacturer and model');
            return;
        }

        setIsSearchingWeb(true);
        try {
            const response = await searchManual(webManufacturer, webModel);
            const data = response.data;

            if (data.already_in_library) {
                Alert.alert('Already Have It!', 'This manual is already in your library.');
                setShowSearchModal(false);
                loadManuals();
            } else if (data.auto_downloaded) {
                Alert.alert(
                    '🎉 Manual Found & Saved!',
                    `${webManufacturer} ${webModel} manual has been downloaded and saved to your library!\n\n${data.page_count || ''} pages`,
                    [{ text: 'View Library', onPress: () => { setShowSearchModal(false); loadManuals(); } }]
                );
            } else if (data.found) {
                Alert.alert(
                    'Manual Found Online',
                    data.download_error
                        ? `Found but couldn't auto-download: ${data.download_error}\n\nSource: ${data.source}`
                        : `Found at: ${data.source}\n\nURL available for manual download.`,
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert(
                    'Not Found',
                    `No public manual found for ${webManufacturer} ${webModel}.\n\nTry uploading it manually if you have a copy.`
                );
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Search failed');
        } finally {
            setIsSearchingWeb(false);
        }
    };

    const handleManualPress = (manual: Manual) => {
        if (onViewManual) {
            onViewManual(manual.id);
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });
            if (result.canceled) return;
            const asset = result.assets[0];
            setUploadFile({ uri: asset.uri, name: asset.name || 'manual.pdf' });
        } catch (e) {
            Alert.alert('Error', 'Could not pick file');
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) {
            Alert.alert('Error', 'Please select a PDF file');
            return;
        }
        if (!uploadManufacturer.trim() || !uploadModel.trim()) {
            Alert.alert('Error', 'Please enter manufacturer and model');
            return;
        }
        setIsUploading(true);
        try {
            const response = await uploadManual(
                { ...uploadFile, type: 'application/pdf' },
                uploadManufacturer.trim(),
                uploadModel.trim(),
                uploadManualType,
                undefined,
                'All'
            );
            const data = response?.data ?? response;
            Alert.alert(
                'Upload Complete',
                data?.message || `Manual uploaded successfully. ${data?.page_count ?? ''} pages.`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setShowUploadModal(false);
                            setUploadFile(null);
                            setUploadManufacturer('');
                            setUploadModel('');
                            setUploadManualType('service');
                            loadManuals();
                        },
                    },
                ]
            );
        } catch (err: any) {
            Alert.alert('Upload Failed', err?.message || 'Could not upload manual');
        } finally {
            setIsUploading(false);
        }
    };

    const getManualTypeIcon = (type: string) => {
        switch (type) {
            case 'service': return 'construct';
            case 'parts': return 'cube';
            case 'installation': return 'hammer';
            case 'wiring': return 'flash';
            default: return 'document';
        }
    };

    const renderManual = ({ item }: { item: Manual }) => (
        <TouchableOpacity style={styles.manualCard} onPress={() => handleManualPress(item)}>
            <View style={styles.manualIcon}>
                <Ionicons name={getManualTypeIcon(item.manual_type) as any} size={24} color="#3b82f6" />
            </View>
            <View style={styles.manualInfo}>
                <Text style={styles.manualTitle}>
                    {item.manufacturer} {item.model}
                </Text>
                <Text style={styles.manualType}>{item.manual_type} Manual</Text>
                <View style={styles.manualMeta}>
                    <Text style={styles.manualMetaText}>
                        {item.page_count || '?'} pages
                    </Text>
                    <Text style={styles.manualMetaText}>•</Text>
                    <Text style={styles.manualMetaText}>
                        {item.file_size_mb?.toFixed(1) || '?'} MB
                    </Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Equipment Manuals</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color="#64748b" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search library..."
                        placeholderTextColor="#64748b"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    <Ionicons name="search" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Find Online Button */}
            <TouchableOpacity
                style={styles.findOnlineButton}
                onPress={() => setShowSearchModal(true)}
            >
                <Ionicons name="globe" size={20} color="#fbbf24" />
                <Text style={styles.findOnlineText}>Find Manual Online (AI Search)</Text>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>

            {/* Upload Manual Button */}
            <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => setShowUploadModal(true)}
            >
                <Ionicons name="cloud-upload" size={20} color="#22c55e" />
                <Text style={styles.uploadButtonText}>Upload Manual</Text>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>

            {/* Content */}
            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Loading manuals...</Text>
                </View>
            ) : manuals.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="library-outline" size={64} color="#334155" />
                    <Text style={styles.emptyTitle}>No Manuals Yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Use "Find Manual Online" to search or "Upload Manual" to add a PDF
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={manuals}
                    renderItem={renderManual}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Web Search Modal */}
            <Modal
                visible={showSearchModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowSearchModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>🔍 Find Manual Online</Text>
                            <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Claude AI will search the web for this manual and automatically save it to your library.
                        </Text>

                        <View style={styles.modalForm}>
                            <View style={styles.modalInput}>
                                <Text style={styles.inputLabel}>Manufacturer</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Traulsen, True, Hoshizaki"
                                    placeholderTextColor="#64748b"
                                    value={webManufacturer}
                                    onChangeText={setWebManufacturer}
                                    autoCapitalize="words"
                                />
                            </View>

                            <View style={styles.modalInput}>
                                <Text style={styles.inputLabel}>Model Number</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., G20010, T-49, KM-500"
                                    placeholderTextColor="#64748b"
                                    value={webModel}
                                    onChangeText={setWebModel}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.modalButton, isSearchingWeb && styles.modalButtonDisabled]}
                            onPress={handleWebSearch}
                            disabled={isSearchingWeb}
                        >
                            {isSearchingWeb ? (
                                <>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={styles.modalButtonText}>Searching...</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="search" size={20} color="#fff" />
                                    <Text style={styles.modalButtonText}>Search & Download</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Upload Manual Modal */}
            <Modal
                visible={showUploadModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowUploadModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>📤 Upload Manual</Text>
                            <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>
                            Select a PDF and enter equipment details. The app will process and add it to your library.
                        </Text>

                        <TouchableOpacity style={styles.pickFileButton} onPress={pickDocument}>
                            <Ionicons name="document-attach" size={24} color="#3b82f6" />
                            <Text style={styles.pickFileText}>
                                {uploadFile ? uploadFile.name : 'Choose PDF file'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.modalForm}>
                            <View style={styles.modalInput}>
                                <Text style={styles.inputLabel}>Manufacturer</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Traulsen, True"
                                    placeholderTextColor="#64748b"
                                    value={uploadManufacturer}
                                    onChangeText={setUploadManufacturer}
                                    autoCapitalize="words"
                                />
                            </View>
                            <View style={styles.modalInput}>
                                <Text style={styles.inputLabel}>Model Number</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., G20010, T-49"
                                    placeholderTextColor="#64748b"
                                    value={uploadModel}
                                    onChangeText={setUploadModel}
                                    autoCapitalize="characters"
                                />
                            </View>
                            <View style={styles.modalInput}>
                                <Text style={styles.inputLabel}>Manual Type</Text>
                                <View style={styles.typeRow}>
                                    {['service', 'parts', 'installation', 'wiring'].map((t) => (
                                        <TouchableOpacity
                                            key={t}
                                            style={[
                                                styles.typeChip,
                                                uploadManualType === t && styles.typeChipActive,
                                            ]}
                                            onPress={() => setUploadManualType(t)}
                                        >
                                            <Text
                                                style={[
                                                    styles.typeChipText,
                                                    uploadManualType === t && styles.typeChipTextActive,
                                                ]}
                                            >
                                                {t}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.modalButton, isUploading && styles.modalButtonDisabled]}
                            onPress={handleUpload}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={styles.modalButtonText}>Uploading...</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload" size={20} color="#fff" />
                                    <Text style={styles.modalButtonText}>Upload & Process</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    searchContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        paddingVertical: 12,
        marginLeft: 8,
    },
    searchButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 10,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    findOnlineButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fbbf24',
        gap: 12,
    },
    findOnlineText: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#22c55e',
        gap: 12,
    },
    uploadButtonText: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    pickFileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderRadius: 10,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
        borderStyle: 'dashed',
        gap: 12,
        marginBottom: 16,
    },
    pickFileText: {
        color: '#94a3b8',
        fontSize: 16,
        flex: 1,
    },
    typeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    typeChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
    },
    typeChipActive: {
        backgroundColor: '#1e3a5f',
        borderColor: '#3b82f6',
    },
    typeChipText: {
        color: '#64748b',
        fontSize: 14,
    },
    typeChipTextActive: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    list: {
        padding: 16,
        gap: 12,
    },
    manualCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 12,
    },
    manualIcon: {
        width: 48,
        height: 48,
        borderRadius: 10,
        backgroundColor: '#1e3a5f',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    manualInfo: {
        flex: 1,
    },
    manualTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 2,
    },
    manualType: {
        fontSize: 14,
        color: '#3b82f6',
        textTransform: 'capitalize',
        marginBottom: 4,
    },
    manualMeta: {
        flexDirection: 'row',
        gap: 8,
    },
    manualMetaText: {
        fontSize: 12,
        color: '#64748b',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 12,
        color: '#64748b',
        fontSize: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#94a3b8',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 8,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#94a3b8',
        marginBottom: 24,
    },
    modalForm: {
        gap: 16,
    },
    modalInput: {
        gap: 6,
    },
    inputLabel: {
        fontSize: 14,
        color: '#94a3b8',
    },
    input: {
        backgroundColor: '#0f172a',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 14,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        paddingVertical: 16,
        gap: 8,
        marginTop: 24,
    },
    modalButtonDisabled: {
        opacity: 0.7,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
