import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { RAGSource } from '../types';

interface SourceCitationCardProps {
  sources: RAGSource[];
}

const COLORS = {
  navy: '#1F2F36',
  slate: '#2E434A',
  gold: '#D6A85E',
  copper: '#B8743A',
  mist: '#C9D1D3',
  white: '#F2F5F4',
};

export default function SourceCitationCard({ sources }: SourceCitationCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sources.length) {
    return null;
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => setExpanded((prev) => !prev)}
        style={styles.header}
        activeOpacity={0.8}
      >
        <View>
          <Text style={styles.title}>Sources</Text>
          <Text style={styles.subtitle}>{sources.length} excerpt(s) used</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={COLORS.gold}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {sources.map((source, index) => (
            <View key={`${source.page || 'p'}-${index}`} style={styles.sourceItem}>
              <Text style={styles.sourceMeta}>
                Page {source.page ?? 'N/A'} | {source.section || 'Unknown section'}
              </Text>
              <Text style={styles.sourceText}>{source.excerpt}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.slate,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.copper,
    marginTop: 12,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.mist,
    fontSize: 12,
    marginTop: 2,
  },
  body: {
    borderTopColor: COLORS.copper,
    borderTopWidth: 1,
    gap: 10,
    padding: 12,
  },
  sourceItem: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.copper,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  sourceMeta: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  sourceText: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 18,
  },
});
