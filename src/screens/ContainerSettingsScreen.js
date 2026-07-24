import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export default function ContainerSettingsScreen({ route }) {
  const { containerId, containerName } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Impostazioni</Text>
      <Text style={styles.subtitle}>{containerName}</Text>
      
      <View style={styles.card}>
        <Text style={styles.text}>Questa pagina permetterà di visualizzare e modificare le impostazioni del container (es. Variabili d'Ambiente, Porte, Volumi).</Text>
        <Text style={[styles.text, { marginTop: 16 }]}>ID: {containerId}</Text>
        <Text style={[styles.text, { marginTop: 16, color: colors.primary, fontWeight: 'bold' }]}>Presto in arrivo!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  }
});
