import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import SourceCitationCard from '../components/SourceCitationCard';
import { getManuals, queryRAG } from '../services/api';
import { Manual, RAGQueryData } from '../types';

interface RAGQueryScreenProps {
  onBack: () => void;
}

type SelectorKind = 'brand' | 'model' | null;

const COLORS = {
  navy: '#1F2F36',
  slate: '#2E434A',
  gold: '#D6A85E',
  copper: '#B8743A',
  mist: '#C9D1D3',
  white: '#F2F5F4',
};

function SelectorModal({
  visible,
  title,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.mist} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.optionText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function RAGQueryScreen({ onBack }: RAGQueryScreenProps) {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [loadingManuals, setLoadingManuals] = useState(true);
  const [selector, setSelector] = useState<SelectorKind>(null);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RAGQueryData | null>(null);

  const loadManuals = async () => {
    setLoadingManuals(true);
    setError('');
    try {
      const response = await getManuals();
      const list = response?.data?.manuals || [];
      setManuals(list);
      if (list.length) {
        const firstBrand = list[0].brand || list[0].manufacturer || '';
        setSelectedBrand((prev) => prev || firstBrand);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load manuals');
    } finally {
      setLoadingManuals(false);
    }
  };

  useEffect(() => {
    loadManuals();
  }, []);

  const brandOptions = useMemo(() => {
    const values = manuals
      .map((manual) => manual.brand || manual.manufacturer || '')
      .filter(Boolean);
    return Array.from(new Set(values)).sort();
  }, [manuals]);

  const modelOptions = useMemo(() => {
    if (!selectedBrand) return [];
    const values = manuals
      .filter((manual) => (manual.brand || manual.manufacturer) === selectedBrand)
      .map((manual) => manual.model)
      .filter(Boolean);
    return Array.from(new Set(values)).sort();
  }, [manuals, selectedBrand]);

  useEffect(() => {
    if (!selectedBrand && brandOptions.length) {
      setSelectedBrand(brandOptions[0]);
      return;
    }
    if (selectedModel && modelOptions.includes(selectedModel)) {
      return;
    }
    setSelectedModel(modelOptions[0] || '');
  }, [brandOptions, modelOptions, selectedBrand, selectedModel]);

  const handleSubmit = async () => {
    if (!selectedBrand || !selectedModel || !question.trim()) {
      setError('Select brand/model and enter a question.');
      return;
    }

    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const response = await queryRAG(question.trim(), selectedModel, selectedBrand, 5);
      setResult(response?.data || null);
    } catch (e: any) {
      setError(e?.message || 'Failed to run RAG query');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manual RAG Query</Text>
        <TouchableOpacity onPress={loadManuals} style={styles.headerButton}>
          <Ionicons name="refresh" size={20} color={COLORS.gold} />
        </TouchableOpacity>
      </View>

      {loadingManuals ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.gold} size="large" />
          <Text style={styles.subtleText}>Loading manuals...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!manuals.length ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={42} color={COLORS.mist} />
              <Text style={styles.emptyTitle}>No manuals available</Text>
              <Text style={styles.emptyText}>
                Upload a manual in Manual Library, then ask model-specific questions here.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Equipment Brand</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setSelector('brand')}>
                <Text style={styles.selectorText}>{selectedBrand || 'Select brand'}</Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.gold} />
              </TouchableOpacity>

              <Text style={styles.label}>Equipment Model</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setSelector('model')}
                disabled={!selectedBrand}
              >
                <Text style={styles.selectorText}>{selectedModel || 'Select model'}</Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.gold} />
              </TouchableOpacity>

              <Text style={styles.label}>Question</Text>
              <TextInput
                style={styles.questionInput}
                placeholder="Example: What does error E151 mean and what are the first checks?"
                placeholderTextColor={COLORS.mist}
                multiline
                value={question}
                onChangeText={setQuestion}
              />

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.navy} />
                ) : (
                  <Text style={styles.submitButtonText}>Ask Manual</Text>
                )}
              </TouchableOpacity>

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              {result && (
                <View style={styles.answerBlock}>
                  {!result.manual_available && (
                    <View style={styles.noManualBanner}>
                      <Ionicons name="information-circle-outline" size={18} color={COLORS.white} />
                      <Text style={styles.noManualText}>
                        No manual is indexed for this equipment yet. Upload the manual in Manual Library for source-cited answers.
                      </Text>
                    </View>
                  )}

                  <Text style={styles.answerTitle}>Answer</Text>
                  <Text style={styles.answerText}>{result.answer}</Text>
                  <SourceCitationCard sources={result.sources || []} />
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      <SelectorModal
        visible={selector === 'brand'}
        title="Select Brand"
        options={brandOptions}
        onSelect={(value) => setSelectedBrand(value)}
        onClose={() => setSelector(null)}
      />
      <SelectorModal
        visible={selector === 'model'}
        title="Select Model"
        options={modelOptions}
        onSelect={(value) => setSelectedModel(value)}
        onClose={() => setSelector(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.navy,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: COLORS.copper,
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
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 28,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  subtleText: {
    color: COLORS.mist,
    marginTop: 12,
  },
  label: {
    color: COLORS.mist,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  selector: {
    alignItems: 'center',
    backgroundColor: COLORS.slate,
    borderColor: COLORS.copper,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectorText: {
    color: COLORS.white,
    fontSize: 15,
  },
  questionInput: {
    backgroundColor: COLORS.slate,
    borderColor: COLORS.copper,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.white,
    fontSize: 15,
    minHeight: 120,
    padding: 12,
    textAlignVertical: 'top',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    marginTop: 14,
    paddingVertical: 14,
  },
  submitButtonText: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: COLORS.copper,
    marginTop: 10,
  },
  answerBlock: {
    backgroundColor: COLORS.slate,
    borderColor: COLORS.copper,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  answerTitle: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  answerText: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: COLORS.slate,
    borderColor: COLORS.copper,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
    padding: 20,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyText: {
    color: COLORS.mist,
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
    backgroundColor: COLORS.slate,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 16,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: COLORS.copper,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
  optionRow: {
    borderBottomColor: COLORS.copper,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionText: {
    color: COLORS.white,
    fontSize: 15,
  },
  noManualBanner: {
    alignItems: 'center',
    backgroundColor: COLORS.copper,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noManualText: {
    color: COLORS.white,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
