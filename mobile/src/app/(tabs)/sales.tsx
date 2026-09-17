import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Modal, TextInput, ScrollView, Image, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

interface Sale {
  id: string;
  clientName: string;
  estate: string;
  amount: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date: string;
}

const MOCK_SALES: Sale[] = [
  { id: '1', clientName: 'Alice Johnson', estate: 'Esthington Park', amount: '₦ 5,000,000', status: 'APPROVED', date: '2026-09-15' },
  { id: '2', clientName: 'Mark Spencer', estate: 'Royal Gardens', amount: '₦ 12,500,000', status: 'PENDING', date: '2026-09-16' },
];

export default function SalesScreen() {
  const [sales, setSales] = useState<Sale[]>(MOCK_SALES);
  const [isModalVisible, setModalVisible] = useState(false);
  
  // Form State
  const [clientName, setClientName] = useState('');
  const [estate, setEstate] = useState('');
  const [amount, setAmount] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library in newer Expo versions
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const handleRecordSale = () => {
    if (!clientName || !estate || !amount) {
      Alert.alert('Missing Fields', 'Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API Call
    setTimeout(() => {
      const newSale: Sale = {
        id: Math.random().toString(),
        clientName,
        estate,
        amount: `₦ ${amount}`,
        status: 'PENDING',
        date: new Date().toISOString().split('T')[0],
      };
      
      setSales([newSale, ...sales]);
      setIsSubmitting(false);
      setModalVisible(false);
      
      // Reset Form
      setClientName('');
      setEstate('');
      setAmount('');
      setReceiptImage(null);
      
      Alert.alert('Success', 'Sale recorded and sent to MD for approval!');
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return { bg: '#D1FAE5', text: '#065F46' };
      case 'PENDING': return { bg: '#FEF3C7', text: '#92400E' };
      case 'REJECTED': return { bg: '#FEE2E2', text: '#991B1B' };
      default: return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  const renderSaleCard = ({ item }: { item: Sale }) => {
    const statusStyle = getStatusColor(item.status);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.clientName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="home-outline" size={16} color="#6B7280" style={styles.infoIcon} />
            <Text style={styles.infoText}>{item.estate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color="#6B7280" style={styles.infoIcon} />
            <Text style={styles.amountText}>{item.amount}</Text>
          </View>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sales & Payments</Text>
          <Text style={styles.headerSubtitle}>Track and record your deals</Text>
        </View>
      </View>

      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        renderItem={renderSaleCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Record New Sale</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Client Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John Doe"
              value={clientName}
              onChangeText={setClientName}
            />

            <Text style={styles.label}>Property / Estate *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Royal Gardens Phase 1"
              value={estate}
              onChangeText={setEstate}
            />

            <Text style={styles.label}>Amount Paid (₦) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5000000"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.label}>Payment Receipt (Optional)</Text>
            <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
              {receiptImage ? (
                <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.imagePickerText}>Tap to upload receipt image</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]} 
              onPress={handleRecordSale}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Recording...' : 'Submit to MD for Approval'}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100, // Make room for FAB
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#2563EB',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  imagePickerBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  receiptPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
