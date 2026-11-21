
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../../src/constants/colors';

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Booking Details</Text>
      <Text style={styles.text}>Booking ID: {id}</Text>
      <Text style={styles.text}>
        Trip details and GPS tracking will be added here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  heading: {
    color: COLORS.primary,
    fontSize: 25,
    fontWeight: 'bold',
  },
  text: {
    color: COLORS.white,
    marginTop: 15,
    textAlign: 'center',
  },
});
