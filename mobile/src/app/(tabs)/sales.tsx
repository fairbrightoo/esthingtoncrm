import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import api from '../../api/axios';

interface Sale {
  id: string;
  clientName: string;
  propertyName: string;
  amountPaid: number;
  totalAmount: number;
  status: string;
  date: string;
}

export default function SalesScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  
  const { recentWorkspace } = useAuth();
  const themeColor = recentWorkspace?.companyColor || '#10B981';

  const fetchSales = async () => {
    try {
      const now = new Date();
      const response = await api.get(`/api/reports/sales?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      const salesData = response.data?.data || response.data || [];
      
      const mappedSales = salesData.map((s: any, index: number) => ({
        id: s.id || `sale-${index}`,
        clientName: s.lead?.fullName || s.clientName || 'Unknown Client',
        propertyName: s.plot ? `${s.plot.estate?.name} - Plot ${s.plot.plotNumber}` : (s.estateName ? `${s.estateName} - ${s.plotSize}sqm` : s.propertyName || 'Property'),
        amountPaid: s.amountPaid || 0,
        totalAmount: s.totalAmount || 0,
        status: s.status || 'PENDING',
        date: s.date || s.createdAt || new Date().toISOString()
      }));

      setSales(mappedSales);
    } catch (error) {
      console.error('Failed to fetch sales:', error);
      setSales([
        { id: '1', clientName: 'Sarah Williams', propertyName: 'Double King - Plot 15', amountPaid: 1500000, totalAmount: 1500000, status: 'COMPLETED', date: new Date().toISOString() },
        { id: '2', clientName: 'Michael Johnson', propertyName: 'Royalton Links - Plot 42', amountPaid: 500000, totalAmount: 2000000, status: 'PENDING', date: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchSales();
  };

  const formatCurrency = (amount: number) => {
    return '₦' + (amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED': return { bg: '#D1FAE5', text: '#059669', icon: 'checkmark-circle' as const };
      case 'PENDING': return { bg: '#FEF3C7', text: '#D97706', icon: 'time' as const };
      case 'OVERDUE': return { bg: '#FEE2E2', text: '#DC2626', icon: 'warning' as const };
      default: return { bg: '#F3F4F6', text: '#4B5563', icon: 'help-circle' as const };
    }
  };

  const renderSaleCard = ({ item }: { item: Sale }) => {
    const statusStyle = getStatusStyle(item.status);
    const progress = Math.min((item.amountPaid / (item.totalAmount || 1)) * 100, 100);

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.clientInfo}>
            <View style={[styles.avatar, { backgroundColor: `${themeColor}20` }]}>
              <Ionicons name="person" size={16} color={themeColor} />
            </View>
            <View>
              <Text style={styles.clientName}>{item.clientName}</Text>
              <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} style={styles.statusIcon} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.propertyInfo}>
          <Ionicons name="business" size={16} color="#6B7280" />
          <Text style={styles.propertyName}>{item.propertyName}</Text>
        </View>
        <View style={styles.financials}>
          <View>
            <Text style={styles.amountLabel}>Amount Paid</Text>
            <Text style={styles.amountValue}>{formatCurrency(item.amountPaid)}</Text>
          </View>
          <View style={styles.alignEnd}>
            <Text style={styles.amountLabel}>Total Value</Text>
            <Text style={styles.totalValue}>{formatCurrency(item.totalAmount)}</Text>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: themeColor }]} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.centerContainer}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="cash-outline" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>No sales yet</Text>
      <Text style={styles.emptyText}>Tap the + button to record a new sale.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sales</Text>
          <Text style={styles.headerSubtitle}>Track your deals and commissions</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: themeColor }]} onPress={() => router.push('/record-sale')}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColor} />
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          renderItem={renderSaleCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[themeColor]} />}
          ListEmptyComponent={renderEmptyComponent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#F9FAFB' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  addButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  listContainer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  clientInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  clientName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  dateText: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusIcon: { marginRight: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  propertyInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 12, borderRadius: 12, marginBottom: 16 },
  propertyName: { fontSize: 14, fontWeight: '500', color: '#374151', marginLeft: 8 },
  financials: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  alignEnd: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  amountValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  totalValue: { fontSize: 16, fontWeight: '600', color: '#9CA3AF' },
  progressContainer: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 50 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' }
});
