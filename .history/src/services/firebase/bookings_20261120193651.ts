
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import { db } from './config';
import { DriverBooking } from '../../types/booking';

export const subscribeToAssignedBookings = (
  driverId: string,
  callback: (bookings: DriverBooking[]) => void,
  onError?: (error: Error) => void
) => {
  const bookingsQuery = query(
    collection(db, 'bookings'),
    where('driverId', '==', driverId)
  );

  return onSnapshot(
    bookingsQuery,
    (snapshot) => {
      const bookings = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }) as DriverBooking)
        .filter(
          (booking) =>
            booking.rentalType === 'chauffeur' &&
            booking.status === 'confirmed' &&
            booking.driverStatus !== 'completed'
        );

      callback(bookings);
    },
    (error) => {
      onError?.(error);
    }
  );
};
