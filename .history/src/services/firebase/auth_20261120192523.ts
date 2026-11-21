
import {
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import {
  doc,
  getDoc,
} from 'firebase/firestore';

import { auth, db } from './config';
import { DriverProfile } from '../../types/driver';

export const loginDriver = async (
  email: string,
  password: string
): Promise<DriverProfile> => {
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

  const uid = credential.user.uid;

  try {
    // Check common user role
    const userSnapshot = await getDoc(doc(db, 'users', uid));

    if (!userSnapshot.exists()) {
      throw new Error('Driver account not found.');
    }

    const userData = userSnapshot.data();

    if (userData.role !== 'driver') {
      throw new Error('This account is not registered as a driver.');
    }

    // Check driver approval
    const driverSnapshot = await getDoc(doc(db, 'drivers', uid));

    if (!driverSnapshot.exists()) {
      throw new Error('Driver profile not found. Contact administrator.');
    }

    const driverData = driverSnapshot.data();

    if (driverData.verificationStatus !== 'approved') {
      throw new Error(
        driverData.verificationStatus === 'rejected'
          ? 'Your driver application was rejected.'
          : 'Your driver account is awaiting admin approval.'
      );
    }

    return {
      uid,
      name: driverData.name || userData.name || '',
      email: credential.user.email || '',
      phone: driverData.phone || userData.phone || '',
      licenseNumber: driverData.licenseNumber,
      vehicleId: driverData.vehicleId,
      verificationStatus: driverData.verificationStatus,
      availability: driverData.availability || 'offline',
    };
  } catch (error) {
    await signOut(auth);
    throw error;
  }
};

export const logoutDriver = async () => {
  await signOut(auth);
};
