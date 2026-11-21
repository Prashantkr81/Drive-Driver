
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import {
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { auth, db } from '../services/firebase/config';

export const useDriverLocation = () => {
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState('');

  const stopTracking = useCallback(async () => {
    watchRef.current?.remove();
    watchRef.current = null;

    setTracking(false);

    const uid = auth.currentUser?.uid;

    if (uid) {
      try {
        await setDoc(
          doc(db, 'driverLocations', uid),
          {
            isSharing: false,
            activeBookingId: null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Unable to stop location sharing:', err);
      }
    }
  }, []);

  const startTracking = useCallback(async (bookingId: string) => {
    try {
      setError('');

      const uid = auth.currentUser?.uid;

      if (!uid) {
        throw new Error('Driver is not logged in.');
      }

      // Avoid duplicate GPS watchers.
      watchRef.current?.remove();
      watchRef.current = null;

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        throw new Error('Location permission was denied.');
      }

      const servicesEnabled =
        await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        throw new Error('Please enable device location services.');
      }

      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const saveLocation = async (position: Location.LocationObject) => {
        await setDoc(
          doc(db, 'driverLocations', uid),
          {
            driverId: uid,
            activeBookingId: bookingId,
            isSharing: true,
            currentLocation: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      };

      await saveLocation(initialLocation);

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (position) => {
          saveLocation(position).catch((err) => {
            console.error('GPS update failed:', err);
            setError('Unable to update GPS location.');
          });
        }
      );

      setTracking(true);
    } catch (err: any) {
      setError(err.message || 'Unable to start GPS tracking.');
      throw err;
    }
  }, []);

  useEffect(() => {
    return () => {
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, []);

  return {
    tracking,
    error,
    startTracking,
    stopTracking,
  };
};
