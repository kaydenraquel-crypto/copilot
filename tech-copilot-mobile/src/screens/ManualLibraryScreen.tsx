import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { deleteManual, getManuals, uploadManual } from '../services/api';
import { Manual } from '../types';

interface ManualLibraryScreenProps {
  onBack: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  complete: 'Complete',
  failed: 'Failed',
};

export default function ManualLibraryScreen({ onBack }: ManualLibraryScreenProps) {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [equipmentType, setEquipmentType] = useState('service');
  const [file, setFile] = useState<{ uri: string; name: string } | null>(null);

  const hasPending = useMemo(
    () => manuals.some((manual) => (manual.indexing_status || 'pending') === 'pending'),
    [manuals]
  );

  const loadManuals = async () => {
    try {
      const response = await getManuals();
      setManuals(response?.data?.manuals || []);
    } catch (error: any) {
      Alert.alert('Load Failed', error?.message || 'Could not load manuals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManuals();
  }, []);

  useEffect(() => {
    if (!hasPending) return undefined;
    const timer = setInterval(() => {
      loadManuals();
    }, 6000);
    return () => clearInterval(timer);
  }, [hasPending]);

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setFile({ uri: asset.uri, name: asset.name || 'manual.pdf' });
  };

  const resetUploadForm = () => {
    setBrand('');
    setModel('');
    setEquipmentType('service');
    setFile(null);
  };

  const handleUpload = async () => {
    if (!file || !brand.trim() || !model.trim()) {
      Alert.alert('Missing Info', 'Select a PDF and enter brand/model.');
      return;
    }

    setUploading(true);
    try {
      await uploadManual(
        { ...file, type: 'application/pdf' },
        brand.trim(),
        model.trim(),
        equipmentType
      );
      Alert.alert('Upload Started', 'Manual upload succeeded. Indexing is running in the background.');
      setShowUploadModal(false);
      resetUploadForm();
      await loadManuals();
    } catch (error: any) {
      Alert.alert('Upload Failed', error?.message || 'Could not upload manual');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (manual: Manual) => {
    Alert.alert(
      'Delete Manual',
      `Delete ${manual.brand || manual.manufacturer} ${manual.model}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteManual(manual.id);
              await loadManuals();
            } catch (error: any) {
              Alert.alert('Delete Failed', error?.message || 'Could not delete manual');
            }
          },
        },
      ]
    );
  };

  const renderManual = ({ item }: { item: Manual }) => {
    const status = item.indexing_status || 'pending';
    const statusColor =
      status === 'complete' ? '#4FB286' : status === 'failed' ? '#E58A6E' : '#D6A85E';

    const rightActions = () => (
      <TouchableOpacity style={styles.swipeDeleteAction} onPress={() => confirmDelete(item)}>
        <Ionicons name="trash-outline" size={20} color="#F2F5F4" />
        <Text style={styles.swipeDeleteText}>Delete</Text>
      </TouchableOpacity>
    );

    return (
      <Swipeable renderRightActions={rightActions} overshootRight={false}>
        <View style={styles.manualCard}>
          <View style={styles.manualMain}>
            <Text style={styles.manualTitle}>
              {(item.brand || item.manufacturer) ?? 'Unknown'} {item.model}
            </Text>
            <Text style={styles.manualMeta}>{item.filename || 'manual.pdf'}</Text>
            <Text style={styles.manualMeta}>
              Indexed: {item.indexed_at ? new Date(item.indexed_at).toLocaleString() : 'In progress'}
            </Text>
            {!!item.indexing_error && <Text style={styles.manualError}>{item.indexing_error}</Text>}
          </View>
          <View style={styles.manualActions}>
            <View style={[styles.statusBadge, { borderColor: statusColor }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[status] || status}
              </Text>
            </View>
            <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={18} color="#E58A6E" />
            </TouchableOpacity>
          </View>
        </View>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color="#F2F5F4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manual Library</Text>
        <TouchableOpacity onPress={loadManuals} style={styles.headerButton}>
          <Ionicons name="refresh" size={20} color="#D6A85E" />
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.uploadAction} onPress={() => setShowUploadModal(true)}>
          <Ionicons name="cloud-upload-outline" size={18} color="#1F2F36" />
          <Text style={styles.uploadActionText}>Upload Manual</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#D6A85E" size="large" />
          <Text style={styles.subtleText}>Loading manual library...</Text>
        </View>
      ) : manuals.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="library-outline" size={46} color="#C9D1D3" />
          <Text style={styles.emptyTitle}>No manuals indexed yet</Text>
          <Text style={styles.emptyText}>Upload a service manual PDF to start RAG search.</Text>
        </View>
      ) : (
        <FlatList
          data={manuals}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={renderManual}
        />
      )}

      <Modal
        visible={showUploadModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Service Manual</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color="#C9D1D3" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.filePicker} onPress={pickDocument}>
              <Ionicons name="document-attach-outline" size={22} color="#D6A85E" />
              <Text style={styles.filePickerText}>{file ? file.name : 'Choose PDF file'}</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Brand (example: Alto Shaam)"
              placeholderTextColor="#8FA2A7"
              value={brand}
              onChangeText={setBrand}
            />
            <TextInput
              style={styles.input}
              placeholder="Model (example: CTP720E)"
              placeholderTextColor="#8FA2A7"
              value={model}
              onChangeText={setModel}
            />
            <TextInput
              style={styles.input}
              placeholder="Equipment type (service, oven, fryer...)"
              placeholderTextColor="#8FA2A7"
              value={equipmentType}
              onChangeText={setEquipmentType}
            />

            <TouchableOpacity
              style={[styles.submitButton, uploading && styles.buttonDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#1F2F36" />
              ) : (
                <Text style={styles.submitButtonText}>Upload and Index</Text>
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
    backgroundColor: '#1F2F36',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#385059',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  headerTitle: {
    color: '#F2F5F4',
    fontSize: 18,
    fontWeight: '700',
  },
  actionsRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  uploadAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#D6A85E',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  uploadActionText: {
    color: '#1F2F36',
    fontSize: 14,
    fontWeight: '700',
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  subtleText: {
    color: '#C9D1D3',
    marginTop: 10,
  },
  listContent: {
    padding: 16,
  },
  manualCard: {
    backgroundColor: '#2E434A',
    borderColor: '#3B5861',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 12,
  },
  swipeDeleteAction: {
    alignItems: 'center',
    backgroundColor: '#B8743A',
    borderRadius: 12,
    justifyContent: 'center',
    marginBottom: 12,
    marginLeft: 8,
    paddingHorizontal: 16,
  },
  swipeDeleteText: {
    color: '#F2F5F4',
    fontSize: 12,
    marginTop: 4,
  },
  manualMain: {
    flex: 1,
    paddingRight: 10,
  },
  manualTitle: {
    color: '#F2F5F4',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  manualMeta: {
    color: '#C9D1D3',
    fontSize: 12,
    marginBottom: 2,
  },
  manualError: {
    color: '#E58A6E',
    fontSize: 12,
    marginTop: 6,
  },
  manualActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 6,
  },
  emptyTitle: {
    color: '#F2F5F4',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyText: {
    color: '#C9D1D3',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#2E434A',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    paddingBottom: 24,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#F2F5F4',
    fontSize: 17,
    fontWeight: '700',
  },
  filePicker: {
    alignItems: 'center',
    backgroundColor: '#1F2F36',
    borderColor: '#3B5861',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    padding: 12,
  },
  filePickerText: {
    color: '#F2F5F4',
    flex: 1,
    fontSize: 13,
  },
  input: {
    backgroundColor: '#1F2F36',
    borderColor: '#3B5861',
    borderRadius: 10,
    borderWidth: 1,
    color: '#F2F5F4',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#D6A85E',
    borderRadius: 10,
    marginTop: 14,
    paddingVertical: 12,
  },
  submitButtonText: {
    color: '#1F2F36',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
