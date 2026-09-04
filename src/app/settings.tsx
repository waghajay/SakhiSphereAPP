import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  changePassword,
  getUserSettings,
  updateNotificationSettings,
  updatePrivacySettings,
} from '@/services/api/user';
import { removeAuthToken } from '@/services/storage/token';
import type { NotificationSettings, PrivacySettings } from '@/types';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState<NotificationSettings>({
    pushNotifications: true,
    emailNotifications: true,
    chatNotifications: true,
    communityUpdates: true,
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'members_only',
    allowMessages: 'all_members',
    showOnlineStatus: true,
  });

  const [loading, setLoading] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getUserSettings();
        if (data.notifications) setNotifications(data.notifications);
        if (data.privacy) setPrivacy(data.privacy);
      } catch (err: any) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleToggleNotification = async (key: keyof NotificationSettings, value: boolean) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    try {
      await updateNotificationSettings(updated);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update notification setting');
    }
  };

  const handleTogglePrivacyOnline = async (value: boolean) => {
    const updated = { ...privacy, showOnlineStatus: value };
    setPrivacy(updated);
    try {
      await updatePrivacySettings(updated);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update privacy setting');
    }
  };

  const handleChangeVisibility = async (visibility: PrivacySettings['profileVisibility']) => {
    const updated = { ...privacy, profileVisibility: visibility };
    setPrivacy(updated);
    try {
      await updatePrivacySettings(updated);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update profile visibility');
    }
  };

  const handleChangeAllowMessages = async (allow: PrivacySettings['allowMessages']) => {
    const updated = { ...privacy, allowMessages: allow };
    setPrivacy(updated);
    try {
      await updatePrivacySettings(updated);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update messaging preference');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Validation Error', 'Please enter your current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been changed successfully.');
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of SakhiSphere?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await removeAuthToken();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings & Privacy</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Privacy Controls */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔒 Privacy Controls</Text>
            <Text style={styles.cardSub}>Manage who can see your profile and reach out to you.</Text>

            {/* Profile Visibility */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Who Can View Your Profile</Text>
              <View style={styles.segmentedControl}>
                {[
                  { value: 'members_only', label: 'Members' },
                  { value: 'connections_only', label: 'Friends Only' },
                  { value: 'public', label: 'Public' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.segmentButton,
                      privacy.profileVisibility === opt.value && styles.segmentButtonActive,
                    ]}
                    onPress={() => handleChangeVisibility(opt.value as any)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        privacy.profileVisibility === opt.value && styles.segmentTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Message Permissions */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Who Can Message You</Text>
              <View style={styles.segmentedControl}>
                {[
                  { value: 'all_members', label: 'All Members' },
                  { value: 'connections_only', label: 'Connections Only' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.segmentButton,
                      privacy.allowMessages === opt.value && styles.segmentButtonActive,
                    ]}
                    onPress={() => handleChangeAllowMessages(opt.value as any)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        privacy.allowMessages === opt.value && styles.segmentTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Show Online Status */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Show Online Status</Text>
                <Text style={styles.settingDesc}>Let connections know when you are active on the app</Text>
              </View>
              <Switch
                value={privacy.showOnlineStatus}
                onValueChange={handleTogglePrivacyOnline}
                trackColor={{ false: '#E5E7EB', true: '#C084FC' }}
                thumbColor={privacy.showOnlineStatus ? '#7C3AED' : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔔 Notification Preferences</Text>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDesc}>Receive alerts on your device for activities</Text>
              </View>
              <Switch
                value={notifications.pushNotifications}
                onValueChange={(val) => handleToggleNotification('pushNotifications', val)}
                trackColor={{ false: '#E5E7EB', true: '#C084FC' }}
                thumbColor={notifications.pushNotifications ? '#7C3AED' : '#9CA3AF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Chat Message Alerts</Text>
                <Text style={styles.settingDesc}>Sound and alert when someone messages you</Text>
              </View>
              <Switch
                value={notifications.chatNotifications}
                onValueChange={(val) => handleToggleNotification('chatNotifications', val)}
                trackColor={{ false: '#E5E7EB', true: '#C084FC' }}
                thumbColor={notifications.chatNotifications ? '#7C3AED' : '#9CA3AF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Community & Meetup Updates</Text>
                <Text style={styles.settingDesc}>Notifications for events, webinars, and group posts</Text>
              </View>
              <Switch
                value={notifications.communityUpdates}
                onValueChange={(val) => handleToggleNotification('communityUpdates', val)}
                trackColor={{ false: '#E5E7EB', true: '#C084FC' }}
                thumbColor={notifications.communityUpdates ? '#7C3AED' : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Account Security */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔑 Account Security</Text>
            <Text style={styles.cardSub}>Change your login password</Text>

            <View style={styles.passwordForm}>
              <TextInput
                style={styles.input}
                placeholder="Current Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="New Password (min 6 chars)"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity
                style={[styles.passwordButton, changingPassword && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.passwordButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Log Out */}
          <TouchableOpacity style={styles.logoutCard} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>🚪 Log Out of SakhiSphere</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  settingDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  passwordForm: {
    gap: 10,
    marginTop: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  passwordButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  passwordButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutCard: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '700',
  },
});
