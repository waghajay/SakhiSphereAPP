import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
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
import { sendOtp, verifyOtp } from '@/services/api/auth';
import { saveAuthToken, saveUserData } from '@/services/storage/token';

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{ email?: string; otpDev?: string }>();
  const email = params.email || '';

  const [otpCode, setOtpCode] = useState(params.otpDev || '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(30);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState(
    params.otpDev ? `Dev helper code: ${params.otpDev}` : ''
  );

  useEffect(() => {
    let interval: any = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    setErrorMessage('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOtp(email, otpCode.trim());

      // Save token and user info
      await saveAuthToken(response.token);
      await saveUserData(response.user);

      // Navigate to Profile Setup onboarding
      router.replace('/(auth)/profile-setup' as any);
    } catch (error: any) {
      setErrorMessage(error.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || resending) return;

    setErrorMessage('');
    setResending(true);
    try {
      const result = await sendOtp(email, 'registration');
      setTimer(30);
      if (result.otpDev) {
        setSuccessMessage(`New code sent! (Dev code: ${result.otpDev})`);
        setOtpCode(result.otpDev);
      } else {
        setSuccessMessage('A new verification code has been sent to your email.');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.emoji}>🌸</Text>
            <Text style={styles.title}>Verify your account</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit verification code to:
            </Text>
            <Text style={styles.emailHighlight}>{email || 'your email'}</Text>

            {successMessage ? (
              <View style={styles.successBox}>
                <Text style={styles.successBoxText}>✨ {successMessage}</Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.otpInput}
                placeholder="------"
                placeholderTextColor="#D1D5DB"
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, ''))}
                textAlign="center"
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendRow}>
              <Text style={styles.resendLabel}>Didn't receive the code? </Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={timer > 0 || resending}
                activeOpacity={0.7}
              >
                <Text style={[styles.resendLink, timer > 0 && styles.resendDisabled]}>
                  {timer > 0 ? `Resend in ${timer}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
  body: {
    alignItems: 'center',
    paddingTop: 16,
    gap: 8,
  },
  emoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  emailHighlight: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 12,
  },
  successBox: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 8,
  },
  successBoxText: {
    color: '#6B21A8',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 8,
  },
  errorBoxText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginVertical: 12,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 12,
    color: '#111827',
    backgroundColor: '#FAF5FF',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  resendLabel: {
    color: '#6B7280',
    fontSize: 14,
  },
  resendLink: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '600',
  },
  resendDisabled: {
    color: '#9CA3AF',
  },
});
