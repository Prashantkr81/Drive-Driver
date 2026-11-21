
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { subscribeToAssignedBookings } from '../../src/services/firebase/bookings';
import { DriverBooking } from '../../src/types/booking';
import { COLORS } from '../../src/constants/colors';

export default function BookingsScreen() {
  const { driver } = useAuth();

  const [bookings, setBookings] = useState<DriverBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!driver?.uid) return;

    const unsubscribe = subscribeToAssignedBookings(
      driver.uid,
      (data) => {
        setBookings(data);
        setLoading(false);
        setError('');
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [driver?.uid]);

  const renderBooking = ({ item }: { item: DriverBooking }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: '/(driver)/trip/[id]',
          params: { id: item.id },
        })
      }
    >
      <View style={styles.cardHeader}>
        <Text style={styles.carName}>
          {item.carMake} {item.carModel}
        </Text>
        <Text style={styles.status}>ASSIGNED</Text>
      </View>

      <Text style={styles.label}>CUSTOMER</Text>
      <Text style={styles.value}>{item.userName || 'Customer'}</Text>

      <Text style={styles.label}>PICKUP LOCATION</Text>
      <Text style={styles.value}>{item.pickupLocation}</Text>

      {item.dropLocation ? (
        <>
          <Text style={styles.label}>DROP LOCATION</Text>
          <Text style={styles.value}>{item.dropLocation}</Text>
        </>
      ) : null}

      <Text style={styles.label}>BOOKING ID</Text>
      <Text style={styles.bookingId}>{item.id}</Text>

      <View style={styles.footer}>
        <Text style={styles.price}>
          ₹{item.finalPrice ?? item.estimatedPrice ?? 'TBD'}
        </Text>
        <Text style={styles.details}>VIEW DETAILS →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Bookings</Text>
      <Text style={styles.subtitle}>
        Chauffeur bookings assigned to you
      </Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: 50 }}
        />
      ) : error ? (
        <Text style={styles.empty}>{error}</Text>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🚗</Text>
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.empty}>
                New bookings assigned by the admin will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 65,
    paddingHorizontal: 20,
  },
  heading: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: 7,
    marginBottom: 25,
  },
  list: {
    paddingBottom: 30,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  carName: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
  },
  status: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '900',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 13,
  },
  value: {
    color: COLORS.white,
    fontSize: 14,
    marginTop: 4,
  },
  bookingId: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 18,
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  details: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 45,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 18,
  },
  empty: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
});
