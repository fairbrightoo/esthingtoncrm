import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  
  // Notification Toggles State
  const [salesNotifs, setSalesNotifs] = useState(true);
  const [leadsNotifs, setLeadsNotifs] = useState(true);
  const [announcementsNotifs, setAnnouncementsNotifs] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0) : 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name || 'Demo User'}</Text>
            <Text style={styles.role}>{user?.role || 'MARKETER'}</Text>
            <Text style={styles.email}>{user?.email || 'user@esthington.com'}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Total Sales</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>₦ 24M</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
        </View>

        {/* Settings Section */}
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.settingsGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="notifications-outline" size={20} color="#4B5563" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>New Sales Approvals</Text>
              <Text style={styles.settingSubtitle}>Get notified when an MD approves</Text>
            </View>
            <Switch 
              value={salesNotifs} 
              onValueChange={setSalesNotifs}
              trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
              thumbColor={salesNotifs ? '#2563EB' : '#F3F4F6'}
            />
          </View>
          
          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="people-outline" size={20} color="#4B5563" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Lead Assignments</Text>
              <Text style={styles.settingSubtitle}>When new leads arrive</Text>
            </View>
            <Switch 
              value={leadsNotifs} 
              onValueChange={setLeadsNotifs}
              trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
              thumbColor={leadsNotifs ? '#2563EB' : '#F3F4F6'}
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="megaphone-outline" size={20} color="#4B5563" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Company Announcements</Text>
              <Text style={styles.settingSubtitle}>Global HR updates</Text>
            </View>
            <Switch 
              value={announcementsNotifs} 
              onValueChange={setAnnouncementsNotifs}
              trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
              thumbColor={announcementsNotifs ? '#2563EB' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Security Section */}
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.actionRow}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="finger-print-outline" size={20} color="#4B5563" />
            </View>
            <Text style={styles.actionTitle}>Set up Biometric Login</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.actionRow}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#4B5563" />
            </View>
            <Text style={styles.actionTitle}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out Securely</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>Esthington CRM Mobile v1.0.0</Text>
      </ScrollView>
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
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563EB',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  role: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
    overflow: 'hidden',
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  actionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 64, // Align with text
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: { 
    color: '#DC2626', 
    fontWeight: '600', 
    fontSize: 16 
  },
  versionText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 24,
  }
});
