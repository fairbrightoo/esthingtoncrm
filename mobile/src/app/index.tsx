import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootScreen() {
  // The AuthContext handles routing users away from this root screen
  // depending on their token and recentWorkspace state.
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
