import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/constants/colors';
import { db } from '../../src/services/firebase/config';

type PastBooking = {
  id: string;
  driverId?: string;
  driverStatus?: string;
  status?: string;
  carMake?: string;
  carModel?: string;
  pickupLocation?: string;
  dropLocation?: string;
  startDate?: any;
  endDate?: any;
  tripStartedAt?: any;
  tripCompletedAt?: any;
  updatedAt?: any;
  estimatedPrice?: number;
  finalPrice?: number;
};

const getDateValue = (value: any): Date | null => {
  if (!value) return null;

  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value: any): string => {
  const date = getDateValue(value);
  if (!date) return 'Date not available';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateRange = (start: any, end: any): string => {
  if (!start && !end) return 'Dates not available';
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  return formatDate(start || end);
};

export default function PastBookingsScreen() {
  const { driver } = useAuth();

  const [bookings, setBookings] = useState<PastBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!driver?.uid) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // Query this driver's bookings, then filter completed trips locally.
    // This avoids requiring a composite Firestore index for this screen.
    const driverBookingsQuery = query(
      collection(db, 'bookings'),
      where('driverId', '==', driver.uid),
    );

    const unsubscribe = onSnapshot(
      driverBookingsQuery,
      (snapshot) => {
        const completedBookings: PastBooking[] = snapshot.docs
          .map((bookingDoc) => ({
            id: bookingDoc.id,
            ...(bookingDoc.data() as Omit<PastBooking, 'id'>),
          }))
          .filter((booking) => booking.driverStatus === 'completed');

        completedBookings.sort((a, b) => {
          const dateA =
            getDateValue(a.tripCompletedAt || a.updatedAt)?.getTime() || 0;
          const dateB =
            getDateValue(b.tripCompletedAt || b.updatedAt)?.getTime() || 0;
          return dateB - dateA;
        });

        setBookings(completedBookings);
        setLoading(false);
        setError('');
      },
      (snapshotError) => {
        console.error('Past bookings listener error:', snapshotError);
        setError('Unable to load past bookings. Please try again.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [driver?.uid]);

  const openBooking = (bookingId: string) => {
    router.push(`/(driver)/trip/${bookingId}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Past Bookings</Text>
        <Text style={styles.subtitle}>
          Your completed rides and trip history
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOTAL COMPLETED RIDES</Text>
          <Text style={styles.summaryCount}>{bookings.length}</Text>
        </View>

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.stateText}>Loading past bookings...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Something went wrong</Text>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🗂️</Text>
            <Text style={styles.emptyTitle}>No past bookings yet</Text>
            <Text style={styles.emptyText}>
              Rides you complete will appear here.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>COMPLETED RIDES</Text>

            {bookings.map((booking) => {
              const completedAt =
                booking.tripCompletedAt || booking.updatedAt;
              const amount = booking.finalPrice ?? booking.estimatedPrice;
              const carName =
                [booking.carMake, booking.carModel]
                  .filter(Boolean)
                  .join(' ') || 'Rental Vehicle';

              return (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.bookingCard}
                  activeOpacity={0.85}
                  onPress={() => openBooking(booking.id)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.carInfo}>
                      <Text style={styles.carName}>{carName}</Text>
                      <Text style={styles.bookingId}>
                        Booking #{booking.id.slice(0, 8)}
                      </Text>
                    </View>

                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>COMPLETED</Text>
                    </View>
                  </View>

                  <View style={styles.routeContainer}>
                    <View style={styles.routeMarkerColumn}>
                      <View style={styles.pickupDot} />
                      <View style={styles.routeLine} />
                      <View style={styles.dropDot} />
                    </View>

                    <View style={styles.routeTextColumn}>
                      <View style={styles.locationBlock}>
                        <Text style={styles.locationLabel}>PICKUP</Text>
                        <Text style={styles.locationValue}>
                          {booking.pickupLocation || 'Not available'}
                        </Text>
                      </View>

                      <View style={styles.locationBlock}>
                        <Text style={styles.locationLabel}>DROP</Text>
                        <Text style={styles.locationValue}>
                          {booking.dropLocation || 'Not specified'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.footerInfo}>
                      <Text style={styles.footerLabel}>COMPLETED ON</Text>
                      <Text style={styles.footerValue}>
                        {formatDate(completedAt)}
                      </Text>
                    </View>

                    <View style={styles.footerInfoRight}>
                      <Text style={styles.footerLabel}>BOOKING PERIOD</Text>
                      <Text style={styles.footerValue}>
                        {formatDateRange(booking.startDate, booking.endDate)}
                      </Text>
                    </View>
                  </View>

                  {amount != null && (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Booking amount</Text>
                      <Text style={styles.amountValue}>
                        ₹{Number(amount).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.viewDetails}>VIEW TRIP DETAILS →</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
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
  back: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  heading: {
    color: COLORS.white,
    fontSize: 29,
    fontWeight: '900',
    marginTop: 25,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 7,
    marginBottom: 22,
  },
  summaryCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 25,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  summaryCount: {
    color: COLORS.primary,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 6,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 14,
  },
  stateContainer: {
    alignItems: 'center',
    paddingVertical: 35,
  },
  stateText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 12,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 25,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 30,
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  bookingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  carInfo: {
    flex: 1,
  },
  carName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  bookingId: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 5,
  },
  statusBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusText: {
    color: COLORS.success,
    fontSize: 9,
    fontWeight: '900',
  },
  routeContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  routeMarkerColumn: {
    alignItems: 'center',
    width: 18,
    marginRight: 10,
    paddingTop: 3,
  },
  pickupDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  routeLine: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  dropDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  routeTextColumn: {
    flex: 1,
    gap: 15,
  },
  locationBlock: {
    minHeight: 38,
  },
  locationLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  locationValue: {
    color: COLORS.white,
    fontSize: 13,
    marginTop: 4,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 17,
    paddingTop: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  footerInfo: {
    flex: 1,
  },
  footerInfoRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  footerLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '800',
  },
  footerValue: {
    color: COLORS.white,
    fontSize: 11,
    marginTop: 5,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  amountLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  amountValue: {
    color: COLORS.success,
    fontSize: 15,
    fontWeight: '900',
  },
  viewDetails: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 16,
    textAlign: 'right',
    letterSpacing: 0.5,
  },
});
