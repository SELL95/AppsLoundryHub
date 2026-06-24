import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { 
  BaseUser, 
  CustomerProfile, 
  DriverProfile, 
  PartnerProfile, 
  LaundryService, 
  Order, 
  OrderStatus, 
  Payment, 
  Review, 
  WalletTransaction, 
  Dispute, 
  PlatformConfig 
} from "./src/types";

// --- IN-MEMORY INITIAL STATE ---

// Mock Users
let users: BaseUser[] = [
  {
    id: "user-cust-1",
    email: "customer@laundryhub.com",
    phone: "+628123456789",
    fullName: "Alex Johnson",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    userType: "customer",
    isVerified: true,
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "user-driv-1",
    email: "driver.budi@laundryhub.com",
    phone: "+628776655443",
    fullName: "Budi Santoso",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    userType: "driver",
    isVerified: true,
    isActive: true,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "user-driv-2",
    email: "driver.siti@laundryhub.com",
    phone: "+628554433221",
    fullName: "Siti Aminah",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    userType: "driver",
    isVerified: true,
    isActive: true,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "user-part-1",
    email: "spin.shine@laundryhub.com",
    phone: "+62811223344",
    fullName: "Spin & Shine Laundry",
    avatarUrl: "https://images.unsplash.com/photo-1545173168-9f19072f1787?auto=format&fit=crop&q=80&w=150",
    userType: "partner",
    isVerified: true,
    isActive: true,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "user-part-2",
    email: "ecoclean@laundryhub.com",
    phone: "+62812998877",
    fullName: "EcoClean DryCleaners",
    avatarUrl: "https://images.unsplash.com/photo-1521568852474-1fbaa8c788b7?auto=format&fit=crop&q=80&w=150",
    userType: "partner",
    isVerified: true,
    isActive: true,
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "user-part-3",
    email: "aroma.express@laundryhub.com",
    phone: "+62819001122",
    fullName: "Aroma Express Laundry",
    avatarUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=150",
    userType: "partner",
    isVerified: true, // Auto-verified for active dispatch
    isActive: true,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "user-part-4",
    email: "berkah@laundryhub.com",
    phone: "+62812334455",
    fullName: "Berkah Kiloan Laundry",
    avatarUrl: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&q=80&w=150",
    userType: "partner",
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "user-part-5",
    email: "sneakerheads@laundryhub.com",
    phone: "+62812556677",
    fullName: "SneakerHeads Wash",
    avatarUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=150",
    userType: "partner",
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "user-part-6",
    email: "flash247@laundryhub.com",
    phone: "+62812990011",
    fullName: "24/7 Flash Express",
    avatarUrl: "https://images.unsplash.com/photo-1521568852474-1fbaa8c788b7?auto=format&fit=crop&q=80&w=150",
    userType: "partner",
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "user-admin",
    email: "admin@laundryhub.com",
    phone: "+62811111111",
    fullName: "Chief Administrator",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
    userType: "admin",
    isVerified: true,
    isActive: true,
    createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Active User Session Profile
let currentSessionUserId: string = "user-cust-1";

// Customers
let customers: CustomerProfile[] = [
  {
    id: "cust-1",
    userId: "user-cust-1",
    defaultAddress: "Apartment Grand Sudirman Tower A, Floor 18, Jakarta",
    defaultLat: -6.2088,
    defaultLng: 106.8456,
    totalOrders: 3,
    lifetimeSpend: 42.50
  }
];

// Drivers
let drivers: DriverProfile[] = [
  {
    id: "driv-1",
    userId: "user-driv-1",
    vehicleType: "Honda Vario Scooter (Motorcycle)",
    vehiclePlate: "B 1234 SDU",
    isOnline: true,
    currentLat: -6.2220,
    currentLng: 106.8280,
    lastLocationUpdate: new Date().toISOString(),
    ratingAvg: 4.85,
    totalDeliveries: 42,
    isApproved: true,
    documents: {
      licenseNumber: "SIM-9823194831",
      identityNumber: "KTP-3174092831980"
    }
  },
  {
    id: "driv-2",
    userId: "user-driv-2",
    vehicleType: "Toyota Avanza Multi-purpose (Car)",
    vehiclePlate: "B 5678 ABC",
    isOnline: false,
    currentLat: -6.1850,
    currentLng: 106.8400,
    lastLocationUpdate: new Date().toISOString(),
    ratingAvg: 4.92,
    totalDeliveries: 18,
    isApproved: true,
    documents: {
      licenseNumber: "SIM-7734891238",
      identityNumber: "KTP-3174112349098"
    }
  }
];

// Partners
let partners: PartnerProfile[] = [
  {
    id: "part-1",
    userId: "user-part-1",
    businessName: "Spin & Shine Premium Laundry",
    businessAddress: "Jl. Senopati No. 45, Kebayoran Baru, Jakarta",
    businessLat: -6.2240,
    businessLng: 106.8090,
    phone: "+62811223344",
    email: "spin.shine@laundryhub.com",
    description: "Eco-friendly premium fabric care, express wash & fold, and meticulous steam ironing with platform guarantee.",
    logoUrl: "https://images.unsplash.com/photo-1545173168-9f19072f1787?auto=format&fit=crop&q=80&w=150",
    coverImageUrl: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&q=80&w=800",
    isOpen: true,
    isApproved: true,
    ratingAvg: 4.8,
    totalOrders: 142,
    dailyCapacityKg: 150,
    commissionRate: 15.00,
    operatingHours: {
      "Monday-Friday": "08:00 - 20:00",
      "Saturday-Sunday": "09:00 - 18:00"
    }
  },
  {
    id: "part-2",
    userId: "user-part-2",
    businessName: "EcoClean Eco-Friendly DryCleaners",
    businessAddress: "Jl. Menteng Raya No. 12, Menteng, Jakarta",
    businessLat: -6.1980,
    businessLng: 106.8320,
    phone: "+62812998877",
    email: "ecoclean@laundryhub.com",
    description: "Premium dry cleaning using biodegradable organic solvents. Best for suits, delicate silks, and wedding gowns.",
    logoUrl: "https://images.unsplash.com/photo-1521568852474-1fbaa8c788b7?auto=format&fit=crop&q=80&w=150",
    coverImageUrl: "https://images.unsplash.com/photo-1489274495757-95c7c837b101?auto=format&fit=crop&q=80&w=800",
    isOpen: true,
    isApproved: true,
    ratingAvg: 4.6,
    totalOrders: 89,
    dailyCapacityKg: 100,
    commissionRate: 15.00,
    operatingHours: {
      "Monday-Saturday": "07:30 - 21:00",
      "Sunday": "10:00 - 16:00"
    }
  },
  {
    id: "part-3",
    userId: "user-part-3",
    businessName: "Aroma Express Laundry",
    businessAddress: "Jl. Casablanca Kav. 88, Tebet, Jakarta",
    businessLat: -6.2200,
    businessLng: 106.8480,
    phone: "+62819001122",
    email: "aroma.express@laundryhub.com",
    description: "Highly fragrant laundry with multiple premium perfume selections. Ideal for bedcovers, activewear, and curtains.",
    logoUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=150",
    coverImageUrl: "https://images.unsplash.com/photo-1521568852474-1fbaa8c788b7?auto=format&fit=crop&q=80&w=800",
    isOpen: true,
    isApproved: true,
    ratingAvg: 4.4,
    totalOrders: 45,
    dailyCapacityKg: 80,
    commissionRate: 15.00,
    operatingHours: {
      "Monday-Sunday": "08:00 - 22:00"
    }
  },
  {
    id: "part-4",
    userId: "user-part-4",
    businessName: "Berkah Kiloan Laundry",
    businessAddress: "Jl. HR Rasuna Said No. 10, Kuningan, Jakarta",
    businessLat: -6.2110,
    businessLng: 106.8420,
    phone: "+62812334455",
    email: "berkah@laundryhub.com",
    description: "Affordable laundry kiloan (by kg). Quick, neat, clean, and extremely budget-friendly. Perfect for daily wear.",
    logoUrl: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&q=80&w=150",
    coverImageUrl: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&q=80&w=800",
    isOpen: true,
    isApproved: true,
    ratingAvg: 4.5,
    totalOrders: 312,
    dailyCapacityKg: 200,
    commissionRate: 12.00,
    operatingHours: {
      "Monday-Sunday": "07:00 - 21:00"
    }
  },
  {
    id: "part-5",
    userId: "user-part-5",
    businessName: "SneakerHeads Wash & Leather Care",
    businessAddress: "Jl. Tebet Raya No. 4, Tebet, Jakarta",
    businessLat: -6.2020,
    businessLng: 106.8520,
    phone: "+62812556677",
    email: "sneakerheads@laundryhub.com",
    description: "Premium cleaning and restoration for sneakers, leather shoes, hats, luxury designer bags, and jackets.",
    logoUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=150",
    coverImageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800",
    isOpen: true,
    isApproved: true,
    ratingAvg: 4.9,
    totalOrders: 56,
    dailyCapacityKg: 50,
    commissionRate: 15.00,
    operatingHours: {
      "Tuesday-Sunday": "10:00 - 19:00"
    }
  },
  {
    id: "part-6",
    userId: "user-part-6",
    businessName: "24/7 Flash Express Laundry",
    businessAddress: "Jl. Jend. Sudirman Kav. 21, Jakarta",
    businessLat: -6.2150,
    businessLng: 106.8490,
    phone: "+62812990011",
    email: "flash247@laundryhub.com",
    description: "Super fast express service. Get your laundry dry, clean, and ironed in 6 to 12 hours. Open 24 hours daily.",
    logoUrl: "https://images.unsplash.com/photo-1521568852474-1fbaa8c788b7?auto=format&fit=crop&q=80&w=150",
    coverImageUrl: "https://images.unsplash.com/photo-1521568852474-1fbaa8c788b7?auto=format&fit=crop&q=80&w=800",
    isOpen: true,
    isApproved: true,
    ratingAvg: 4.2,
    totalOrders: 184,
    dailyCapacityKg: 250,
    commissionRate: 15.00,
    operatingHours: {
      "Everyday": "00:00 - 24:00"
    }
  }
];

// Initial Service Catalog for partners
let services: LaundryService[] = [
  // Partner 1 services (Spin & Shine Premium)
  {
    id: "srv-1-1",
    partnerId: "part-1",
    categoryId: "cat-wash-fold",
    name: "Premium Wash & Fold",
    description: "Washed with cold water, hypoallergenic detergents, dried, and crisply hand-folded.",
    pricePerKg: 1.80,
    processingTimeHours: 24,
    isActive: true
  },
  {
    id: "srv-1-2",
    partnerId: "part-1",
    categoryId: "cat-wash-iron",
    name: "Express Wash & Steam Iron",
    description: "Wash and high-heat steam iron to remove all stubborn wrinkles.",
    pricePerKg: 2.50,
    processingTimeHours: 12,
    isActive: true
  },
  {
    id: "srv-1-3",
    partnerId: "part-1",
    categoryId: "cat-dry-clean",
    name: "Silk Dress Dry Clean",
    description: "Careful dry cleaning treatment for premium garments.",
    pricePerItem: 6.00,
    processingTimeHours: 48,
    isActive: true
  },
  {
    id: "srv-1-4",
    partnerId: "part-1",
    categoryId: "cat-iron-only",
    name: "Shirt Hand-Ironing",
    description: "Just ironed by hand and hung. Clothes hanger included.",
    pricePerItem: 0.90,
    processingTimeHours: 12,
    isActive: true
  },

  // Partner 2 services (EcoClean Eco-Friendly)
  {
    id: "srv-2-1",
    partnerId: "part-2",
    categoryId: "cat-dry-clean",
    name: "Eco-Friendly Dry Cleaning",
    description: "Using organic biodegradable non-toxic solvent. Best for suits and evening gowns.",
    pricePerItem: 8.50,
    processingTimeHours: 36,
    isActive: true
  },
  {
    id: "srv-2-2",
    partnerId: "part-2",
    categoryId: "cat-wash-fold",
    name: "Standard Scent-free Wash",
    description: "Great for sensitive skin. Unscented plant-based detergent.",
    pricePerKg: 2.00,
    processingTimeHours: 24,
    isActive: true
  },

  // Partner 3 services (Aroma Express)
  {
    id: "srv-3-1",
    partnerId: "part-3",
    categoryId: "cat-wash-fold",
    name: "Aroma Signature Wash & Fold",
    description: "Specialized double-scented deep wash with premium Downy/Molto softener.",
    pricePerKg: 1.20,
    processingTimeHours: 24,
    isActive: true
  },
  {
    id: "srv-3-2",
    partnerId: "part-3",
    categoryId: "cat-wash-iron",
    name: "Aroma Wash & Heavy Ironing",
    description: "Deep fragrance wash plus sharp alignment pressing for office uniforms.",
    pricePerKg: 1.60,
    processingTimeHours: 24,
    isActive: true
  },

  // Partner 4 services (Berkah Kiloan Laundry - Budget)
  {
    id: "srv-4-1",
    partnerId: "part-4",
    categoryId: "cat-wash-fold",
    name: "Cuci Lipat Kiloan Ekonomis",
    description: "Cuci bersih, kering, lipat rapi. Harga paling murah meriah.",
    pricePerKg: 0.60,
    processingTimeHours: 24,
    isActive: true
  },
  {
    id: "srv-4-2",
    partnerId: "part-4",
    categoryId: "cat-wash-iron",
    name: "Cuci Setrika Kiloan Berkah",
    description: "Paket cuci lengkap disetrika rapi, disemprot parfum pewangi melati/sakura.",
    pricePerKg: 0.95,
    processingTimeHours: 24,
    isActive: true
  },
  {
    id: "srv-4-3",
    partnerId: "part-4",
    categoryId: "cat-iron-only",
    name: "Setrika Kiloan Saja",
    description: "Pakaian sudah dicuci sendiri? Titipkan di sini untuk disetrika licin dan rapi.",
    pricePerKg: 0.45,
    processingTimeHours: 12,
    isActive: true
  },

  // Partner 5 services (SneakerHeads Wash - Premium Specialty)
  {
    id: "srv-5-1",
    partnerId: "part-5",
    categoryId: "cat-dry-clean",
    name: "Deep Clean Canvas Sneakers",
    description: "Premium manual shoe washing. Cleaned outsole, midsole, insole, and laces.",
    pricePerItem: 4.50,
    processingTimeHours: 48,
    isActive: true
  },
  {
    id: "srv-5-2",
    partnerId: "part-5",
    categoryId: "cat-dry-clean",
    name: "Luxury Leather Bag Care",
    description: "Deep leather moisturization, dust removal, color restoration, and metal polish.",
    pricePerItem: 12.00,
    processingTimeHours: 72,
    isActive: true
  },

  // Partner 6 services (24/7 Flash Express)
  {
    id: "srv-6-1",
    partnerId: "part-6",
    categoryId: "cat-wash-fold",
    name: "6-Hour Super Flash Wash & Fold",
    description: "Emergency washing. Done and folded ready to pick up in just 6 hours.",
    pricePerKg: 2.80,
    processingTimeHours: 6,
    isActive: true
  },
  {
    id: "srv-6-2",
    partnerId: "part-6",
    categoryId: "cat-wash-iron",
    name: "12-Hour Over-Night Express Press",
    description: "Pick up tonight, wear tomorrow morning. Washing + crisp steam pressing.",
    pricePerKg: 3.60,
    processingTimeHours: 12,
    isActive: true
  }
];

// Orders List
let orders: Order[] = [
  {
    id: "order-1",
    orderNumber: "LH-98731",
    customerId: "cust-1",
    partnerId: "part-1",
    driverId: "driv-1",
    status: "in_processing",
    serviceType: "wash_fold",
    weightKg: 6.5,
    itemCount: 15,
    specialInstructions: "Use lavender detergent. Do not dry-tumble the blue wool sweater.",
    subtotal: 11.70,
    serviceFee: 1.00,
    deliveryFee: 2.50,
    platformFee: 0.50,
    discount: 0.00,
    totalAmount: 15.70,
    currency: "USD",
    pickupAddress: "Apartment Grand Sudirman Tower A, Floor 18, Jakarta",
    pickupLat: -6.2088,
    pickupLng: 106.8456,
    pickupNotes: "Ring the intercom for lobby entrance. Leave bag with reception if not answering.",
    deliveryAddress: "Apartment Grand Sudirman Tower A, Floor 18, Jakarta",
    deliveryLat: -6.2088,
    deliveryLng: 106.8456,
    deliveryNotes: "Same as pickup",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    pickupScheduledAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    deliveryScheduledAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
    pickedUpAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    deliveredToPartnerAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    processingStartedAt: new Date(Date.now() - 1.8 * 60 * 60 * 1000).toISOString(),
    currentLat: -6.2240, // Currently at the partner
    currentLng: 106.8090,
    trackingHistory: [
      { lat: -6.2088, lng: 106.8456, timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), status: "pending", notes: "Order placed" },
      { lat: -6.2220, lng: 106.8280, timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), status: "driver_assigned", notes: "Driver assigned: Budi" },
      { lat: -6.2088, lng: 106.8456, timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(), status: "picked_up", notes: "Picked up from customer" },
      { lat: -6.2240, lng: 106.8090, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), status: "in_processing", notes: "Arrived at partner. Washing started." }
    ],
    otpCode: "2841",
    otpVerified: false
  },
  {
    id: "order-2",
    orderNumber: "LH-77123",
    customerId: "cust-1",
    partnerId: "part-2",
    driverId: "driv-1",
    status: "completed",
    serviceType: "dry_clean",
    weightKg: 2.0,
    itemCount: 2,
    specialInstructions: "Dry clean only. Hang on delivery.",
    subtotal: 17.00,
    serviceFee: 1.50,
    deliveryFee: 3.00,
    platformFee: 0.50,
    discount: 2.00,
    totalAmount: 20.00,
    currency: "USD",
    pickupAddress: "Apartment Grand Sudirman Tower A, Floor 18, Jakarta",
    pickupLat: -6.2088,
    pickupLng: 106.8456,
    pickupNotes: "Leave at lobby desk",
    deliveryAddress: "Apartment Grand Sudirman Tower A, Floor 18, Jakarta",
    deliveryLat: -6.2088,
    deliveryLng: 106.8456,
    deliveryNotes: "Leave at lobby desk",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    pickupScheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryScheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    pickedUpAt: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
    deliveredToPartnerAt: new Date(Date.now() - 45 * 60 * 60 * 1000).toISOString(),
    processingStartedAt: new Date(Date.now() - 44 * 60 * 60 * 1000).toISOString(),
    processingCompletedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    pickedUpForDeliveryAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    deliveredAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    currentLat: -6.2088,
    currentLng: 106.8456,
    trackingHistory: [
      { lat: -6.2088, lng: 106.8456, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: "pending", notes: "Placed" },
      { lat: -6.2088, lng: 106.8456, timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), status: "completed", notes: "Delivered & Confirmed" }
    ],
    otpCode: "4921",
    otpVerified: true
  }
];

