import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const navigationItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
] as const;

type SidebarProps = {
  onNavigate: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={styles.sidebar}>
      <Text style={styles.brand}>Kaizen</Text>
      <View style={styles.navigation}>
        {navigationItems.map((item) => (
          <Pressable
            accessibilityRole="link"
            key={item.href}
            onPress={() => {
              router.navigate(item.href);
              onNavigate();
            }}
            style={[styles.link, pathname === item.href && styles.activeLink]}
          >
            <Text style={[styles.linkText, pathname === item.href && styles.activeLinkText]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { backgroundColor: '#11231E', flex: 1, padding: 24 },
  brand: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  navigation: { gap: 8, marginTop: 32 },
  link: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  linkText: { color: '#C0CEC8', fontSize: 15, fontWeight: '600' },
  activeLink: { backgroundColor: '#1F3A32' },
  activeLinkText: { color: '#D4FA66' },
});
