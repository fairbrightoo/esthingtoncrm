import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ActivityLogTab({ leadId, themeColor }: { leadId: string, themeColor: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Activity log coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: '#9CA3AF', fontSize: 14 }
});
