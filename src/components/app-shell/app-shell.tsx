import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sidebar } from '@/components/sidebar';

export function AppShell({ children }: PropsWithChildren) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <View style={styles.layout}>
      <View style={styles.mainContent}>{children}</View>
      <Pressable
        accessibilityLabel="Open navigation menu"
        accessibilityRole="button"
        onPress={() => setIsDrawerOpen(true)}
        style={styles.menuButton}
      >
        <Text style={styles.menuButtonText}>Menu</Text>
      </Pressable>
      {isDrawerOpen && (
        <View style={styles.drawerLayer}>
          <Pressable
            accessibilityLabel="Close navigation menu"
            accessibilityRole="button"
            onPress={() => setIsDrawerOpen(false)}
            style={styles.backdrop}
          />
          <View style={styles.drawer}>
            <Sidebar onNavigate={() => setIsDrawerOpen(false)} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1 },
  mainContent: { flex: 1 },
  menuButton: { backgroundColor: '#11231E', borderRadius: 8, left: 16, paddingHorizontal: 14, paddingVertical: 10, position: 'absolute', top: 16 },
  menuButtonText: { color: '#D4FA66', fontWeight: '700' },
  drawerLayer: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.35)', flex: 1 },
  drawer: { bottom: 0, left: 0, position: 'absolute', top: 0, width: 280 },
});
