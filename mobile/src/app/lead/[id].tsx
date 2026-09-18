import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import BiodataTab from '../../components/lead/BiodataTab';
import ActivityLogTab from '../../components/lead/ActivityLogTab';
import TasksTab from '../../components/lead/TasksTab';
import SalesPaymentsTab from '../../components/lead/SalesPaymentsTab';

export default function LeadDetailsScreen() {
  const { id, tab } = useLocalSearchParams();
  const router = useRouter();
  const { recentWorkspace } = useAuth();
  const themeColor = recentWorkspace?.companyColor || '#10B981';

  const [lead, setLead] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>((tab as string) || 'Sales');

  const tabs = ['Sales', 'Biodata', 'Activity Log', 'Tasks'];

  const fetchLeadDetails = async () => {
    try {
      // Assuming a get lead details endpoint exists (or list and filter)
      const res = await api.get(`/api/leads/${id}`);
      setLead(res.data);
    } catch (error) {
      console.error('Failed to fetch lead details:', error);
      // Fallback mock if endpoint fails
      setLead({
        id,
        fullName: 'Loading Client...',
        phone: '08000000000',
        email: 'client@example.com',
        status: 'NEW',
        source: 'Mobile App',
        gender: 'UNKNOWN',
        interest: ''
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchLeadDetails();
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top']}>
        <ActivityIndicator size="large" color={themeColor} />
      </SafeAreaView>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'Biodata':
        return <BiodataTab lead={lead} themeColor={themeColor} />;
      case 'Activity Log':
        return <ActivityLogTab leadId={id as string} themeColor={themeColor} />;
      case 'Tasks':
        return <TasksTab leadId={id as string} themeColor={themeColor} />;
      case 'Sales':
      default:
        return <SalesPaymentsTab leadId={id as string} themeColor={themeColor} onUpdate={fetchLeadDetails} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lead Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: `${themeColor}20` }]}>
            <Text style={[styles.avatarText, { color: themeColor }]}>
              {lead?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.leadName}>{lead?.fullName}</Text>
          <Text style={styles.leadPhone}>{lead?.phone}</Text>
          <View style={[styles.statusBadge, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.statusText, { color: '#1D4ED8' }]}>{lead?.status}</Text>
          </View>
        </View>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionBtn}>
            <Ionicons name="call" size={20} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="logo-whatsapp" size={20} color="#15803D" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t && { borderBottomColor: themeColor }]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, activeTab === t && { color: themeColor, fontWeight: '700' }]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {renderActiveTab()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  leadPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabScroll: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  contentContainer: {
    flex: 1,
  }
});
