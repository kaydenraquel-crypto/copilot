import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface HomeScreenProps {
    onNavigate: (screen: string) => void;
}

export default function HomeScreen({ onNavigate }: HomeScreenProps) {
    const { user, logout } = useAuth();

    const menuItems = [
        {
            id: 'troubleshoot',
            title: 'AI Troubleshoot',
            subtitle: 'Get instant repair guidance',
            icon: 'build',
            color: '#3b82f6',
        },
        {
            id: 'manuals',
            title: 'Equipment Manuals',
            subtitle: 'Browse service documentation',
            icon: 'book',
            color: '#10b981',
        },
        {
            id: 'equipment',
            title: 'Equipment Profiles',
            subtitle: 'Customer equipment records',
            icon: 'cube',
            color: '#8b5cf6',
        },
        {
            id: 'history',
            title: 'Service History',
            subtitle: 'Past repairs and diagnostics',
            icon: 'time',
            color: '#f59e0b',
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Welcome back,</Text>
                    <Text style={styles.username}>{user?.full_name || user?.username}</Text>
                </View>
                <TouchableOpacity style={styles.profileButton} onPress={logout}>
                    <Ionicons name="log-out-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.grid}>
                        {menuItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.card}
                                onPress={() => onNavigate(item.id)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                                    <Ionicons name={item.icon as any} size={28} color="#fff" />
                                </View>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Quick Troubleshoot */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.quickTroubleshoot}
                        onPress={() => onNavigate('troubleshoot')}
                    >
                        <View style={styles.quickTroubleshootContent}>
                            <Ionicons name="flash" size={32} color="#fbbf24" />
                            <View style={styles.quickTroubleshootText}>
                                <Text style={styles.quickTroubleshootTitle}>Quick Diagnosis</Text>
                                <Text style={styles.quickTroubleshootSubtitle}>
                                    Enter error code for instant help
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#64748b" />
                    </TouchableOpacity>
                </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
    },
    greeting: {
        fontSize: 14,
        color: '#94a3b8',
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    card: {
        width: '48%',
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#94a3b8',
    },
    quickTroubleshoot: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#fbbf24',
        marginBottom: 24,
    },
    quickTroubleshootContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    quickTroubleshootText: {
        gap: 2,
    },
    quickTroubleshootTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    quickTroubleshootSubtitle: {
        fontSize: 14,
        color: '#94a3b8',
    },
});