// Mock Platform Config
let platformConfig: PlatformConfig = {
  commissionRate: 15.00,
  deliveryFeeBase: 2.00,
  deliveryFeePerKm: 0.50,
  surgePricingEnabled: false,
  surgePricingMultiplier: 1.25
};

// Mock Wallet transactions
let walletTransactions: WalletTransaction[] = [
  {
    id: "txn-1",
    userId: "user-cust-1",
    type: "deposit",
    amount: 100.00,
    balanceBefore: 0,
    balanceAfter: 100.00,
    description: "Deposit via Credit Card",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "txn-2",
    userId: "user-cust-1",
    type: "payment",
    amount: 20.00,
    balanceBefore: 100.00,
    balanceAfter: 80.00,
    referenceId: "order-2",
    description: "Payment for order LH-77123",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock disputes
let disputes: Dispute[] = [
  {
    id: "disp-1",
    orderId: "order-2",
    raisedBy: "user-cust-1",
    against: "user-part-2",
    type: "wrong_order",
    description: "My white silk shirt seems slightly pinkish at the collar. Might have been washed with colored items.",
    status: "open",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  }
];

// Mock reviews
let reviews: Review[] = [
  {
    id: "rev-1",
    orderId: "order-2",
    reviewerId: "user-cust-1",
    targetUserId: "user-part-2",
    targetType: "partner",
    rating: 4,
    comment: "Clothes are fully clean, dry clean solvent had no chemical smell! Very nice, but delivery was 1 hour late.",
    createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
  }
];

// Utility: simple haversine distance estimation (in km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// --- DYNAMIC GEOLOCATION & STATUS SIMULATION ENGINE ---
// This background worker simulates real-time driver coordinate movement.
// Since we don't use real websockets to guarantee zero port binding bugs, 
// the server updates coordinates locally, and clients continuously poll the state.
function runDriverCoordinatesSimulator() {
  setInterval(() => {
    let stateChanged = false;

    orders.forEach((order) => {
      if (order.status === "cancelled" || order.status === "completed" || order.status === "delivered" || order.status === "in_processing" || order.status === "ready_for_delivery") {
        return;
      }

      // We only simulate movement if a driver is assigned
      if (!order.driverId) return;

      const driver = drivers.find(d => d.id === order.driverId);
      if (!driver) return;

      let targetLat = order.pickupLat;
      let targetLng = order.pickupLng;
      let stepSize = 0.003; // speed coordinate steps

      if (order.status === "pickup_in_progress") {
        // Driver traveling to Customer
        targetLat = order.pickupLat;
        targetLng = order.pickupLng;
      } else if (order.status === "picked_up") {
        // Driver traveling from Customer to Laundry Partner
        const partner = partners.find(p => p.id === order.partnerId);
        if (partner) {
          targetLat = partner.businessLat;
          targetLng = partner.businessLng;
        }
      } else if (order.status === "delivery_in_progress") {
        // Driver traveling from Laundry Partner back to Customer
        targetLat = order.deliveryLat;
        targetLng = order.deliveryLng;
      } else {
        return;
      }

      // Check current distance
      const distanceToTarget = calculateDistance(order.currentLat, order.currentLng, targetLat, targetLng);

      if (distanceToTarget > 0.05) {
        // Linear interpolation step towards the target
        const diffLat = targetLat - order.currentLat;
        const diffLng = targetLng - order.currentLng;
        const hypotenuse = Math.sqrt(diffLat * diffLat + diffLng * diffLng);
        
        const moveRatio = Math.min(1, 0.22); // Move 22% closer each step
        order.currentLat += diffLat * moveRatio;
        order.currentLng += diffLng * moveRatio;
        
        // Keep driver profile in sync too
        driver.currentLat = order.currentLat;
        driver.currentLng = order.currentLng;
        driver.lastLocationUpdate = new Date().toISOString();
        stateChanged = true;
      } else {
        // Driver has arrived at destination! Let's auto-transition or log arrival
        if (order.status === "pickup_in_progress") {
          // Arrived at Customer's pickup point. Ready to pick up garments.
          order.currentLat = targetLat;
          order.currentLng = targetLng;
          driver.currentLat = targetLat;
          driver.currentLng = targetLng;
          // Auto pickup after arriving to maintain high engagement
          order.status = "picked_up";
          order.pickedUpAt = new Date().toISOString();
          order.trackingHistory.push({
            lat: targetLat,
            lng: targetLng,
            timestamp: new Date().toISOString(),
            status: "picked_up",
            notes: "Driver arrived at pickup location and loaded laundry bags."
          });
          stateChanged = true;
        } else if (order.status === "picked_up") {
          // Arrived at Partner workshop
          order.currentLat = targetLat;
          order.currentLng = targetLng;
          driver.currentLat = targetLat;
          driver.currentLng = targetLng;
          
          order.status = "in_processing";
          order.deliveredToPartnerAt = new Date().toISOString();
          order.processingStartedAt = new Date().toISOString();
          order.trackingHistory.push({
            lat: targetLat,
            lng: targetLng,
            timestamp: new Date().toISOString(),
            status: "in_processing",
            notes: "Driver handed over garment bags to workshop staff. Washing queued."
          });
          stateChanged = true;
        } else if (order.status === "delivery_in_progress") {
          // Arrived back at Customer
          order.currentLat = targetLat;
          order.currentLng = targetLng;
          driver.currentLat = targetLat;
          driver.currentLng = targetLng;
          
          order.status = "delivered";
          order.deliveredAt = new Date().toISOString();
          order.trackingHistory.push({
            lat: targetLat,
            lng: targetLng,
            timestamp: new Date().toISOString(),
            status: "delivered",
            notes: "Driver arrived at delivery destination. Handover OTP required."
          });
          stateChanged = true;
        }
      }
    });
  }, 4000); // Check and move drivers every 4 seconds
}

// Start driver coordinate simulator
runDriverCoordinatesSimulator();


// --- EXPRESS APPLICATION SETUP ---
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- REST ENDPOINTS ---

  // Get full state reset/seed configuration
  app.get("/api/state", (req, res) => {
    res.json({
      users,
      customers,
      drivers,
      partners,
      services,
      orders,
      platformConfig,
      walletTransactions,
      disputes,
      reviews,
      currentSessionUserId
    });
  });

  // Switch session active user (Customer / Driver / Partner / Admin simulator switcher)
  app.post("/api/auth/switch-profile", (req, res) => {
    const { userId } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User profile not found" });
    }
    currentSessionUserId = userId;
    res.json({ success: true, currentSessionUserId, user });
  });

  // Get logged in profile detail
  app.get("/api/auth/me", (req, res) => {
    const user = users.find(u => u.id === currentSessionUserId);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized or no user active" });
    }
    
    let profile: any = { ...user };
    if (user.userType === "customer") {
      profile.customer = customers.find(c => c.userId === user.id);
    } else if (user.userType === "driver") {
      profile.driver = drivers.find(d => d.userId === user.id);
    } else if (user.userType === "partner") {
      profile.partner = partners.find(p => p.userId === user.id);
    }
    res.json(profile);
  });

  // Register endpoint
  app.post("/api/auth/register", (req, res) => {
    const { email, phone, fullName, userType, detail } = req.body;

    if (!email || !phone || !fullName || !userType) {
      return res.status(400).json({ error: "Missing required profile fields" });
    }

    const exists = users.find(u => u.email === email || u.phone === phone);
    if (exists) {
      return res.status(400).json({ error: "User with this email or phone already exists" });
    }

    const newUserId = `user-${userType.slice(0, 4)}-${Math.floor(Math.random() * 10000)}`;
    const newUser: BaseUser = {
      id: newUserId,
      email,
      phone,
      fullName,
      avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?auto=format&fit=crop&q=80&w=150`,
      userType,
      isVerified: userType !== 'partner', // Partners must be approved by admin
      isActive: true,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    if (userType === 'customer') {
      const newCust: CustomerProfile = {
        id: `cust-${Math.floor(Math.random() * 10000)}`,
        userId: newUserId,
        defaultAddress: detail?.address || "Jakarta Center",
        defaultLat: detail?.lat || -6.2088,
        defaultLng: detail?.lng || 106.8456,
        totalOrders: 0,
        lifetimeSpend: 0
      };
      customers.push(newCust);
    } else if (userType === 'driver') {
      const newDriv: DriverProfile = {
        id: `driv-${Math.floor(Math.random() * 10000)}`,
        userId: newUserId,
        vehicleType: detail?.vehicleType || "Scooter Motor",
        vehiclePlate: detail?.vehiclePlate || "B 1234 XYZ",
        isOnline: true,
        currentLat: -6.2088 + (Math.random() - 0.5) * 0.03, // cluster closely
        currentLng: 106.8456 + (Math.random() - 0.5) * 0.03,
        lastLocationUpdate: new Date().toISOString(),
        ratingAvg: 5.0,
        totalDeliveries: 0,
        isApproved: true,
        documents: {
          licenseNumber: detail?.licenseNumber || "SIM-MOCK-123",
          identityNumber: detail?.identityNumber || "KTP-MOCK-321"
        }
      };
      drivers.push(newDriv);
    } else if (userType === 'partner') {
      const newPart: PartnerProfile = {
        id: `part-${Math.floor(Math.random() * 10000)}`,
        userId: newUserId,
        businessName: detail?.businessName || fullName,
        businessAddress: detail?.businessAddress || "Jl. Sudirman",
        businessLat: detail?.lat || -6.2088 + (Math.random() - 0.5) * 0.03,
        businessLng: detail?.lng || 106.8456 + (Math.random() - 0.5) * 0.03,
        phone,
        email,
        description: detail?.description || "Eco laundry service",
        logoUrl: newUser.avatarUrl,
        coverImageUrl: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&q=80&w=800",
        isOpen: true,
        isApproved: false, // Must be approved by super admin!
        ratingAvg: 0.0,
        totalOrders: 0,
        dailyCapacityKg: detail?.dailyCapacity || 100,
        commissionRate: 15.00,
        operatingHours: { "Monday-Sunday": "08:00 - 20:00" }
      };
      partners.push(newPart);

      // Seed 2 default services for this partner automatically
      services.push(
        {
          id: `srv-${newPart.id}-1`,
          partnerId: newPart.id,
          categoryId: "cat-wash-fold",
          name: "Standard Wash & Fold",
          description: "Wash, dry, and neatly fold.",
          pricePerKg: 1.50,
          processingTimeHours: 24,
          isActive: true
        },
        {
          id: `srv-${newPart.id}-2`,
          partnerId: newPart.id,
          categoryId: "cat-wash-iron",
          name: "Ironing Express",
          description: "Full hand-pressed iron services.",
          pricePerKg: 2.00,
          processingTimeHours: 12,
          isActive: true
        }
      );
    }

    currentSessionUserId = newUserId;
    res.json({ success: true, user: newUser });
  });

  // --- PARTNERS ENDPOINTS ---

  // Get all partners (filtered by nearby/approved)
  app.get("/api/partners", (req, res) => {
    // Only approved partners unless explicitly asking as Admin/Partner themselves
    const approvedPartners = partners.filter(p => p.isApproved);
    res.json(approvedPartners);
  });

  // Get all services offered by a partner
  app.get("/api/partners/:partnerId/services", (req, res) => {
    const partnerId = req.params.partnerId;
    const partnerServices = services.filter(s => s.partnerId === partnerId && s.isActive);
    res.json(partnerServices);
  });

  // Manage service catalog (for partners)
  app.post("/api/partners/:partnerId/services", (req, res) => {
    const { name, description, pricePerKg, pricePerItem, processingTimeHours, categoryId } = req.body;
    const partnerId = req.params.partnerId;

    if (!name || (!pricePerKg && !pricePerItem)) {
      return res.status(400).json({ error: "Name and pricing are required" });
    }

    const newService: LaundryService = {
      id: `srv-${partnerId}-${Math.floor(Math.random() * 10000)}`,
      partnerId,
      categoryId: categoryId || "cat-wash-fold",
      name,
      description: description || "",
      pricePerKg: pricePerKg ? parseFloat(pricePerKg) : undefined,
      pricePerItem: pricePerItem ? parseFloat(pricePerItem) : undefined,
      processingTimeHours: parseInt(processingTimeHours) || 24,
      isActive: true
    };

    services.push(newService);
    res.json(newService);
  });

  // Update capacity (for partners)
  app.put("/api/partners/:partnerId/capacity", (req, res) => {
    const { dailyCapacityKg } = req.body;
    const partner = partners.find(p => p.id === req.params.partnerId);
    if (!partner) {
      return res.status(404).json({ error: "Partner profile not found" });
    }
    partner.dailyCapacityKg = parseInt(dailyCapacityKg) || 100;
    res.json(partner);
  });

  // --- ORDERS SYSTEM ---

  // Create order
  app.post("/api/orders", (req, res) => {
    const { 
      customerId, 
      partnerId, 
      serviceType, 
      weightKg, 
      itemCount, 
      specialInstructions,
      pickupAddress,
      pickupLat,
      pickupLng,
      pickupNotes,
      deliveryAddress,
      deliveryLat,
      deliveryLng,
      deliveryNotes,
      subtotal,
      serviceFee,
      deliveryFee,
      platformFee,
      discount,
      totalAmount,
      paymentMethod
    } = req.body;

    if (!customerId || !partnerId || !totalAmount) {
      return res.status(400).json({ error: "Invalid order transaction payload" });
    }

    const orderNum = `LH-${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrder: Order = {
      id: `order-${Math.floor(Math.random() * 100000)}`,
      orderNumber: orderNum,
      customerId,
      partnerId,
      driverId: null, // assigned dynamically or immediately matched
      status: "pending",
      serviceType: serviceType || "wash_fold",
      weightKg: weightKg ? parseFloat(weightKg) : 5.0,
      itemCount: itemCount ? parseInt(itemCount) : 10,
      specialInstructions: specialInstructions || "",
      subtotal: parseFloat(subtotal) || totalAmount * 0.8,
      serviceFee: parseFloat(serviceFee) || 1.00,
      deliveryFee: parseFloat(deliveryFee) || 2.50,
      platformFee: parseFloat(platformFee) || 0.50,
      discount: parseFloat(discount) || 0.0,
      totalAmount: parseFloat(totalAmount),
      currency: "USD",
      pickupAddress,
      pickupLat: parseFloat(pickupLat) || -6.2088,
      pickupLng: parseFloat(pickupLng) || 106.8456,
      pickupNotes: pickupNotes || "",
      deliveryAddress: deliveryAddress || pickupAddress,
      deliveryLat: parseFloat(deliveryLat) || parseFloat(pickupLat) || -6.2088,
      deliveryLng: parseFloat(deliveryLng) || parseFloat(pickupLng) || 106.8456,
      deliveryNotes: deliveryNotes || "",
      createdAt: new Date().toISOString(),
      pickupScheduledAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
      deliveryScheduledAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      currentLat: parseFloat(pickupLat) || -6.2088,
      currentLng: parseFloat(pickupLng) || 106.8456,
      trackingHistory: [
        { 
          lat: parseFloat(pickupLat) || -6.2088, 
          lng: parseFloat(pickupLng) || 106.8456, 
          timestamp: new Date().toISOString(), 
          status: "pending", 
          notes: "Order placed successfully. Waiting for partner confirmation." 
        }
      ],
      otpCode: Math.floor(1000 + Math.random() * 9000).toString(),
      otpVerified: false
    };

    // Process payment transaction automatically
    const newPayment: Payment = {
      id: `pay-${Math.floor(Math.random() * 10000)}`,
      orderId: newOrder.id,
      customerId,
      amount: newOrder.totalAmount,
      currency: "USD",
      paymentMethod: paymentMethod || "card",
      paymentProvider: paymentMethod === 'wallet' ? 'wallet_balance' : 'stripe',
      status: "success",
      createdAt: new Date().toISOString()
    };

    if (paymentMethod === 'wallet') {
      const cust = customers.find(c => c.id === customerId);
      if (cust) {
        // deduct balance
        const balanceTxn: WalletTransaction = {
          id: `txn-${Math.floor(Math.random() * 10000)}`,
          userId: cust.userId,
          type: "payment",
          amount: newOrder.totalAmount,
          balanceBefore: 80.00, // mock balances
          balanceAfter: 80.00 - newOrder.totalAmount,
          referenceId: newOrder.id,
          description: `Payment for LaundryHub Order ${orderNum}`,
          createdAt: new Date().toISOString()
        };
        walletTransactions.push(balanceTxn);
      }
    }

    orders.unshift(newOrder);

    // Dynamic "Dispatch" Matching Logic
    // In our simulator, the laundry partner confirms the order immediately.
    // Let's auto-confirm after 3 seconds or trigger immediately to let the partner confirm manually.
    // To make it fun, we let the partner confirm it, but if they want immediate action we support that too.
    res.json(newOrder);
  });

  // Deposit wallet funds (custom for high interactivity)
  app.post("/api/wallet/deposit", (req, res) => {
    const { userId, amount, provider, description } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ error: "Missing required wallet fields" });
    }
    const depositAmount = parseFloat(amount);
    const balanceTxn: WalletTransaction = {
      id: `txn-${Math.floor(Math.random() * 100000)}`,
      userId,
      type: "deposit",
      amount: depositAmount,
      balanceBefore: 0.00,
      balanceAfter: 0.00,
      referenceId: `DEP-${Math.floor(100000 + Math.random() * 900000)}`,
      description: description || `Deposit via ${provider || 'Bank Transfer'}`,
      createdAt: new Date().toISOString()
    };
    walletTransactions.push(balanceTxn);
    res.json({ success: true, transaction: balanceTxn });
  });

  // Get orders list
  app.get("/api/orders", (req, res) => {
    res.json(orders);
  });

  // Retrieve a single order for real-time live map polling
  app.get("/api/orders/:id", (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order details not found" });
    }
    res.json(order);
  });

  // Cancel order
  app.post("/api/orders/:id/cancel", (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    order.status = "cancelled";
    order.cancelledAt = new Date().toISOString();
    order.cancellationReason = req.body.reason || "Cancelled by user";
    order.trackingHistory.push({
      lat: order.currentLat,
      lng: order.currentLng,
      timestamp: new Date().toISOString(),
      status: "cancelled",
      notes: `Order Cancelled. Reason: ${order.cancellationReason}`
    });

    res.json(order);
  });

  // Update order status (workshop processing or courier dispatching)
  app.put("/api/orders/:id/status", (req, res) => {
    const { status, driverId, notes } = req.body;
    const order = orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.status = status as OrderStatus;
    
    if (driverId) {
      order.driverId = driverId;
      const d = drivers.find(drv => drv.id === driverId);
      if (d) {
        order.currentLat = d.currentLat;
        order.currentLng = d.currentLng;
      }
    }

    // Capture milestones
    if (status === "driver_assigned") {
      order.trackingHistory.push({
        lat: order.currentLat,
        lng: order.currentLng,
        timestamp: new Date().toISOString(),
        status: "driver_assigned",
        notes: notes || "Professional dispatch courier assigned. Traveling to pick up garments."
      });
      // Immediately set pickup_in_progress to kick off coordinates simulation!
      order.status = "pickup_in_progress";
    } else if (status === "in_processing") {
      order.processingStartedAt = new Date().toISOString();
      order.trackingHistory.push({
        lat: order.currentLat,
        lng: order.currentLng,
        timestamp: new Date().toISOString(),
        status: "in_processing",
        notes: notes || "Workshop staff started sorted, washing, and sanitizing fabric fibers."
      });
    } else if (status === "ready_for_delivery") {
      order.processingCompletedAt = new Date().toISOString();
      order.trackingHistory.push({
        lat: order.currentLat,
        lng: order.currentLng,
        timestamp: new Date().toISOString(),
        status: "ready_for_delivery",
        notes: notes || "Washing cycle complete. Items carefully packaged and sealed. Dispatching delivery."
      });
    } else if (status === "completed") {
      order.completedAt = new Date().toISOString();
      order.trackingHistory.push({
        lat: order.currentLat,
        lng: order.currentLng,
        timestamp: new Date().toISOString(),
        status: "completed",
        notes: notes || "Order fully completed. Handover confirmed. Thank you!"
      });
    } else {
      order.trackingHistory.push({
        lat: order.currentLat,
        lng: order.currentLng,
        timestamp: new Date().toISOString(),
        status: status as OrderStatus,
        notes: notes || `Order updated to: ${status}`
      });
    }

    res.json(order);
  });

  // Secure OTP verification endpoint for courier handovers
  app.post("/api/orders/:id/verify-otp", (req, res) => {
    const { otp } = req.body;
    const order = orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.otpCode === otp) {
      order.otpVerified = true;
      order.status = "completed";
      order.completedAt = new Date().toISOString();
      order.trackingHistory.push({
        lat: order.currentLat,
        lng: order.currentLng,
        timestamp: new Date().toISOString(),
        status: "completed",
        notes: "Handover OTP verified successfully. Secure order completed."
      });
      res.json({ success: true, order });
    } else {
      res.status(400).json({ error: "Incorrect OTP. Please check the code in the Customer app." });
    }
  });

  // Photo confirmation delivery endpoint
  app.post("/api/orders/:id/confirm-delivery-photo", (req, res) => {
    const { photoUrl } = req.body;
    const order = orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.otpVerified = true;
    order.status = "completed";
    order.completedAt = new Date().toISOString();
    order.deliveryProofPhoto = photoUrl || "https://images.unsplash.com/photo-1545173168-9f19072f1787?auto=format&fit=crop&q=80&w=400";
    order.trackingHistory.push({
      lat: order.currentLat,
      lng: order.currentLng,
      timestamp: new Date().toISOString(),
      status: "completed",
      notes: "Paket berhasil diserahkan dengan bukti foto penyerahan. Kontrak kurir selesai."
    });
    res.json({ success: true, order });
  });

  // Submit reviews
  app.post("/api/reviews", (req, res) => {
    const { orderId, reviewerId, targetUserId, targetType, rating, comment } = req.body;
    
    const newReview: Review = {
      id: `rev-${Math.floor(Math.random() * 10000)}`,
      orderId,
      reviewerId,
      targetUserId,
      targetType,
      rating: parseInt(rating) || 5,
      comment: comment || "",
      createdAt: new Date().toISOString()
    };

    reviews.push(newReview);

    // Recalculate average rating of partner/driver
    if (targetType === "partner") {
      const partner = partners.find(p => p.id === targetUserId || p.userId === targetUserId);
      if (partner) {
        const pReviews = reviews.filter(r => r.targetUserId === partner.userId || r.targetUserId === partner.id);
        const sum = pReviews.reduce((acc, r) => acc + r.rating, 0);
        partner.ratingAvg = parseFloat((sum / pReviews.length).toFixed(2));
      }
    } else if (targetType === "driver") {
      const driver = drivers.find(d => d.id === targetUserId || d.userId === targetUserId);
      if (driver) {
        const dReviews = reviews.filter(r => r.targetUserId === driver.userId || r.targetUserId === driver.id);
        const sum = dReviews.reduce((acc, r) => acc + r.rating, 0);
        driver.ratingAvg = parseFloat((sum / dReviews.length).toFixed(2));
      }
    }

    res.json(newReview);
  });

  // --- DRIVER CONSOLE ENDPOINTS ---

  // Get active online drivers
  app.get("/api/drivers/online", (req, res) => {
    res.json(drivers.filter(d => d.isOnline));
  });

  // Toggle Online/Offline state
  app.put("/api/drivers/:id/online", (req, res) => {
    const { isOnline } = req.body;
    const driver = drivers.find(d => d.id === req.params.id || d.userId === req.params.id);
    if (!driver) {
      return res.status(404).json({ error: "Driver profile not found" });
    }
    driver.isOnline = isOnline;
    res.json(driver);
  });

  // --- ADMIN PORTAL ACTIONS ---

  // Admin approvals for partners & drivers
  app.put("/api/admin/approve-user/:id", (req, res) => {
    const userId = req.params.id;
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.isVerified = true;

    // Approve corresponding profile
    if (user.userType === "partner") {
      const p = partners.find(part => part.userId === userId);
      if (p) p.isApproved = true;
    } else if (user.userType === "driver") {
      const d = drivers.find(drv => drv.userId === userId);
      if (d) d.isApproved = true;
    }

    res.json({ success: true, user });
  });

  // System Config Updates
  app.put("/api/admin/config", (req, res) => {
    const { commissionRate, deliveryFeeBase, deliveryFeePerKm, surgePricingEnabled, surgePricingMultiplier } = req.body;
    
    if (commissionRate !== undefined) platformConfig.commissionRate = parseFloat(commissionRate);
    if (deliveryFeeBase !== undefined) platformConfig.deliveryFeeBase = parseFloat(deliveryFeeBase);
    if (deliveryFeePerKm !== undefined) platformConfig.deliveryFeePerKm = parseFloat(deliveryFeePerKm);
    if (surgePricingEnabled !== undefined) platformConfig.surgePricingEnabled = !!surgePricingEnabled;
    if (surgePricingMultiplier !== undefined) platformConfig.surgePricingMultiplier = parseFloat(surgePricingMultiplier);

    res.json(platformConfig);
  });

  // Manage and resolve disputes
  app.post("/api/admin/disputes/:id/resolve", (req, res) => {
    const { resolution } = req.body;
    const dispute = disputes.find(d => d.id === req.params.id);
    if (!dispute) {
      return res.status(404).json({ error: "Dispute ticket not found" });
    }

    dispute.status = "resolved";
    dispute.resolution = resolution || "Refunded standard fee";
    dispute.resolvedAt = new Date().toISOString();

    res.json(dispute);
  });

  // Create dispute
  app.post("/api/disputes", (req, res) => {
    const { orderId, raisedBy, against, type, description } = req.body;

    const newDispute: Dispute = {
      id: `disp-${Math.floor(Math.random() * 10000)}`,
      orderId,
      raisedBy,
      against,
      type,
      description,
      status: "open",
      createdAt: new Date().toISOString()
    };

    disputes.push(newDispute);
    res.json(newDispute);
  });


  // --- VITE MIDDLEWARE DEVELOPMENT FLOW ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[LaundryHub Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
