
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

import {
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';

import { useLocalSearchParams, router } from 'expo-router';
import { useDriverLocation } from '../../../src/hooks/useDriverLocation';
import { db } from '../../../src/services/firebase/config';
import { useAuth } from '../../../src/context/AuthContext';
import { DriverBooking } from '../../../src/types/booking';
import { COLORS } from '../../../src/constants/colors';

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { driver } = useAuth();

  const {
    tracking,
    error: gpsError,
    startTracking,
    stopTracking,
  } = useDriverLocation();

  const [booking, setBooking] = useState<DriverBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

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

  const updateTripStatus = async (
    status: 'arrived' | 'in_progress'
  ) => {
    if (!id || updating) return;

    try {
      setUpdating(true);

      await updateDoc(doc(db, 'bookings', id), {
        driverStatus: status,
        ...(status === 'arrived'
          ? { driverArrivedAt: serverTimestamp() }
          : { tripStartedAt: serverTimestamp() }),
      });

      Alert.alert(
        'Success',
        status === 'arrived'
          ? 'Pickup location marked as reached.'
          : 'Trip has started.'
      );
    } catch (err) {
      Alert.alert('Error', 'Unable to update trip status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteTrip = () => {
    if (!id || updating) return;

    Alert.alert(
      'Complete Trip',
      'Are you sure you want to mark this trip as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              setUpdating(true);

              await updateDoc(doc(db, 'bookings', id), {
                driverStatus: 'completed',
                tripCompletedAt: serverTimestamp(),
              });

              await stopTracking();

              Alert.alert(
                'Trip Completed',
                'Trip completed and GPS sharing stopped.',
                [
                  {
                    text: 'OK',
                    onPress: () =>
                      router.replace('/(driver)/bookings'),
                  },
                ]
              );
            } catch (err) {
              Alert.alert(
                'Error',
                'Unable to complete the trip.'
              );
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleStartTracking = async () => {
    try {
      await startTracking(id);
      Alert.alert(
        'GPS Active',
        'Your live location is now being shared.'
      );
    } catch (err: any) {
      Alert.alert(
        'GPS Error',
        err?.message || 'Unable to start GPS tracking.'
      );
    }
  };

  const callCustomer = async () => {
    if (!booking?.userPhone) {
      Alert.alert(
        'Unavailable',
        'Customer phone number is not available.'
      );
      return;
    }

    try {
      await Linking.openURL(`tel:${booking.userPhone}`);
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
        <Text style={styles.error}>
          {error || 'Booking unavailable.'}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tripStatus = booking.driverStatus || 'assigned';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← BACK TO BOOKINGS</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Trip Details</Text>
      <Text style={styles.subtitle}>
        Booking #{booking.id.slice(0, 8)}
      </Text>

      <View style={styles.statusCard}>
        <Text style={styles.label}>TRIP STATUS</Text>
        <Text style={styles.status}>
          {tripStatus.replace('_', ' ').toUpperCase()}
        </Text>
        <Text style={styles.small}>
          Admin booking status: {booking.status}
        </Text>
      </View>

      {/* TRIP WORKFLOW */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>TRIP ACTIONS</Text>

        {tripStatus === 'assigned' && (
          <TouchableOpacity
            style={styles.actionButton}
            disabled={updating}
            onPress={() => updateTripStatus('arrived')}
          >
            <Text style={styles.actionText}>
              {updating ? 'UPDATING...' : 'MARK ARRIVED AT PICKUP'}
            </Text>
          </TouchableOpacity>
        )}

        {tripStatus === 'arrived' && (
          <TouchableOpacity
            style={styles.actionButton}
            disabled={updating}
            onPress={() => updateTripStatus('in_progress')}
          >
            <Text style={styles.actionText}>
              {updating ? 'UPDATING...' : 'START TRIP'}
            </Text>
          </TouchableOpacity>
        )}

        {tripStatus === 'in_progress' && (
          <TouchableOpacity
            style={styles.completeButton}
            disabled={updating}
            onPress={handleCompleteTrip}
          >
            <Text style={styles.completeText}>
              {updating ? 'COMPLETING...' : 'COMPLETE TRIP'}
            </Text>
          </TouchableOpacity>
        )}

        {tripStatus === 'completed' && (
          <Text style={styles.completedText}>
            ✓ This trip has been completed.
          </Text>
        )}
      </View>

      {/* GPS TRACKING */}
      {(tripStatus === 'arrived' ||
        tripStatus === 'in_progress') && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            LIVE GPS TRACKING
          </Text>

          <Text style={styles.value}>
            {tracking
              ? '🟢 Location sharing is active'
              : '⚪ Location sharing is off'}
          </Text>

          {gpsError ? (
            <Text style={styles.error}>{gpsError}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleStartTracking}
            disabled={tracking}
          >
            <Text style={styles.actionText}>
              {tracking ? 'GPS IS ACTIVE' : 'START GPS SHARING'}
            </Text>
          </TouchableOpacity>

          {tracking && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={stopTracking}
            >
              <Text style={styles.actionText}>
                STOP GPS SHARING
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* CUSTOMER */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>CUSTOMER DETAILS</Text>
        <Text style={styles.value}>
          {booking.userName || 'Customer'}
        </Text>
        <Text style={styles.muted}>
          {booking.userPhone || 'Phone not available'}
        </Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={callCustomer}
        >
          <Text style={styles.actionText}>☎ CALL CUSTOMER</Text>
        </TouchableOpacity>
      </View>

      {/* VEHICLE */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>
        <Text style={styles.value}>
          {booking.carMake} {booking.carModel}
        </Text>
        <Text style={styles.muted}>Chauffeur booking</Text>
      </View>

      {/* JOURNEY */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>JOURNEY DETAILS</Text>

        <Text style={styles.label}>PICKUP LOCATION</Text>
        <Text style={styles.value}>
          {booking.pickupLocation}
        </Text>

        <View style={styles.separator} />

        <Text style={styles.label}>DROP LOCATION</Text>
        <Text style={styles.value}>
          {booking.dropLocation || 'Not specified'}
        </Text>
      </View>

      {/* AMOUNT */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>BOOKING AMOUNT</Text>
        <Text style={styles.price}>
          ₹{booking.finalPrice ?? booking.estimatedPrice ?? 'TBD'}
        </Text>
      </View>
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
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  actionText: {
    color: COLORS.background,
    fontWeight: '900',
  },
  completeButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  completeText: {
    color: COLORS.success,
    fontWeight: '900',
  },
  completedText: {
    color: COLORS.success,
    fontWeight: '800',
  },
  error: {
    color: COLORS.danger,
    textAlign: 'center',
    marginVertical: 10,
  },
});
