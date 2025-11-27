import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Text } from '@/components/nativewindui/Text';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError, isAuthenticated, isInitializing } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const heartScale = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [heartScale]);

  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isInitializing, router]);

  useEffect(
    () => () => {
      setFormError(null);
      clearError();
    },
    [clearError]
  );

  const handleSubmit = useCallback(async () => {
    clearError();
    if (!username.trim() || !password) {
      setFormError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      await login(username.trim(), password);
      setFormError(null);
      router.replace('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.';
      setFormError(message);
    }
  }, [clearError, login, password, router, username]);

  if (isInitializing) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Decorative background blobs */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />

        {/* Heart Icon */}
        <View style={styles.headerContainer}>
          <Animated.View style={[styles.heartIconContainer, { transform: [{ scale: heartScale }] }]}>
            <Svg width="80" height="80" viewBox="0 0 100 100">
              <Defs>
                <LinearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FFA500" stopOpacity="1" />
                  <Stop offset="50%" stopColor="#FF6B6B" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Path
                d="M50 85C20 70 5 55 5 40 5 25 15 15 25 15 35 15 45 25 50 35 55 25 65 15 75 15 85 15 95 25 95 40 95 55 80 70 50 85Z"
                fill="url(#heartGradient)"
              />
            </Svg>
          </Animated.View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Đăng nhập</Text>
          <Text style={styles.subtitle}>Theo dõi sức khỏe của bạn mỗi ngày</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Username Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Tên đăng nhập</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'username' && styles.inputWrapperFocused,
                formError && !focusedField && styles.inputWrapperError,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Nhập tên đăng nhập"
                placeholderTextColor="#999"
                value={username}
                onChangeText={(value) => {
                  setUsername(value);
                  if (formError) setFormError(null);
                  clearError();
                }}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'password' && styles.inputWrapperFocused,
                formError && !focusedField && styles.inputWrapperError,
              ]}
            >
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#999"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (formError) setFormError(null);
                  clearError();
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={22}
                  color="#E74C3C"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Message */}
          {(formError || error) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{formError || error}</Text>
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFF" />
                <Text style={styles.loginButtonText}>Đang xử lý...</Text>
              </View>
            ) : (
              <View style={styles.loginButtonContent}>
                <Text style={styles.loginButtonText}>Đăng nhập</Text>
                <Text style={styles.arrow}>→</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <View style={styles.signUpLinkContainer}>
              <Text style={styles.signUpLink}>Đăng ký ngay</Text>
              <Text style={styles.signUpArrow}>↗</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F6',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  blob1: {
    position: 'absolute',
    top: 40,
    right: 48,
    width: 128,
    height: 128,
    backgroundColor: 'rgba(255, 200, 150, 0.15)',
    borderRadius: 64,
    opacity: 0.6,
  },
  blob2: {
    position: 'absolute',
    bottom: 80,
    left: 32,
    width: 160,
    height: 160,
    backgroundColor: 'rgba(255, 180, 180, 0.12)',
    borderRadius: 80,
    opacity: 0.5,
  },
  blob3: {
    position: 'absolute',
    top: '50%',
    right: '25%',
    width: 96,
    height: 96,
    backgroundColor: 'rgba(255, 150, 150, 0.08)',
    borderRadius: 48,
    opacity: 0.4,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  heartIconContainer: {
    width: 80,
    height: 80,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.5,
    paddingTop: 25,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 8,
  },
  subtitleDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 4,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
  },
  subtitleSmall: {
    fontSize: 13,
    color: '#94A3B8',
  },
  formContainer: {
    gap: 20,
  },
  inputSection: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFB3A3',
    borderRadius: 16,
    paddingRight: 12,
    backgroundColor: '#FFF0EC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWrapperFocused: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF0EC',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 8,
    borderRadius: 8,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  arrow: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  signUpText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  signUpLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signUpLink: {
    fontSize: 15,
    color: '#E74C3C',
    fontWeight: '700',
  },
  signUpArrow: {
    fontSize: 16,
    color: '#E74C3C',
    fontWeight: '700',
  },
});

