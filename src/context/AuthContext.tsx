
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase/config';
import { loginDriver, logoutDriver } from '../services/firebase/auth';
import { DriverProfile } from '../types/driver';

interface AuthContextType {
  driver: DriverProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setDriver(null);
        setLoading(false);
        return;
      }

      try {
        // Revalidate role and approval on every app launch.
        const profile = await loginDriverSession(user.uid);
        setDriver(profile);
      } catch {
        setDriver(null);
        await logoutDriver();
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const profile = await loginDriver(email, password);
      setDriver(profile);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await logoutDriver();
    setDriver(null);
  };

  return (
    <AuthContext.Provider value={{ driver, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};

// Restore a session without signing in again.
async function loginDriverSession(uid: string): Promise<DriverProfile> {
  const { doc, getDoc } = await import('firebase/firestore');
  const { db } = await import('../services/firebase/config');

  const [userSnapshot, driverSnapshot] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'drivers', uid)),
  ]);

  if (
    !userSnapshot.exists() ||
    userSnapshot.data().role !== 'driver' ||
    !driverSnapshot.exists()
  ) {
    throw new Error('Invalid driver account');
  }

  const userData = userSnapshot.data();
  const driverData = driverSnapshot.data();

  if (driverData.verificationStatus !== 'approved') {
    throw new Error('Driver is not approved');
  }

  return {
    uid,
    name: driverData.name || userData.name || '',
    email: auth.currentUser?.email || '',
    phone: driverData.phone || userData.phone || '',
    licenseNumber: driverData.licenseNumber,
    vehicleId: driverData.vehicleId,
    verificationStatus: 'approved',
    availability: driverData.availability || 'offline',
  };
}
