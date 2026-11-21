
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';

import { useLocalSearchParams, router } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';

import { db } from '../../../src/services/firebase/config';
import { useAuth } from '../../../src/context/AuthContext';
import { DriverBooking } from '../../../src/types/booking';
import { COLORS } from '../../../src/constants/colors';

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { driver } = useAuth();

  const [booking, setBooking] = useState<DriverBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !driver?.uid) return;

    const unsubscribe = onSnapshot(
      doc(db, 'bookings', id),
      (snapshot) => {
        if (!snapshot.exists()) {
          setError('Booking not found.');
          setBooking(null);
          setLoading(false);
          return;
        }

        const data = {
          id: snapshot.id,
          ...snapshot.data(),
        } as DriverBooking;

        if (
          data.driverId !== driver.uid ||
          data.rentalType !== 'chauffeur'
        ) {
          setError('You are not authorized to view this booking.');
          setBooking(null);
        } else {
          setBooking(data);
          setError('');
        }

        setLoading(false);
      },
      () => {
        setError('Unable to load booking. Check your connection.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [id, driver?.uid]);

  const callCustomer = async () => {
    if (!booking?.userPhone) {
      Alert.alert('Unavailable', 'Customer phone number is not available.');
      return;
    }

    const phoneUrl = `tel:${booking.userPhone}`;

    try {
      await Linking.openURL(phoneUrl);
    } catch {
      Alert.alert('Error', 'Unable to open the phone dialer.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || 'Booking unavailable.'}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← BACK TO BOOKINGS</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Trip Details</Text>
      <Text style={styles.subtitle}>Booking #{booking.id.slice(0, 8)}</Text>

      <View style={styles.statusCard}>
        <Text style={styles.label}>TRIP STATUS</Text>
        <Text style={styles.status}>
          {(booking.driverStatus || 'assigned').replace('_', ' ').toUpperCase()}
        </Text>
        <Text style={styles.small}>
          Admin booking status: {booking.status}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>CUSTOMER DETAILS</Text>
        <Text style={styles.value}>{booking.userName || 'Customer'}</Text>
        <Text style={styles.muted}>
          {booking.userPhone || 'Phone not available'}
        </Text>

        <TouchableOpacity style={styles.callButton} onPress={callCustomer}>
          <Text style={styles.callText}>☎  CALL CUSTOMER</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>
        <Text style={styles.value}>
          {booking.carMake} {booking.carModel}
        </Text>
        <Text style={styles.muted}>Chauffeur booking</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>JOURNEY DETAILS</Text>

        <Text style={styles.label}>PICKUP LOCATION</Text>
        <Text style={styles.value}>{booking.pickupLocation}</Text>

        <View style={styles.separator} />

        <Text style={styles.label}>DROP LOCATION</Text>
        <Text style={styles.value}>
          {booking.dropLocation || 'Not specified'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>BOOKING AMOUNT</Text>
        <Text style={styles.price}>
          ₹{booking.finalPrice ?? booking.estimatedPrice ?? 'TBD'}
        </Text>
      </View>

      <Text style={styles.notice}>
        GPS tracking and trip controls will be connected in the next step.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 22,
    paddingTop: 60,
    paddingBottom: 45,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  heading: {
    color: COLORS.white,
    fontSize: 29,
    fontWeight: '900',
    marginTop: 25,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: 7,
    marginBottom: 22,
  },
  back: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  statusCard: {
    backgroundColor: COLORS.surfaceLight,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  status: {
    color: COLORS.success,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },
  small: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 15,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 12,
    marginBottom: 15,
    letterSpacing: 1,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 10,
  },
  value: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  muted: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 15,
  },
  price: {
    color: COLORS.success,
    fontSize: 25,
    fontWeight: '900',
  },
  callButton: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  callText: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  notice: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  error: {
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 20,
  },
});
