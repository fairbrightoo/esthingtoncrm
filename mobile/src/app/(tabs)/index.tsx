import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import api from '../../api/axios';

export default function DashboardScreen() {
  const { user, recentWorkspace, token } = useAuth();
  const router = useRouter();
  const themeColor = recentWorkspace?.companyColor || '#2563EB';

  const [dateFilter, setDateFilter] = useState('All Time');
  const [viewScope, setViewScope] = useState<'PERSONAL' | 'TEAM'>('PERSONAL');
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const isTeamLead = ['TEAM_LEAD', 'BDM', 'HEAD_BDD'].includes(user?.role || '');

  React.useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/api/analytics/stats?scope=${viewScope}`);
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [viewScope, dateFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const handleDateFilterPress = () => {
    Alert.alert('Select Date Range', 'Filter your sales metrics by date range', [
      { text: 'All Time', onPress: () => setDateFilter('All Time') },
      { text: 'This Month', onPress: () => setDateFilter('This Month') },
      { text: 'Last Month', onPress: () => setDateFilter('Last Month') },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const quickStats = [
    { label: 'My Prospects', value: stats ? ((stats.financial?.totalLeads || 0) - (stats.financial?.clientLeads || 0)).toString() : '...', icon: 'people', color: '#3B82F6' },
    { label: 'Converted', value: stats?.financial?.clientLeads?.toString() || '...', icon: 'trending-up', color: '#10B981' },
    { label: 'EsthCoins', value: stats?.financial?.esthCoinBalance?.toFixed(2) || '0.00', icon: 'diamond', color: '#F59E0B' },
  ];

  const quickActions = [
    { label: 'Add Lead', icon: 'person-add', color: '#EC4899', route: '/add-lead' },
    { label: 'Record Sale', icon: 'cash', color: '#10B981', route: '/record-sale' },
    { label: 'Share Link', icon: 'share-social', color: '#8B5CF6' },
    { label: 'My QR', icon: 'qr-code', color: '#3B82F6' },
  ];

  const handleActionPress = (route?: string) => {
    if (route) {
      router.push(route as any);
    } else {
      Alert.alert('Coming Soon', 'This feature will be enabled shortly.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Dynamic Gradient Header */}
        <LinearGradient
          colors={[themeColor, `${themeColor}E6`, `${themeColor}B3`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hello,</Text>
              <Text style={styles.name}>{user?.fullName?.split(' ')[0] || 'User'} 👋</Text>
              
              {/* Role Pill */}
              <View style={styles.rolePill}>
                <Text style={[styles.rolePillText, { color: themeColor }]}>
                  {user?.role?.replace('_', ' ') || 'Team Lead'}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={24} color="#FFF" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.workspaceTag}>
            <Ionicons name="business" size={14} color={themeColor} />
            <Text style={[styles.workspaceText, { color: themeColor }]}>
              {recentWorkspace?.companyName || 'Double King'} • {recentWorkspace?.branchName || 'Garki'}
            </Text>
          </View>
        </LinearGradient>

        {/* Workspace & Commissions Summary Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={{ flexDirection: 'row', gap: 6, paddingRight: 24, alignItems: 'center' }}>
            {isTeamLead && (
              <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 16, padding: 2 }}>
                <TouchableOpacity 
                  style={[styles.scopePill, viewScope === 'PERSONAL' && { backgroundColor: '#FFF' }]} 
                  onPress={() => setViewScope('PERSONAL')}
                >
                  <Text style={[styles.scopeText, viewScope === 'PERSONAL' && { color: themeColor }]}>Personal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.scopePill, viewScope === 'TEAM' && { backgroundColor: '#FFF' }]} 
                  onPress={() => setViewScope('TEAM')}
                >
                  <Text style={[styles.scopeText, viewScope === 'TEAM' && { color: themeColor }]}>Team</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.filterPill} onPress={handleDateFilterPress}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsContainer}>
          {quickStats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.iconBox, { backgroundColor: `${stat.color}15` }]}>
                <Ionicons name={stat.icon as any} size={22} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Financial Metrics Stack */}
        <View style={styles.financialSection}>
          <View style={styles.financialCard}>
            <View style={[styles.financeIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="trending-up" size={20} color="#059669" />
            </View>
            <View style={styles.financeDetails}>
              <Text style={styles.financeLabel}>Total Sales Generated</Text>
              <Text style={[styles.financeValue, { color: '#059669' }]}>
                {stats ? formatCurrency(stats.financial?.totalSalesGenerated || 0) : '...'}
              </Text>
            </View>
          </View>

          <View style={styles.financialCard}>
            <View style={[styles.financeIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="cash" size={20} color="#2563EB" />
            </View>
            <View style={styles.financeDetails}>
              <Text style={styles.financeLabel}>Paid Commissions</Text>
              <Text style={[styles.financeValue, { color: '#2563EB' }]}>
                {stats ? formatCurrency(stats.financial?.paidCommissions || 0) : '...'}
              </Text>
            </View>
          </View>

          <View style={styles.financialCard}>
            <View style={[styles.financeIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time" size={20} color="#D97706" />
            </View>
            <View style={styles.financeDetails}>
              <Text style={styles.financeLabel}>Pending Comms.</Text>
              <Text style={[styles.financeValue, { color: '#D97706' }]}>
                {stats ? formatCurrency(stats.financial?.pendingCommissions || 0) : '...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsScroll}>
            {quickActions.map((action, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.actionItem} 
                activeOpacity={0.7}
                onPress={() => handleActionPress(action.route)}
              >
                <View style={[styles.actionIconBox, { backgroundColor: `${action.color}10` }]}>
                  <Ionicons name={action.icon as any} size={26} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Pipeline & Activity */}
        <View style={styles.section}>
          <View style={[styles.sectionHeaderRow, { marginBottom: 16 }]}>
            <Text style={styles.sectionTitle}>Pipeline Activity</Text>
            <TouchableOpacity onPress={() => router.push('/leads')}>
              <Text style={[styles.seeAllText, { color: themeColor }]}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityCard}>
            {!stats || (stats.marketerData?.recentProspects?.length === 0 && stats.marketerData?.recentPayments?.length === 0) ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#9CA3AF' }}>No recent activity to display.</Text>
              </View>
            ) : (
              <>
                {stats.marketerData?.recentProspects?.slice(0, 3).map((lead: any, idx: number) => (
                  <View key={`lead-${lead.id}`} style={styles.activityRow}>
                    <View style={[styles.activityIcon, { backgroundColor: '#F3E8FF' }]}>
                      <Text style={{ fontWeight: 'bold', color: '#9333EA' }}>{lead.fullName.charAt(0)}</Text>
                    </View>
                    <View style={styles.activityDetails}>
                      <Text style={styles.activityTitle}>{lead.fullName}</Text>
                      <Text style={styles.activityTime}>{lead.phone || 'No phone'} • Added {new Date(lead.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <TouchableOpacity>
                      <Text style={{ color: themeColor, fontWeight: '600', fontSize: 12 }}>Message {`>`}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                
                {stats.marketerData?.recentPayments?.slice(0, 3).map((payment: any, idx: number) => (
                  <View key={`pay-${payment.id}`} style={[styles.activityRow, { marginTop: idx === 0 && stats.marketerData?.recentProspects?.length > 0 ? 16 : 0, borderTopWidth: idx === 0 && stats.marketerData?.recentProspects?.length > 0 ? 1 : 0, borderTopColor: '#F3F4F6', paddingTop: idx === 0 && stats.marketerData?.recentProspects?.length > 0 ? 16 : 0 }]}>
                    <View style={[styles.activityIcon, { backgroundColor: '#D1FAE5' }]}>
                      <Ionicons name="cash" size={18} color="#059669" />
                    </View>
                    <View style={styles.activityDetails}>
                      <Text style={styles.activityTitle}>{payment.clientName}</Text>
                      <Text style={styles.activityTime}>{payment.product}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#059669', fontWeight: 'bold' }}>+{formatCurrency(payment.amount)}</Text>
                      <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{new Date(payment.date).toLocaleDateString()}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : 30,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 2,
    marginBottom: 8,
  },
  rolePill: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 10,
    height: 10,
    backgroundColor: '#EF4444',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  workspaceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  workspaceText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    paddingHorizontal: 24,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    width: '31%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  financialSection: {
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 12,
  },
  financialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  financeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  financeDetails: {
    flex: 1,
  },
  financeLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  financeValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  section: {
    marginTop: 32,
  },
  seeAllText: {
    fontWeight: '600',
    fontSize: 14,
  },
  actionsScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  actionItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 80,
  },
  actionIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  scopePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  scopeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
});
