
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/constants/colors';

export default function DashboardScreen() {
  const { driver, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>NOIDADRIVE</Text>

      <Text style={styles.heading}>Driver Dashboard</Text>

      <Text style={styles.welcome}>
        Welcome, {driver?.name || 'Driver'}!
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>ACCOUNT STATUS</Text>
        <Text style={styles.status}>✓ APPROVED</Text>

        <Text style={styles.label}>AVAILABILITY</Text>
        <Text style={styles.value}>{driver?.availability}</Text>

        <Text style={styles.label}>PHONE</Text>
        <Text style={styles.value}>{driver?.phone || 'Not available'}</Text>
      </View>

      <Text style={styles.comingSoon}>
        Your assigned bookings will appear here.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>LOG OUT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    justifyContent: 'center',
  },
  logo: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heading: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 32,
  },
  welcome: {
    color: COLORS.textSecondary,
    marginTop: 8,
    fontSize: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 16,
  },
  status: {
    color: COLORS.success,
    fontWeight: '800',
    fontSize: 17,
    marginTop: 5,
  },
  value: {
    color: COLORS.white,
    fontSize: 15,
    marginTop: 5,
  },
  comingSoon: {
    color: COLORS.textSecondary,
    marginTop: 28,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: '800',
  },
});
