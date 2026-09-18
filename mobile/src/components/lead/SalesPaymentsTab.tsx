import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';

interface Plot {
  id: string;
  plotNumber: string;
  price: number;
  isCornerPiece: boolean;
  estate: { name: string };
}

export default function SalesPaymentsTab({ leadId, themeColor, onUpdate }: { leadId: string, themeColor: string, onUpdate: () => void }) {
  const [sales, setSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Purchase Form
  const [plots, setPlots] = useState<Plot[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [docName, setDocName] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docAddress, setDocAddress] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('TRANSFER');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentProof, setPaymentProof] = useState<any>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const fetchSales = async () => {
    try {
      const res = await api.get(`/api/leads/${leadId}/sales`);
      setSales(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlots = async () => {
    try {
      const res = await api.get('/api/plots/available');
      setPlots(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchPlots();
  }, [leadId]);

  const handlePurchaseSubmit = async () => {
    if (!selectedPlotId) {
      Alert.alert('Error', 'Please select a property');
      return;
    }
    if (!termsAccepted) {
      Alert.alert('Error', 'Client must accept terms and conditions');
      return;
    }

    setIsSubmittingPurchase(true);
    try {
      const plot = plots.find(p => p.id === selectedPlotId);
      await api.post('/api/sales', {
        leadId,
        plotId: selectedPlotId,
        isCornerPiece: plot?.isCornerPiece || false,
        nameOnDocument: docName,
        phoneOnDocument: docPhone,
        addressOnDocument: docAddress,
        termsAccepted
      });
      Alert.alert('Success', 'Purchase recorded successfully');
      setIsPurchaseModalOpen(false);
      fetchSales();
      onUpdate();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to record purchase');
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true
      });
      if (result.canceled === false && result.assets.length > 0) {
        setPaymentProof(result.assets[0]);
      }
    } catch (err) {
      console.error('Error picking document', err);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentAmount) {
      Alert.alert('Error', 'Amount is required');
      return;
    }
    if (!paymentProof && paymentMethod !== 'EQUITY_WALLET') {
      Alert.alert('Error', 'Proof of payment is required');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const formData = new FormData();
      formData.append('amount', paymentAmount);
      formData.append('method', paymentMethod);
      formData.append('reference', paymentRef);
      
      if (paymentProof) {
        formData.append('proofs', {
          uri: paymentProof.uri,
          name: paymentProof.name,
          type: paymentProof.mimeType || 'application/octet-stream'
        } as any);
      }

      await api.post(`/api/sales/${selectedSaleId}/payments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      Alert.alert('Success', 'Payment recorded successfully');
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentProof(null);
      fetchSales();
      onUpdate();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return '₦' + (amount || 0).toLocaleString('en-NG');
  };

  const renderSaleCard = ({ item }: { item: any }) => {
    const progress = Math.min(((item.totalPaid || 0) / (item.agreedPrice || 1)) * 100, 100);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.plotName}>{item.plot?.estate?.name} - Plot {item.plot?.plotNumber}</Text>
            <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? '#D1FAE5' : '#FEF3C7' }]}>
            <Text style={[styles.statusText, { color: item.status === 'COMPLETED' ? '#059669' : '#D97706' }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.financials}>
          <View>
            <Text style={styles.label}>Agreed Price</Text>
            <Text style={styles.value}>{formatCurrency(item.agreedPrice)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>Total Paid</Text>
            <Text style={styles.value}>{formatCurrency(item.totalPaid)}</Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: themeColor }]} />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.outlineBtn, { borderColor: themeColor }]}
            onPress={() => {
              setSelectedSaleId(item.id);
              setIsPaymentModalOpen(true);
            }}
          >
            <Ionicons name="card-outline" size={16} color={themeColor} />
            <Text style={[styles.outlineBtnText, { color: themeColor }]}>Record Payment</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={themeColor} />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.newPurchaseBtn, { backgroundColor: themeColor }]} onPress={() => setIsPurchaseModalOpen(true)}>
        <Ionicons name="add" size={20} color="#FFF" />
        <Text style={styles.newPurchaseBtnText}>New Purchase (Offer)</Text>
      </TouchableOpacity>

      <FlatList
        data={sales}
        keyExtractor={item => item.id}
        renderItem={renderSaleCard}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Purchases Yet</Text>
            <Text style={styles.emptyText}>Create a new purchase to get started.</Text>
          </View>
        }
      />

      {/* New Purchase Modal */}
      <Modal visible={isPurchaseModalOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Purchase</Text>
          <TouchableOpacity onPress={() => setIsPurchaseModalOpen(false)}>
            <Ionicons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.inputLabel}>Select Property</Text>
          <View style={styles.selectContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {plots.map(p => (
                <TouchableOpacity 
                  key={p.id} 
                  style={[styles.plotChip, selectedPlotId === p.id && { backgroundColor: themeColor, borderColor: themeColor }]}
                  onPress={() => setSelectedPlotId(p.id)}
                >
                  <Text style={[styles.plotChipText, selectedPlotId === p.id && { color: '#FFF' }]}>
                    {p.estate.name} - Plot {p.plotNumber}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.sectionTitle}>Document Details (Optional)</Text>
          <Text style={styles.hintText}>If left blank, primary profile data will be used.</Text>
          
          <TextInput style={styles.input} placeholder="Name on Document" value={docName} onChangeText={setDocName} />
          <TextInput style={styles.input} placeholder="Phone on Document" value={docPhone} onChangeText={setDocPhone} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Address on Document" value={docAddress} onChangeText={setDocAddress} />

          <TouchableOpacity style={styles.checkboxRow} onPress={() => setTermsAccepted(!termsAccepted)}>
            <Ionicons name={termsAccepted ? 'checkbox' : 'square-outline'} size={24} color={termsAccepted ? themeColor : '#9CA3AF'} />
            <Text style={styles.checkboxText}>I confirm the client has read and accepted the Terms & Conditions.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: themeColor }]} onPress={handlePurchaseSubmit} disabled={isSubmittingPurchase}>
            {isSubmittingPurchase ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Create Purchase</Text>}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Record Payment Modal */}
      <Modal visible={isPaymentModalOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Record Payment</Text>
          <TouchableOpacity onPress={() => setIsPaymentModalOpen(false)}>
            <Ionicons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.inputLabel}>Amount (₦)</Text>
          <TextInput style={styles.input} placeholder="E.g. 500000" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="numeric" />

          <Text style={styles.inputLabel}>Payment Method</Text>
          <View style={styles.methodRow}>
            {['TRANSFER', 'CASH', 'CHEQUE'].map(m => (
              <TouchableOpacity key={m} style={[styles.methodChip, paymentMethod === m && { backgroundColor: themeColor, borderColor: themeColor }]} onPress={() => setPaymentMethod(m)}>
                <Text style={[styles.methodChipText, paymentMethod === m && { color: '#FFF' }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Payment Reference / Note (Optional)</Text>
          <TextInput style={styles.input} placeholder="E.g. Transfer Ref 123456" value={paymentRef} onChangeText={setPaymentRef} />

          <Text style={styles.inputLabel}>Proof of Payment</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
            <Ionicons name="cloud-upload-outline" size={24} color="#6B7280" />
            <Text style={styles.uploadText}>{paymentProof ? paymentProof.name : 'Tap to upload Image or PDF'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: themeColor, marginTop: 32 }]} onPress={handlePaymentSubmit} disabled={isSubmittingPayment}>
            {isSubmittingPayment ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Submit Payment</Text>}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  newPurchaseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  newPurchaseBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  plotName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  dateText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '700' },
  financials: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  progressContainer: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, marginBottom: 16, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  outlineBtnText: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFF' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalContent: { padding: 24, backgroundColor: '#F9FAFB' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 24 },
  hintText: { fontSize: 12, color: '#6B7280', marginBottom: 16, marginTop: 4 },
  selectContainer: { marginBottom: 8 },
  plotChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF', marginRight: 12 },
  plotChipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FEF3C7', borderRadius: 12, marginBottom: 24, marginTop: 8 },
  checkboxText: { flex: 1, marginLeft: 12, fontSize: 14, color: '#92400E', fontWeight: '500' },
  submitBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  methodChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF', alignItems: 'center' },
  methodChipText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 12, backgroundColor: '#F9FAFB', justifyContent: 'center' },
  uploadText: { marginLeft: 8, color: '#6B7280', fontSize: 14 }
});
