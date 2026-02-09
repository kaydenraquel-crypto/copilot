import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

interface PDFViewerScreenProps {
    pdfUrl: string;
    title: string;
    onBack: () => void;
}

export default function PDFViewerScreen({ pdfUrl, title, onBack }: PDFViewerScreenProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const openInBrowser = () => {
        Linking.openURL(pdfUrl);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                <TouchableOpacity onPress={openInBrowser} style={styles.backButton}>
                    <Ionicons name="open-outline" size={22} color="#3b82f6" />
                </TouchableOpacity>
            </View>

            {/* PDF Viewer */}
            <View style={styles.webviewContainer}>
                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#3b82f6" />
                        <Text style={styles.loadingText}>Loading PDF...</Text>
                    </View>
                )}

                {error ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={48} color="#ef4444" />
                        <Text style={styles.errorText}>Failed to load PDF</Text>
                        <Text style={styles.errorSubtext}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={openInBrowser}>
                            <Ionicons name="open-outline" size={18} color="#fff" />
                            <Text style={styles.retryText}>Open in Browser</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <WebView
                        source={{ uri: pdfUrl }}
                        style={styles.webview}
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                        onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            setError(nativeEvent.description || 'Could not load PDF');
                            setIsLoading(false);
                        }}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        allowFileAccess={true}
                        scalesPageToFit={true}
                        originWhitelist={['*']}
                        mixedContentMode="always"
                    />
                )}
            </View>
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
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
        marginHorizontal: 8,
    },
    webviewContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    webview: {
        flex: 1,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        zIndex: 10,
    },
    loadingText: {
        marginTop: 12,
        color: '#64748b',
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#0f172a',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    errorSubtext: {
        color: '#94a3b8',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
