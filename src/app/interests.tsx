import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllInterests, getMyInterests, selectInterests } from '@/services/api/user';
import type { Interest } from '@/types';

export default function InterestsScreen() {
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [available, my] = await Promise.all([getAllInterests(), getMyInterests()]);
        setAllInterests(available);
        setSelectedIds(my.map((i) => i.id));
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load interests');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleInterest = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await selectInterests(selectedIds);
      Alert.alert('Saved!', 'Your interests have been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save interests');
    } finally {
      setSaving(false);
    }
  };

  // Group interests by category
  const categories = Array.from(new Set(allInterests.map((i) => i.category)));

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.cancelText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Interests</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={8}>
          <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introBox}>
          <Text style={styles.introTitle}>Discover Your Circle 🌸</Text>
          <Text style={styles.introSub}>
            Select the topics you're passionate about. SakhiSphere uses these to suggest
            relevant posts, groups, and friends.
          </Text>
          <Text style={styles.countText}>{selectedIds.length} interests selected</Text>
        </View>

        {categories.map((category) => {
          const items = allInterests.filter((i) => i.category === category);
          return (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.chipsRow}>
                {items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleInterest(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.chipIcon}>{item.icon}</Text>
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  saveText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '700',
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  introBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B21A8',
    marginBottom: 4,
  },
  introSub: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  countText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },
  categorySection: {
    marginBottom: 22,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#F3E8FF',
    borderColor: '#7C3AED',
  },
  chipIcon: {
    fontSize: 16,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextSelected: {
    color: '#7C3AED',
    fontWeight: '700',
  },
});
