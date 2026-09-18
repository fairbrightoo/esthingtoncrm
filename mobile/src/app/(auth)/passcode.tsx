import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/axios';

export default function LoginScreen() {
  const { recentWorkspace, clearRecentWorkspace, login } = useAuth();
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // Login modes: 'email' (default) or 'passcode'
  const [loginMode, setLoginMode] = useState<'email' | 'passcode'>('email');
  
  // Passcode state
  const [passcode, setPasscode] = useState('');
  
  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  const getParam = (val: string | string[] | undefined, fallback?: string) => {
    if (Array.isArray(val)) return val[0] || fallback;
    if (typeof val === 'string') return val;
    return fallback;
  };

  // Construct workspace info from either params or recentWorkspace
  const workspaceInfo = {
    companyId: getParam(params.companyId, recentWorkspace?.companyId),
    companyName: getParam(params.companyName, recentWorkspace?.companyName),
    companyColor: getParam(params.companyColor, recentWorkspace?.companyColor),
    branchId: getParam(params.branchId, recentWorkspace?.branchId),
    branchName: getParam(params.branchName, recentWorkspace?.branchName),
  };

  // If no workspace info is available, redirect to companies
  if (!workspaceInfo.companyId || !workspaceInfo.branchId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const { companyColor, companyName, branchName, companyId, branchId } = workspaceInfo;

  // --- PASSCODE LOGIC ---
  const handleKeyPress = (num: string) => {
    if (passcode.length < 6) {
      const newPasscode = passcode + num;
      setPasscode(newPasscode);
      
      if (newPasscode.length === 6) {
        verifyPasscode(newPasscode);
      }
    }
  };

  const handleBackspace = () => {
    setPasscode(passcode.slice(0, -1));
  };

  const verifyPasscode = async (code: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/login', {
        passcode: code,
        companyId,
        branchId
      });
      
      const { token, user } = response.data;
      await login(token, user, workspaceInfo as any);
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.error || 'Invalid passcode or you do not have a passcode set.');
      setPasscode('');
    } finally {
      setIsLoading(false);
    }
  };

  // --- EMAIL LOGIC ---
  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
        companyId,
        branchId
      });
      
      const { token, user } = response.data;
      await login(token, user, workspaceInfo as any);
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.error || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderDialPadButton = (num: string) => (
    <TouchableOpacity 
      style={styles.dialButton} 
      onPress={() => handleKeyPress(num)}
      disabled={isLoading}
    >
      <Text style={styles.dialText}>{num}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: companyColor }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.companyName} numberOfLines={1}>{companyName}</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.card}>
              <View style={[styles.iconContainer, { backgroundColor: `${companyColor}15` }]}>
                <Ionicons name={loginMode === 'email' ? "person" : "lock-closed"} size={32} color={companyColor} />
              </View>
              <Text style={styles.title}>{branchName}</Text>
              
              {loginMode === 'email' ? (
                <>
                  <Text style={styles.subtitle}>Enter your email and password to log in</Text>
                  
                  <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Email Address</Text>
                      <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="john@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isLoading}
                      />
                    </View>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Password</Text>
                      <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        secureTextEntry
                        editable={!isLoading}
                      />
                    </View>

                    <TouchableOpacity 
                      style={[styles.loginButton, { backgroundColor: companyColor }, isLoading && { opacity: 0.7 }]}
                      onPress={handleEmailLogin}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.loginButtonText}>Sign In</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.subtitle}>Enter your 6-digit PIN to access workspace</Text>
                  
                  {/* PIN Indicators */}
                  <View style={styles.pinContainer}>
                    {[1, 2, 3, 4, 5, 6].map((index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.pinDot, 
                          passcode.length >= index ? { backgroundColor: companyColor, borderColor: companyColor } : {}
                        ]} 
                      />
                    ))}
                  </View>
                  
                  {isLoading && <ActivityIndicator style={{ marginBottom: 20 }} color={companyColor} />}

                  {/* Dial Pad */}
                  <View style={styles.dialPad}>
                    <View style={styles.dialRow}>
                      {renderDialPadButton('1')}
                      {renderDialPadButton('2')}
                      {renderDialPadButton('3')}
                    </View>
                    <View style={styles.dialRow}>
                      {renderDialPadButton('4')}
                      {renderDialPadButton('5')}
                      {renderDialPadButton('6')}
                    </View>
                    <View style={styles.dialRow}>
                      {renderDialPadButton('7')}
                      {renderDialPadButton('8')}
                      {renderDialPadButton('9')}
                    </View>
                    <View style={styles.dialRow}>
                      <View style={styles.dialButtonEmpty} />
                      {renderDialPadButton('0')}
                      <TouchableOpacity style={styles.dialButton} onPress={handleBackspace} disabled={isLoading}>
                        <Ionicons name="backspace-outline" size={28} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={styles.bottomActions}>
              <TouchableOpacity 
                style={styles.toggleModeButton} 
                onPress={() => {
                  setLoginMode(loginMode === 'email' ? 'passcode' : 'email');
                  setPasscode('');
                }}
                disabled={isLoading}
              >
                <Ionicons name={loginMode === 'email' ? "keypad-outline" : "mail-outline"} size={18} color="#4B5563" />
                <Text style={styles.toggleModeText}>
                  {loginMode === 'email' ? 'Use 6-Digit Passcode instead' : 'Log in with Email and Password'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.switchButton} 
                onPress={clearRecentWorkspace}
                disabled={isLoading}
              >
                <Ionicons name="business-outline" size={18} color="#9CA3AF" />
                <Text style={styles.switchText}>Switch Workspace</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  formContainer: {
    width: '100%',
    gap: 16,
  },
  inputGroup: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  loginButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 30,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  dialPad: {
    width: '100%',
    maxWidth: 280,
    gap: 16,
  },
  dialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dialButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialButtonEmpty: {
    width: 70,
    height: 70,
  },
  dialText: {
    fontSize: 28,
    fontWeight: '500',
    color: '#1F2937',
  },
  bottomActions: {
    marginTop: 24,
    alignItems: 'center',
    gap: 16,
    paddingBottom: 20,
  },
  toggleModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toggleModeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  switchText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  }
});
