import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/axios';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2; // 2 columns with 20px padding on sides and 20px gap

interface Company {
  id: string;
  name: string;
  themeColor: string;
}

export default function CompaniesScreen() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await api.get('/api/companies/with-branches');
        setCompanies(response.data);
      } catch (error) {
        console.error('Failed to fetch companies', error);
        Alert.alert('Error', 'Failed to load companies. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const handleCompanySelect = (company: Company) => {
    // Navigate to branches selection with the company ID
    router.push({
      pathname: '/(workspace)/branches',
      params: { companyId: company.id, companyName: company.name, companyColor: company.themeColor }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Esthington Group OS</Text>
          <Text style={styles.subtitle}>Enterprise Real Estate Operating System</Text>
          <Text style={styles.instruction}>Select your organization to initialize the workspace</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {companies.map((company) => (
              <TouchableOpacity
                key={company.id}
                style={[styles.card, { borderTopColor: company.themeColor || '#2563EB' }]}
                activeOpacity={0.7}
                onPress={() => handleCompanySelect(company)}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="business-outline" size={24} color="#4B5563" />
                </View>
                <Text style={styles.cardText} numberOfLines={2} adjustsFontSizeToFit>
                  {company.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerLink}>
            <Text style={styles.footerText}>Super Admin Login</Text>
          </TouchableOpacity>
          <View style={styles.footerDivider} />
          <TouchableOpacity style={styles.footerLink}>
            <Text style={[styles.footerText, { color: '#2563EB' }]}>Global Chairman Login</Text>
          </TouchableOpacity>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Light gray background like web
  },
  container: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827', // Very dark blue/black
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginTop: 8,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  card: {
    width: cardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    minHeight: 140,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
  },
  footerLink: {
    padding: 8,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  footerDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 12,
  },
});
