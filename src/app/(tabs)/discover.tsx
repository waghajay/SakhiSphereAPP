import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Discover Screen — Phase 1 placeholder. Phase 3: User discovery + matching. */
export default function DiscoverScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Discover</Text></View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>Discover people coming in Phase 3 🔍</Text>
        <Text style={styles.sub}>Find women with similar interests.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholder: { fontSize: 18, fontWeight: '600', color: '#374151' },
  sub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 },
});
