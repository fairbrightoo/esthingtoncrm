import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import api from '../../api/axios';

export default function TeamScreen() {
  const { token, recentWorkspace } = useAuth();
  const router = useRouter();
  const themeColor = recentWorkspace?.companyColor || '#2563EB';

  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pulse Modal State
  const [pulseUser, setPulseUser] = useState<any>(null);
  const [pulseData, setPulseData] = useState<any>(null);
  const [pulseLoading, setPulseLoading] = useState(false);

  useEffect(() => {
    const fetchTeamData = async () => {
      setIsLoading(true);
      try {
        const teamRes = await api.get('/api/teams');
        const myTeam = teamRes.data[0];
        setTeam(myTeam);

        if (myTeam) {
          const membersRes = await api.get(`/api/teams/${myTeam.id}/members`);
          setMembers(membersRes.data);
        }
      } catch (error) {
        console.error("Failed to fetch team data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeamData();
  }, [token]);

  const handleViewPulse = async (member: any) => {
    setPulseUser(member);
    setPulseLoading(true);
    try {
      const res = await api.get(`/api/teams/pulse/${member.id}`);
      setPulseData(res.data);
    } catch (error) {
      console.error("Failed to fetch pulse", error);
    } finally {
      setPulseLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const renderMember = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.memberCard} 
      activeOpacity={0.7}
      onPress={() => handleViewPulse(item)}
    >
      <View style={styles.memberHeader}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.fullName.charAt(0)}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.fullName}</Text>
          <Text style={styles.memberRole}>{item.role.replace('_', ' ')}</Text>
        </View>
        <TouchableOpacity style={styles.pulseBtn} onPress={() => handleViewPulse(item)}>
          <Ionicons name="pulse" size={16} color={themeColor} />
          <Text style={[styles.pulseBtnText, { color: themeColor }]}>Pulse</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.memberStats}>
        <View style={styles.statBox}>
          <Text style={styles.statBoxLabel}>Monthly Sales</Text>
          <Text style={styles.statBoxValue}>{formatCurrency(item.monthlySales || 0)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statBoxLabel}>Pipeline (L/C)</Text>
          <Text style={[styles.statBoxValue, { color: '#4B5563' }]}>
            {item.leadsGenerated} / <Text style={{ color: themeColor }}>{item.clientsConverted}</Text>
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statBoxLabel}>Conv. Rate</Text>
          <Text style={[styles.statBoxValue, { color: item.conversionRate > 20 ? '#059669' : '#D97706' }]}>
            {item.conversionRate}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="people-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Team Assigned</Text>
        <Text style={styles.emptyDesc}>You have not been assigned to lead a team yet.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{team.name}</Text>
          <Text style={styles.headerSubtitle}>
            <Ionicons name="people" size={12} /> {members.length} Members
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.commsFab, { backgroundColor: themeColor }]}
          onPress={() => router.push('/team-comms')}
        >
          <Ionicons name="chatbubbles" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.centerList}>
            <Text style={{ color: '#9CA3AF' }}>No members in this team.</Text>
          </View>
        }
      />

      {/* Daily Pulse Modal */}
      <Modal visible={!!pulseUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  <Ionicons name="pulse" size={18} color={themeColor} /> {pulseUser?.fullName}'s Daily Pulse
                </Text>
                <Text style={styles.modalSubtitle}>Live activity tracking for today</Text>
              </View>
              <TouchableOpacity onPress={() => setPulseUser(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {pulseLoading ? (
                <ActivityIndicator size="large" color={themeColor} style={{ marginTop: 40 }} />
              ) : pulseData ? (
                <View style={styles.pulseDataContainer}>
                  <View style={styles.pulseGrid}>
                    <View style={styles.pulseBox}>
                      <Text style={styles.pulseBoxLabel}>Leads Gen.</Text>
                      <Text style={styles.pulseBoxValue}>{pulseData.metrics?.leadsGeneratedToday || 0}</Text>
                    </View>
                    <View style={styles.pulseBox}>
                      <Text style={styles.pulseBoxLabel}>Follow-ups</Text>
                      <Text style={styles.pulseBoxValue}>{pulseData.metrics?.followUpsCompletedToday || 0}</Text>
                    </View>
                    <View style={styles.pulseBox}>
                      <Text style={styles.pulseBoxLabel}>Inspections</Text>
                      <Text style={styles.pulseBoxValue}>{pulseData.metrics?.inspectionsToday || 0}</Text>
                    </View>
                  </View>

                  <View style={[styles.healthCard, { borderColor: `${themeColor}20`, backgroundColor: `${themeColor}05` }]}>
                    <Text style={[styles.healthTitle, { color: themeColor }]}>Pipeline Health</Text>
                    <View style={styles.healthStats}>
                      <View style={styles.healthStat}>
                        <Text style={[styles.healthStatLabel, { color: themeColor }]}>ACTIVE</Text>
                        <Text style={styles.healthStatValue}>{pulseData.health?.activeLeads || 0}</Text>
                      </View>
                      <View style={styles.healthStat}>
                        <Text style={[styles.healthStatLabel, { color: themeColor }]}>COLD</Text>
                        <Text style={styles.healthStatValue}>{pulseData.health?.coldLeads || 0}</Text>
                      </View>
                      <View style={styles.healthStat}>
                        <Text style={[styles.healthStatLabel, { color: themeColor }]}>SCORE</Text>
                        <Text style={[styles.healthStatValue, { 
                          color: pulseData.health?.pipelineHealthScore >= 70 ? '#059669' : 
                                 pulseData.health?.pipelineHealthScore >= 40 ? '#D97706' : '#DC2626'
                        }]}>
                          {pulseData.health?.pipelineHealthScore || 0}%
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={{ textAlign: 'center', marginTop: 40, color: '#9CA3AF' }}>Could not load pulse data.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { justifyContent: 'center', alignItems: 'center' },
  centerList: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#374151', marginTop: 16 },
  emptyDesc: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  commsFab: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  
  listContainer: { padding: 16, gap: 12, paddingBottom: 100 },
  memberCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 2,
  },
  memberHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#2563EB' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
  memberRole: { fontSize: 12, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
  pulseBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  pulseBtnText: { fontSize: 12, fontWeight: '600' },
  
  memberStats: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  statBoxLabel: { fontSize: 10, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 },
  statBoxValue: { fontSize: 13, fontWeight: 'bold', color: '#1F2937' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#F9FAFB', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  modalSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  closeBtn: { padding: 4 },
  modalScroll: { padding: 20 },
  
  pulseDataContainer: { gap: 20 },
  pulseGrid: { flexDirection: 'row', gap: 12 },
  pulseBox: { flex: 1, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 16, padding: 16, alignItems: 'center' },
  pulseBoxLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500', marginBottom: 6 },
  pulseBoxValue: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  
  healthCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  healthTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase' },
  healthStats: { flexDirection: 'row', justifyContent: 'space-between' },
  healthStat: { alignItems: 'center' },
  healthStatLabel: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  healthStatValue: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
});
