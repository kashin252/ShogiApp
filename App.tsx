import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { GameScreen } from './src/screens/GameScreen';
import { colors } from './src/styles/colors';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent={false} />
      <GameScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});