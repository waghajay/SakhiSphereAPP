import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Home Screen — Social feed.
 * Phase 1: Placeholder only.
 * Phase 3: Will show real posts from the feed API.
 */
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🌸 SakhiSphere</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>Feed coming soon in Phase 3 ✨</Text>
        <Text style={styles.sub}>You'll see posts from your community here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logo: { fontSize: 20, fontWeight: '700', color: '#7C3AED' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholder: { fontSize: 18, fontWeight: '600', color: '#374151' },
  sub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 },
});
