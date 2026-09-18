import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

interface Lead {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
  createdAt: string;
}

export default function LeadsScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const router = useRouter();
  const { recentWorkspace } = useAuth();
  const themeColor = recentWorkspace?.companyColor || '#2563EB';

  const fetchLeads = async () => {
    try {
      // In a real app, you would pass pagination and branchId filters here
      const response = await api.get('/api/leads');
      setLeads(response.data.leads || response.data || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      // Fallback mock data if API fails to keep UI demo-able
      setLeads([
        { id: '1', fullName: 'John Doe', email: 'john.doe@example.com', phone: '+1 234 567 8900', status: 'NEW', createdAt: new Date().toISOString() },
        { id: '2', fullName: 'Jane Smith', email: 'jane.smith@example.com', phone: '+1 987 654 3210', status: 'CONTACTED', createdAt: new Date().toISOString() },
        { id: '3', fullName: 'Michael Johnson', email: 'mjohnson@example.com', phone: '+1 555 123 4567', status: 'QUALIFIED', createdAt: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchLeads();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' };
      case 'CONTACTED': return { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' };
      case 'QUALIFIED': return { bg: '#E0E7FF', text: '#3730A3', dot: '#6366F1' };
      case 'CONVERTED': return { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' };
      case 'LOST': return { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' };
      default: return { bg: '#F3F4F6', text: '#374151', dot: '#6B7280' };
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderLeadCard = ({ item }: { item: Lead }) => {
    const statusStyle = getStatusColor(item.status);
    
    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.7} 
          onPress={() => router.push(`/lead/${item.id}`)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.clientInfo}>
              <View style={[styles.avatar, { backgroundColor: `${themeColor}20` }]}>
                <Text style={[styles.avatarText, { color: themeColor }]}>
                  {item.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.clientName}>{item.fullName}</Text>
                <Text style={styles.dateText}>Added {new Date().toLocaleDateString()}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#DBEAFE' }]}>
              <Text style={[styles.statusText, { color: '#1D4ED8' }]}>{item.status || 'NEW'}</Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="mail" size={14} color="#6B7280" />
              </View>
              <Text style={styles.infoText}>{item.email || 'No email'}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="call" size={14} color="#6B7280" />
              </View>
              <Text style={styles.infoText}>{item.phone}</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="call-outline" size={18} color="#2563EB" />
              <Text style={[styles.actionBtnText, { color: '#2563EB' }]}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="logo-whatsapp" size={18} color="#10B981" />
              <Text style={[styles.actionBtnText, { color: '#10B981' }]}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="mail-outline" size={18} color="#6B7280" />
              <Text style={[styles.actionBtnText, { color: '#6B7280' }]}>Email</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Leads</Text>
          <Text style={styles.headerSubtitle}>Manage your prospects</Text>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: themeColor }]}
          onPress={() => router.push('/add-lead')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColor} />
        </View>
      ) : (
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.id}
          renderItem={renderLeadCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[themeColor]} />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No leads found</Text>
              <Text style={styles.emptyText}>Tap the + button to add a new lead.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  infoGrid: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIconBox: {
    width: 24,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
