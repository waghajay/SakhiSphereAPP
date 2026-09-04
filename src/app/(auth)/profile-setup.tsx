import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllInterests, selectInterests, updateMyProfile } from '@/services/api/user';
import type { Interest } from '@/types';

export default function ProfileSetupScreen() {
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [availableInterests, setAvailableInterests] = useState<Interest[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [interestsLoading, setInterestsLoading] = useState(true);

  useEffect(() => {
    async function loadInterests() {
      try {
        const list = await getAllInterests();
        setAvailableInterests(list);
      } catch (err) {
        console.error('Failed to load interests', err);
      } finally {
        setInterestsLoading(false);
      }
    }
    loadInterests();
  }, []);

  const toggleInterest = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // 1. Update bio & location
      await updateMyProfile({
        bio: bio.trim() || 'Excited to be part of SakhiSphere! 🌸',
        location: location.trim(),
        occupation: occupation.trim(),
      });

      // 2. Save selected interests
      if (selectedIds.length > 0) {
        await selectInterests(selectedIds);
      }

      router.replace('/(tabs)/home');
    } catch (err) {
      console.error('Error saving profile setup:', err);
      router.replace('/(tabs)/home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <Text style={styles.headerStep}>Step 2 of 2</Text>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} hitSlop={8}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Welcome to SakhiSphere! 🌸</Text>
            <Text style={styles.subtitle}>
              Personalize your profile so like-minded women can connect with you.
            </Text>

            {/* Profile Info Form */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About You</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Short Bio</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  placeholder="Share a little about yourself, passions, or goals..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  value={bio}
                  onChangeText={setBio}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Location / City</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Mumbai, India"
                    placeholderTextColor="#9CA3AF"
                    value={location}
                    onChangeText={setLocation}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Profession / Role</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. CSE Student / Designer"
                    placeholderTextColor="#9CA3AF"
                    value={occupation}
                    onChangeText={setOccupation}
                  />
                </View>
              </View>
            </View>

            {/* Interests Picker */}
            <View style={styles.section}>
              <View style={styles.interestHeader}>
                <Text style={styles.sectionTitle}>Pick Your Interests</Text>
                <Text style={styles.interestCountBadge}>
                  {selectedIds.length} selected
                </Text>
              </View>
              <Text style={styles.sectionHint}>
                Select topics you love. We'll use these to connect you with fellow women!
              </Text>

              {interestsLoading ? (
                <ActivityIndicator color="#7C3AED" style={{ marginVertical: 20 }} />
              ) : (
                <View style={styles.chipsContainer}>
                  {availableInterests.map((item) => {
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
              )}
            </View>

            {/* Finish Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleFinish}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Complete & Enter SakhiSphere ✨</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerStep: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  interestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  interestCountBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  bioInput: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  chipsContainer: {
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
    backgroundColor: '#F3F4F6',
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
  primaryButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
