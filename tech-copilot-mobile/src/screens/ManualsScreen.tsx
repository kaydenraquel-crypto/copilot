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
import { getManuals, searchManual } from '../services/api';
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
                        Use "Find Manual Online" to search and download manuals
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
