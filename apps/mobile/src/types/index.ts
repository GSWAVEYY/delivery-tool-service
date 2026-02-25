// Local types for mobile app — mirrors backend API responses

export type UserRole = "WORKER" | "HUB_ADMIN" | "SUPER_ADMIN";
export type ShiftStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  isPremium: boolean;
  premiumUntil?: string;
  createdAt: string;
}

export interface DeliveryPlatform {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  deepLinkScheme?: string;
  webPortalUrl?: string;
  androidPackage?: string;
  iosScheme?: string;
  hasOfficialApi: boolean;
}

export interface PlatformLink {
  id: string;
  userId: string;
  platformId: string;
  displayName?: string;
  username?: string;
  isActive: boolean;
  lastAccessed?: string;
  sortOrder: number;
  platform: DeliveryPlatform;
}

export interface Shift {
  id: string;
  platform: string;
  startTime: string;
  endTime?: string;
  status: ShiftStatus;
  notes?: string;
}

export interface EarningsSummary {
  earnings: number;
  tips: number;
  deliveries: number;
}

export interface DashboardData {
  platformLinks: PlatformLink[];
  todayShifts: Shift[];
  earningsSummary: {
    last7Days: number;
    tips7Days: number;
    recordCount: number;
  };
  unreadNotifications: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface PlatformLaunchData {
  platform: DeliveryPlatform;
  launchUrl?: string;
  androidPackage?: string;
  iosScheme?: string;
}

// ─── Delivery Ops ────────────────────────────────────────

export type RouteStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type StopStatus = "PENDING" | "ARRIVED" | "COMPLETED" | "SKIPPED" | "ATTEMPTED";
export type PackageStatus =
  | "PENDING"
  | "SCANNED_IN"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RETURNED"
  | "DAMAGED";

export interface Route {
  id: string;
  platformLinkId?: string;
  date: string;
  status: RouteStatus;
  name?: string;
  totalStops: number;
  completedStops: number;
  totalPackages: number;
  deliveredPackages: number;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  platformLink?: PlatformLink;
}

export interface RouteDetail extends Route {
  stops: Stop[];
}

export interface Stop {
  id: string;
  routeId: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  sequence: number;
  status: StopStatus;
  arrivedAt?: string;
  completedAt?: string;
  notes?: string;
  packages: Package[];
  // Medical delivery fields
  facilityName?: string;
  facilityType?: string;
  contactName?: string;
  contactPhone?: string;
  deliveryWindow?: string;
}

export interface Package {
  id: string;
  routeId: string;
  stopId?: string;
  trackingNumber: string;
  barcode?: string;
  status: PackageStatus;
  scannedAt?: string;
  deliveredAt?: string;
  recipientName?: string;
  notes?: string;
  // Medical delivery fields
  requiresSignature: boolean;
  temperatureSensitive: boolean;
  temperatureRange?: string;
  priority?: string;
  deliveryInstructions?: string;
  recipientType?: string;
}

export interface TodayData {
  todayRoutes: Route[];
  stats: {
    totalStops: number;
    completedStops: number;
    totalPackages: number;
    deliveredPackages: number;
    activeRoutes: number;
  };
}
