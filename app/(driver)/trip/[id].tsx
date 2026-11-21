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

  // Listen for booking updates from Firestore.
  useEffect(() => {
    if (!id || !driver?.uid) {
      setLoading(false);
      return;
    }

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
      },
    );

    return unsubscribe;
  }, [id, driver?.uid]);

  // If Admin completes the booking externally, stop GPS on this device too.
  useEffect(() => {
    if (
      (booking?.driverStatus === 'completed' ||
        booking?.status === 'completed') &&
      tracking
    ) {
      void stopTracking();
    }
  }, [booking?.driverStatus, booking?.status, tracking, stopTracking]);

  // Driver can mark arrival and start the trip.
  const updateTripStatus = async (
    status: 'arrived' | 'in_progress',
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
          : 'Trip has started.',
      );
    } catch (err) {
      console.error('Trip status update error:', err);
      Alert.alert('Error', 'Unable to update trip status.');
    } finally {
      setUpdating(false);
    }
  };

  // Driver completes the ride, but Admin still controls overall booking completion.
  const completeRide = async () => {
    if (!id || !driver?.uid || updating || !booking) return;

    if (booking.driverStatus !== 'in_progress') {
      Alert.alert(
        'Cannot Complete Ride',
        'You can complete the ride only after the trip has started.',
      );
      return;
    }

    try {
      setUpdating(true);

      await updateDoc(doc(db, 'bookings', id), {
        driverStatus: 'completed',
        tripCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Stop GPS sharing after the driver marks the ride complete.
      try {
        await stopTracking();
      } catch (gpsStopError) {
        console.error('Unable to stop GPS tracking:', gpsStopError);
      }

      Alert.alert(
        'Ride Completed',
        'You have marked this ride as completed.',
      );
    } catch (err) {
      console.error('Ride completion error:', err);
      Alert.alert(
        'Error',
        'Unable to complete the ride. Please try again.',
      );
    } finally {
      setUpdating(false);
    }
  };

  // Start live GPS sharing.
  const handleStartTracking = async () => {
    if (!id || tracking) return;

    try {
      await startTracking(id);
      Alert.alert(
        'GPS Active',
        'Your live location is now being shared.',
      );
    } catch (err: any) {
      Alert.alert(
        'GPS Error',
        err?.message || 'Unable to start GPS tracking.',
      );
    }
  };

  // Call customer.
  const callCustomer = async () => {
    if (!booking?.userPhone) {
      Alert.alert(
        'Unavailable',
        'Customer phone number is not available.',
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
  const rideCompleted = tripStatus === 'completed';

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

      {/* TRIP STATUS */}
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
          <>
            <Text style={styles.infoText}>
              Your trip is in progress. Keep GPS sharing active so the
              customer can track your location.
            </Text>

            <TouchableOpacity
              style={[styles.completeButton, updating && styles.disabledButton]}
              disabled={updating}
              onPress={() => {
                Alert.alert(
                  'Complete Ride?',
                  'Confirm that you have reached the drop location and completed this ride.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Complete Ride',
                      onPress: () => {
                        void completeRide();
                      },
                    },
                  ],
                );
              }}
            >
              <Text style={styles.completeButtonText}>
                {updating ? 'COMPLETING...' : '✓ COMPLETE RIDE'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {rideCompleted && (
          <Text style={styles.completedText}>
            ✓ You marked this ride as completed. Waiting for Admin to
            complete the booking.
          </Text>
        )}
      </View>

      {/* GPS TRACKING */}
      {(tripStatus === 'arrived' || tripStatus === 'in_progress') && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>LIVE GPS TRACKING</Text>

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
              <Text style={styles.secondaryText}>
                STOP GPS SHARING
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* CUSTOMER DETAILS */}
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
          <Text style={styles.secondaryText}>☎ CALL CUSTOMER</Text>
        </TouchableOpacity>
      </View>

      {/* VEHICLE DETAILS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>
        <Text style={styles.value}>
          {booking.carMake} {booking.carModel}
        </Text>
        <Text style={styles.muted}>Chauffeur booking</Text>
      </View>

      {/* JOURNEY DETAILS */}
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

      {/* BOOKING AMOUNT */}
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
  completeButton: {
    backgroundColor: COLORS.success,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 18,
  },
  completeButtonText: {
    color: COLORS.background,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.55,
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
  secondaryText: {
    color: COLORS.white,
    fontWeight: '800',
  },
  completedText: {
    color: COLORS.success,
    fontWeight: '800',
    lineHeight: 20,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  error: {
    color: COLORS.danger,
    textAlign: 'center',
    marginVertical: 10,
  },
});
