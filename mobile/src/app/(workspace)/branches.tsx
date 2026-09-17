import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/axios';

interface Branch {
  id: string;
  name: string;
  location: string;
}

export default function BranchesScreen() {
  const router = useRouter();
  const { companyId, companyName, companyColor } = useLocalSearchParams();
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const color = typeof companyColor === 'string' ? companyColor : '#2563EB';
  const name = typeof companyName === 'string' ? companyName : 'Selected Company';

  useEffect(() => {
    const fetchBranches = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await api.get(`/api/companies/${companyId}/branches`);
        setBranches(response.data);
      } catch (error) {
        console.error('Failed to fetch branches', error);
        Alert.alert('Error', 'Failed to load branches. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [companyId]);

  const handleBranchSelect = (branch: Branch) => {
    // Navigate to login with branch info
    router.push({
      pathname: '/(auth)/passcode',
      params: { 
        branchId: branch.id, 
        branchName: branch.name,
        companyId,
        companyName,
        companyColor: color
      }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.topHeader, { backgroundColor: color }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.contentHeader}>
          <Text style={styles.title}>Select Branch</Text>
          <Text style={styles.subtitle}>Choose your designated workspace</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={color} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.list}>
            {branches.length > 0 ? (
              branches.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => handleBranchSelect(branch)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                    <Ionicons name="location-outline" size={24} color={color} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{branch.name}</Text>
                    <Text style={styles.cardSubtitle}>{branch.location || 'Branch Office'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No branches found</Text>
                <Text style={styles.emptySubtitle}>There are no branches associated with this company yet.</Text>
              </View>
            )}
          </View>
        )}
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  contentHeader: {
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  list: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
});
