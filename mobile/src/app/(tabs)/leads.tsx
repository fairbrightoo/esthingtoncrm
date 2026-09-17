import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Type definition for a Lead
interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
  createdAt: string;
}

// Fallback Mock Data while API is being configured
const MOCK_LEADS: Lead[] = [
  { id: '1', name: 'John Doe', email: 'john.doe@example.com', phone: '+1 234 567 8900', status: 'NEW', createdAt: '2026-09-16T10:00:00Z' },
  { id: '2', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '+1 987 654 3210', status: 'CONTACTED', createdAt: '2026-09-15T14:30:00Z' },
  { id: '3', name: 'Michael Johnson', email: 'mjohnson@example.com', phone: '+1 555 123 4567', status: 'QUALIFIED', createdAt: '2026-09-14T09:15:00Z' },
  { id: '4', name: 'Sarah Williams', email: 'swilliams@example.com', phone: '+1 444 987 6543', status: 'CONVERTED', createdAt: '2026-09-12T16:45:00Z' },
  { id: '5', name: 'David Brown', email: 'dbrown@example.com', phone: '+1 333 444 5555', status: 'LOST', createdAt: '2026-09-10T11:20:00Z' },
];

export default function LeadsScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLeads = async () => {
    try {
      // TODO: Replace with actual backend API call using process.env.EXPO_PUBLIC_API_URL
      // const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/leads`);
      // setLeads(response.data);
      
      // Simulating network delay for mock data
      await new Promise(resolve => setTimeout(resolve, 800));
      setLeads(MOCK_LEADS);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      // Fallback to mock data on error so UI remains functional
      setLeads(MOCK_LEADS);
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
      case 'NEW': return { bg: '#DBEAFE', text: '#1E40AF' }; // Blue
      case 'CONTACTED': return { bg: '#FEF3C7', text: '#92400E' }; // Yellow
      case 'QUALIFIED': return { bg: '#E0E7FF', text: '#3730A3' }; // Indigo
      case 'CONVERTED': return { bg: '#D1FAE5', text: '#065F46' }; // Green
      case 'LOST': return { bg: '#FEE2E2', text: '#991B1B' }; // Red
      default: return { bg: '#F3F4F6', text: '#374151' }; // Gray
    }
  };

  const renderLeadCard = ({ item }: { item: Lead }) => {
    const statusStyle = getStatusColor(item.status);
    
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color="#6B7280" style={styles.infoIcon} />
            <Text style={styles.infoText}>{item.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color="#6B7280" style={styles.infoIcon} />
            <Text style={styles.infoText}>{item.phone}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Leads Management</Text>
          <Text style={styles.headerSubtitle}>View and manage your prospects</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          renderItem={renderLeadCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#2563EB']} />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No leads found</Text>
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
    backgroundColor: '#F9FAFB', // Light gray background to match web app
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    backgroundColor: '#2563EB', // Primary Blue
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
});
