
export type DriverTripStatus =
  | 'unassigned'
  | 'assigned'
  | 'arrived'
  | 'in_progress'
  | 'completed';

export interface DriverBooking {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;

  carId: string;
  carMake: string;
  carModel: string;

  rentalType: 'self_drive' | 'chauffeur';

  pickupLocation: string;
  dropLocation?: string;

  startDate?: any;
  endDate?: any;

  estimatedPrice?: number;
  finalPrice?: number;

  status: string;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  driverStatus?: DriverTripStatus;

  createdAt?: any;
}
