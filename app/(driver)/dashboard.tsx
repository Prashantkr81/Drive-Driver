
import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { router } from 'expo-router';

import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/constants/colors';
import { db } from '../../src/services/firebase/config';

type Availability = 'online' | 'offline' | 'on_trip';

export default function DashboardScreen() {
  const { driver, logout } = useAuth();

  const [availability, setAvailability] =
    useState<Availability>('offline');

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Listen to driver's latest availability from Firestore.
  useEffect(() => {
    if (!driver?.uid) {
      setLoading(false);
      return;
    }

    const driverRef = doc(db, 'drivers', driver.uid);

    const unsubscribe = onSnapshot(
      driverRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          const currentAvailability = data.availability;

          if (
            currentAvailability === 'online' ||
            currentAvailability === 'offline' ||
            currentAvailability === 'on_trip'
          ) {
            setAvailability(currentAvailability);
          }
        }

        setLoading(false);
      },
      (error) => {
        console.error('Availability listener error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [driver?.uid]);

  // Toggle between online and offline.
  const handleAvailabilityToggle = async () => {
    if (!driver?.uid || updating) return;

    if (availability === 'on_trip') {
      Alert.alert(
        'Trip in Progress',
        'You cannot change availability while a trip is active.'
      );
      return;
    }

    const newAvailability: Availability =
      availability === 'online' ? 'offline' : 'online';

    try {
      setUpdating(true);

      await updateDoc(doc(db, 'drivers', driver.uid), {
        availability: newAvailability,
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        'Availability Updated',
        newAvailability === 'online'
          ? 'You are now available for new bookings.'
          : 'You are now offline.'
      );
    } catch (error) {
      console.error('Availability update error:', error);

      Alert.alert(
        'Error',
        'Unable to update availability. Please try again.'
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', 'Unable to log out.');
    }
  };

  const availabilityColor =
    availability === 'online'
      ? COLORS.success
      : availability === 'on_trip'
      ? COLORS.primary
      : COLORS.danger;

  const availabilityLabel =
    availability === 'online'
      ? 'ONLINE'
      : availability === 'on_trip'
      ? 'ON TRIP'
      : 'OFFLINE';

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>NOIDADRIVE</Text>

      <Text style={styles.heading}>Driver Dashboard</Text>


      <Text style={styles.welcome}>
        Welcome, {driver?.name || 'Driver'}!
      </Text>

      {/* BOOKINGS */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(driver)/bookings')}
      >
        <Text style={styles.buttonText}>
          VIEW MY BOOKINGS →
        </Text>
      </TouchableOpacity>

           <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(driver)/past-bookings')}
          >
            <Text style={styles.buttonText}>
              VIEW PAST BOOKINGS →
            </Text>
          </TouchableOpacity>

      {/* DRIVER INFORMATION */}
      <View style={styles.card}>
        <Text style={styles.label}>ACCOUNT STATUS</Text>

        <Text style={styles.approved}>
          ✓ APPROVED
        </Text>

        <Text style={styles.label}>AVAILABILITY</Text>

        {loading ? (
          <ActivityIndicator
            color={COLORS.primary}
            style={styles.loader}
          />
        ) : (
          <View style={styles.availabilityRow}>
            <View
              style={[
                styles.indicator,
                { backgroundColor: availabilityColor },
              ]}
            />

            <Text
              style={[
                styles.availabilityText,
                { color: availabilityColor },
              ]}
            >
              {availabilityLabel}
            </Text>
          </View>
        )}

        <Text style={styles.label}>PHONE</Text>

        <Text style={styles.value}>
          {driver?.phone || 'Not available'}
        </Text>

        {/* AVAILABILITY TOGGLE */}
        <TouchableOpacity
          style={[
            styles.availabilityButton,
            availability === 'online'
              ? styles.offlineButton
              : styles.onlineButton,
            (updating || loading || availability === 'on_trip') &&
              styles.disabledButton,
          ]}
          onPress={handleAvailabilityToggle}
          disabled={
            updating ||
            loading ||
            availability === 'on_trip'
          }
        >
          {updating ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>
              {availability === 'online'
                ? 'GO OFFLINE'
                : availability === 'on_trip'
                ? 'TRIP IN PROGRESS'
                : 'GO ONLINE'}
            </Text>
          )}
        </TouchableOpacity>

        {availability === 'on_trip' && (
          <Text style={styles.infoText}>
            Your availability will be updated after your trip
            is completed by Admin.
          </Text>
        )}
      </View>

      <Text style={styles.comingSoon}>
        Your assigned bookings will appear here.
      </Text>

      {/* LOGOUT */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>
          LOG OUT
        </Text>
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
    marginTop: 25,
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
    marginTop: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 16,
  },

  approved: {
    color: COLORS.success,
    fontWeight: '800',
    fontSize: 17,
    marginTop: 5,
  },

  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  indicator: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 9,
  },

  availabilityText: {
    fontSize: 16,
    fontWeight: '900',
  },

  value: {
    color: COLORS.white,
    fontSize: 15,
    marginTop: 5,
  },

  loader: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },

  availabilityButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },

  onlineButton: {
    backgroundColor: COLORS.success,
  },

  offlineButton: {
    backgroundColor: COLORS.danger,
  },

  disabledButton: {
    opacity: 0.55,
  },

  button: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },

  buttonText: {
    color: COLORS.white,
    fontWeight: '800',
  },

  infoText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },

  comingSoon: {
    color: COLORS.textSecondary,
    marginTop: 24,
    textAlign: 'center',
  },
});
