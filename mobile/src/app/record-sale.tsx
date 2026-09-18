import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function RecordSaleScreen() {
  const router = useRouter();
  const { recentWorkspace } = useAuth();
  const themeColor = recentWorkspace?.companyColor || '#10B981';

  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await api.get('/api/leads');
      setLeads(res.data);
    } catch (error) {
      console.error('Failed to fetch leads', error);
      // Fallback
      setLeads([
        { id: '1', fullName: 'Sarah Williams', phone: '08012345678', email: 'sarah@example.com' },
        { id: '2', fullName: 'Donald Nwachukwu', phone: '07061942369', email: 'donald@example.com' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.phone?.includes(searchQuery)
  );

  const renderLeadCard = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/lead/${item.id}?tab=Sales`)}
    >
      <View style={[styles.avatar, { backgroundColor: `${themeColor}20` }]}>
        <Ionicons name="person" size={20} color={themeColor} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.leadName}>{item.fullName}</Text>
        <Text style={styles.leadPhone}>{item.phone}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Lead</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <Text style={styles.subtitle}>Who are you recording a sale for?</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={themeColor} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredLeads}
          keyExtractor={item => item.id}
          renderItem={renderLeadCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No leads found matching your search.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 24, marginTop: 24, marginBottom: 16, paddingHorizontal: 16, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#1F2937' },
  subtitle: { paddingHorizontal: 24, fontSize: 14, color: '#6B7280', marginBottom: 16 },
  listContainer: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardInfo: { flex: 1 },
  leadName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  leadPhone: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 12, color: '#6B7280', fontSize: 14 }
});
