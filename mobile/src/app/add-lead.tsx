import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AddLeadScreen() {
  const router = useRouter();
  const { recentWorkspace } = useAuth();
  const themeColor = recentWorkspace?.companyColor || '#2563EB';

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    source: '',
    gender: '',
    whatsappOptIn: true
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.fullName || !form.phone) {
      Alert.alert('Error', 'Please provide at least a Full Name and Phone Number.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/api/leads', form);
      Alert.alert('Success', 'Lead added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to add lead. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Lead</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E.g. Sarah Williams"
                placeholderTextColor="#9CA3AF"
                value={form.fullName}
                onChangeText={(val) => setForm({ ...form, fullName: val })}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number <Text style={{ color: '#EF4444' }}>*</Text></Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E.g. 08012345678"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(val) => setForm({ ...form, phone: val })}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E.g. sarah@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={(val) => setForm({ ...form, email: val })}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Source (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
              {['Facebook', 'Instagram', 'Referral', 'Website', 'Walk-in', 'Other'].map((src) => (
                <TouchableOpacity
                  key={src}
                  style={[styles.chip, form.source === src && { backgroundColor: themeColor, borderColor: themeColor }]}
                  onPress={() => setForm({ ...form, source: src })}
                >
                  <Text style={[styles.chipText, form.source === src && styles.chipTextActive]}>{src}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Gender (Optional)</Text>
            <View style={styles.segmentContainer}>
              {['MALE', 'FEMALE'].map((gen) => (
                <TouchableOpacity
                  key={gen}
                  style={[styles.segmentBtn, form.gender === gen && { backgroundColor: themeColor, borderColor: themeColor }]}
                  onPress={() => setForm({ ...form, gender: gen })}
                >
                  <Text style={[styles.segmentBtnText, form.gender === gen && styles.segmentBtnTextActive]}>
                    {gen === 'MALE' ? 'Male' : 'Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.switchContainer}
            activeOpacity={0.8}
            onPress={() => setForm({ ...form, whatsappOptIn: !form.whatsappOptIn })}
          >
            <View style={styles.switchTextContainer}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" style={{ marginRight: 12 }} />
              <Text style={styles.switchLabel}>Subscribed to WhatsApp Communications</Text>
            </View>
            <Switch
              value={form.whatsappOptIn}
              onValueChange={(val) => setForm({ ...form, whatsappOptIn: val })}
              trackColor={{ false: '#D1D5DB', true: `${themeColor}80` }}
              thumbColor={form.whatsappOptIn ? themeColor : '#F3F4F6'}
            />
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: themeColor }, isLoading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Create Lead</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  scrollContent: {
    padding: 24,
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  footer: {
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: Platform.OS === 'ios' ? 0 : 24,
            backgroundColor: '#FFF',
            borderTopWidth: 1,
            borderTopColor: '#F3F4F6',
          },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  chipContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  chipText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFF',
  },
  segmentContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  segmentBtnTextActive: {
    color: '#FFF',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  switchTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  }
});
