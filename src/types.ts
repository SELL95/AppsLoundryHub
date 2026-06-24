export type UserType = 'customer' | 'driver' | 'partner' | 'admin';

export interface BaseUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  avatarUrl: string;
  userType: UserType;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  defaultAddress: string;
  defaultLat: number;
  defaultLng: number;
  totalOrders: number;
  lifetimeSpend: number;
}

export interface DriverProfile {
  id: string;
  userId: string;
  vehicleType: string;
  vehiclePlate: string;
  isOnline: boolean;
  currentLat: number;
  currentLng: number;
  lastLocationUpdate: string;
  ratingAvg: number;
  totalDeliveries: number;
  isApproved: boolean;
  documents?: {
    licenseNumber: string;
    identityNumber: string;
  };
}

export interface OperatingHours {
  [day: string]: string; // e.g. "monday": "08:00-20:00"
}

export interface PartnerProfile {
  id: string;
  userId: string;
  businessName: string;
  businessAddress: string;
  businessLat: number;
  businessLng: number;
  phone: string;
  email: string;
  description: string;
  logoUrl: string;
  coverImageUrl: string;
  isOpen: boolean;
  isApproved: boolean;
  ratingAvg: number;
  totalOrders: number;
  dailyCapacityKg: number;
  commissionRate: number; // percent
  operatingHours: OperatingHours;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  isActive: boolean;
}

export interface LaundryService {
  id: string;
  partnerId: string;
  categoryId: string;
  name: string;
  description: string;
  pricePerKg?: number;
  pricePerItem?: number;
  processingTimeHours: number;
  isActive: boolean;
}

export type OrderStatus =
  | 'pending'                  // Created by customer
  | 'confirmed'                // Accepted by partner
  | 'driver_assigned'          // Driver accepted pickup request
  | 'pickup_in_progress'       // Driver traveling to customer
  | 'picked_up'                // Driver has collected bag, delivering to partner
  | 'in_processing'            // Handed over to partner, washing/drying/folding
  | 'ready_for_delivery'       // Processing finished, waiting for delivery driver
  | 'delivery_in_progress'     // Driver picked up from partner, driving to customer
  | 'delivered'                // Handed back to customer, pending final confirmation
  | 'completed'                // Done!
  | 'cancelled';               // Aborted

export interface TrackingHistoryItem {
  lat: number;
  lng: number;
  timestamp: string;
  status: OrderStatus;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  partnerId: string;
  driverId: string | null;
  status: OrderStatus;
  serviceType: string; // 'wash_fold' | 'wash_iron' | 'dry_clean' | 'iron_only'
  weightKg: number;
  itemCount: number;
  specialInstructions: string;
  
  // Pricing breakdown
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  totalAmount: number;
  currency: string;
  
  // Locations
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  pickupNotes: string;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryNotes: string;
  
  // Timeline dates (ISO strings)
  createdAt: string;
  pickupScheduledAt: string;
  deliveryScheduledAt: string;
  pickedUpAt?: string;
  deliveredToPartnerAt?: string;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  pickedUpForDeliveryAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  
  // Dynamic map tracking
  currentLat: number;
  currentLng: number;
  trackingHistory: TrackingHistoryItem[];
  
  // Handover secure OTP verification
  otpCode: string;
  otpVerified: boolean;
  deliveryProofPhoto?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'wallet' | 'bank_transfer' | 'cash';
  paymentProvider: 'stripe' | 'midtrans' | 'paystack' | 'wallet_balance';
  status: 'pending' | 'success' | 'failed' | 'refunded';
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'payment' | 'payout' | 'refund' | 'commission';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string;
  description: string;
  createdAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;
  targetUserId: string; // driverId, partnerId, or customerId
  targetType: 'driver' | 'partner' | 'customer';
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  raisedBy: string;
  against: string;
  type: 'damage' | 'lost_item' | 'wrong_order' | 'late_delivery' | 'other';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface PlatformConfig {
  commissionRate: number;
  deliveryFeeBase: number;
  deliveryFeePerKm: number;
  surgePricingEnabled: boolean;
  surgePricingMultiplier: number;
}
