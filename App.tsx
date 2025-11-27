import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { GameScreen } from './src/screens/GameScreen';
import { colors } from './src/styles/colors';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <GameScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});