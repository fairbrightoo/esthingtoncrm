import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const { user, recentWorkspace, logout, clearRecentWorkspace } = useAuth();
  const themeColor = recentWorkspace?.companyColor || '#2563EB';

  const isTeamLeadOrAbove = ['TEAM_LEAD', 'BDM', 'HEAD_BDD', 'BRANCH_ADMIN', 'MANAGING_DIRECTOR', 'GROUP_MANAGING_DIRECTOR'].includes(user?.role || '');

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleSwitchWorkspace = () => {
    Alert.alert(
      'Switch Workspace',
      'This will clear your recent workspace memory and take you back to the company selection screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: clearRecentWorkspace },
      ]
    );
  };

  const SettingsMenuItem = ({ icon, label, onPress, color = '#4B5563', showArrow = true }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      {showArrow && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Profile Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[themeColor, `${themeColor}CC`]}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </LinearGradient>
          <Text style={styles.userName}>{user?.fullName || 'User Name'}</Text>
          <Text style={styles.userRole}>{user?.role?.replace('_', ' ') || 'Staff Member'}</Text>
        </View>

        {/* Identity & Workspace Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Current Workspace</Text>
          
          <View style={styles.workspaceInfo}>
            <View style={styles.workspaceIcon}>
              <Ionicons name="business" size={24} color={themeColor} />
            </View>
            <View style={styles.workspaceDetails}>
              <Text style={styles.companyName}>{recentWorkspace?.companyName || 'Esthington CRM'}</Text>
              <Text style={styles.branchName}>{recentWorkspace?.branchName || 'Head Office'}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.outlineBtn} onPress={handleSwitchWorkspace}>
            <Ionicons name="swap-horizontal" size={16} color={themeColor} />
            <Text style={[styles.outlineBtnText, { color: themeColor }]}>Switch Workspace</Text>
          </TouchableOpacity>
        </View>

        {isTeamLeadOrAbove && (
          <View style={styles.menuGroup}>
            <Text style={[styles.cardSectionTitle, { marginLeft: 20, marginTop: 16 }]}>Resources & Management</Text>
            <SettingsMenuItem icon="megaphone-outline" label="Campaigns" onPress={() => Alert.alert('Coming Soon', 'This feature will be available in the next phase.')} color="#8B5CF6" />
            <View style={styles.divider} />
            <SettingsMenuItem icon="document-text-outline" label="Scripts" onPress={() => Alert.alert('Coming Soon', 'This feature will be available in the next phase.')} color="#3B82F6" />
            <View style={styles.divider} />
            <SettingsMenuItem icon="reader-outline" label="Memos" onPress={() => Alert.alert('Coming Soon', 'This feature will be available in the next phase.')} color="#F59E0B" />
            <View style={styles.divider} />
            <SettingsMenuItem icon="people-outline" label="My HR Desk" onPress={() => Alert.alert('Coming Soon', 'This feature will be available in the next phase.')} color="#10B981" />
            <View style={styles.divider} />
            <SettingsMenuItem icon="library-outline" label="Company Policies" onPress={() => Alert.alert('Coming Soon', 'This feature will be available in the next phase.')} color="#6366F1" />
          </View>
        )}

        {/* Action Menus */}
        <View style={styles.menuGroup}>
          <SettingsMenuItem icon="person-outline" label="Edit Profile" />
          <View style={styles.divider} />
          <SettingsMenuItem icon="shield-checkmark-outline" label="Security & Password" />
          <View style={styles.divider} />
          <SettingsMenuItem icon="notifications-outline" label="Notifications" />
        </View>

        <View style={styles.menuGroup}>
          <SettingsMenuItem icon="headset-outline" label="Help & Support" />
          <View style={styles.divider} />
          <SettingsMenuItem icon="document-text-outline" label="Terms of Service" />
        </View>

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  userRole: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  workspaceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  workspaceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  workspaceDetails: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  branchName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    gap: 8,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuGroup: {
    backgroundColor: '#FFF',
    marginHorizontal: 24,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 68,
    marginRight: 16,
  },
  logoutContainer: {
    marginHorizontal: 24,
    marginBottom: 40,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
