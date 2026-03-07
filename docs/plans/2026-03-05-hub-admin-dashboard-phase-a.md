# Hub Admin Dashboard — Phase A Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add role-aware navigation so admins see a Dashboard (live driver status) and Routes Oversight tab, plus replace all Unicode icons with Expo vector icons.

**Architecture:** The mobile app checks `user.role` from auth store. WORKER users see the existing 5 tabs. HUB_ADMIN/SUPER_ADMIN users see: Dashboard, Routes, Drivers (placeholder), Analytics (placeholder), Profile. Two new backend endpoints (`/api/admin/dashboard`, `/api/admin/routes`) serve aggregated cross-driver data, protected by `requireRole("HUB_ADMIN", "SUPER_ADMIN")`.

**Tech Stack:** React Native + Expo, Express + Prisma, @expo/vector-icons (Ionicons), Zustand, TypeScript

---

### Task 1: Install @expo/vector-icons and Replace Unicode Icons

**Files:**

- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/src/navigation/AppNavigator.tsx:93-156` (tab bar icons)

**Step 1: Install the icon package**

Run:

```bash
cd apps/mobile && npx expo install @expo/vector-icons
```

Expected: Package added to package.json

**Step 2: Replace Unicode icons in AppNavigator tab bar**

In `apps/mobile/src/navigation/AppNavigator.tsx`, add import at top:

```tsx
import { Ionicons } from "@expo/vector-icons";
```

Replace each Unicode `<Text>` icon with `<Ionicons>`. The tab bar section (lines ~93-156) becomes:

```tsx
{
  /* Bottom tab bar */
}
<View style={styles.tabBar}>
  <TouchableOpacity style={styles.tab} onPress={() => setActiveTab("today")} activeOpacity={0.7}>
    <Ionicons
      name="today-outline"
      size={22}
      color={activeTab === "today" ? "#3B82F6" : "#64748B"}
    />
    <Text style={[styles.tabLabel, activeTab === "today" && styles.tabLabelActive]}>Today</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.tab} onPress={() => setActiveTab("routes")} activeOpacity={0.7}>
    <Ionicons name="map-outline" size={22} color={activeTab === "routes" ? "#3B82F6" : "#64748B"} />
    <Text style={[styles.tabLabel, activeTab === "routes" && styles.tabLabelActive]}>Routes</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.tab} onPress={() => setActiveTab("scan")} activeOpacity={0.7}>
    <Ionicons name="scan-outline" size={22} color={activeTab === "scan" ? "#3B82F6" : "#64748B"} />
    <Text style={[styles.tabLabel, activeTab === "scan" && styles.tabLabelActive]}>Scan</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.tab} onPress={() => setActiveTab("earnings")} activeOpacity={0.7}>
    <Ionicons
      name="cash-outline"
      size={22}
      color={activeTab === "earnings" ? "#3B82F6" : "#64748B"}
    />
    <Text style={[styles.tabLabel, activeTab === "earnings" && styles.tabLabelActive]}>
      Earnings
    </Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.tab} onPress={() => setActiveTab("profile")} activeOpacity={0.7}>
    <Ionicons
      name="person-outline"
      size={22}
      color={activeTab === "profile" ? "#3B82F6" : "#64748B"}
    />
    <Text style={[styles.tabLabel, activeTab === "profile" && styles.tabLabelActive]}>Profile</Text>
  </TouchableOpacity>
</View>;
```

Remove `tabIcon` and `tabIconActive` from StyleSheet (no longer needed).

**Step 3: Verify the app compiles**

Run:

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: No type errors

**Step 4: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json apps/mobile/src/navigation/AppNavigator.tsx
git commit -m "feat: replace unicode icons with Ionicons vector icons"
```

---

### Task 2: Role-Aware Navigation

**Files:**

- Modify: `apps/mobile/src/navigation/AppNavigator.tsx`

**Step 1: Add admin tab type and role-based tab switching**

Update the type and state at the top of AppNavigator:

```tsx
type AppTab = "today" | "routes" | "scan" | "earnings" | "profile";
type AdminTab = "dashboard" | "adminRoutes" | "drivers" | "analytics" | "profile";
```

Inside the component, after `useAuthStore()`:

```tsx
const isAdmin = user?.role === "HUB_ADMIN" || user?.role === "SUPER_ADMIN";
const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
```

Extract `user` from auth store (add it to the destructure):

```tsx
const { isAuthenticated, isLoading, loadSession, needsOnboarding, completeOnboarding, user } =
  useAuthStore();
```

**Step 2: Add admin screen imports and render logic**

Add placeholder imports (we'll create these screens in Tasks 5-6):

```tsx
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import AdminRoutesScreen from "../screens/AdminRoutesScreen";
```

In the main tabbed app section, wrap the existing render + tab bar in a conditional:

```tsx
// Main tabbed app
if (isAdmin) {
  return (
    <View style={styles.appContainer}>
      <View style={styles.screenContainer}>
        {adminTab === "dashboard" && <AdminDashboardScreen />}
        {adminTab === "adminRoutes" && <AdminRoutesScreen onViewRoute={openRoute} />}
        {adminTab === "drivers" && (
          <PlaceholderScreen title="Drivers" subtitle="Coming in Phase C" />
        )}
        {adminTab === "analytics" && (
          <PlaceholderScreen title="Analytics" subtitle="Coming in Phase B" />
        )}
        {adminTab === "profile" && <ProfileScreen />}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setAdminTab("dashboard")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="grid-outline"
            size={22}
            color={adminTab === "dashboard" ? "#3B82F6" : "#64748B"}
          />
          <Text style={[styles.tabLabel, adminTab === "dashboard" && styles.tabLabelActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setAdminTab("adminRoutes")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="map-outline"
            size={22}
            color={adminTab === "adminRoutes" ? "#3B82F6" : "#64748B"}
          />
          <Text style={[styles.tabLabel, adminTab === "adminRoutes" && styles.tabLabelActive]}>
            Routes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setAdminTab("drivers")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="people-outline"
            size={22}
            color={adminTab === "drivers" ? "#3B82F6" : "#64748B"}
          />
          <Text style={[styles.tabLabel, adminTab === "drivers" && styles.tabLabelActive]}>
            Drivers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setAdminTab("analytics")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="bar-chart-outline"
            size={22}
            color={adminTab === "analytics" ? "#3B82F6" : "#64748B"}
          />
          <Text style={[styles.tabLabel, adminTab === "analytics" && styles.tabLabelActive]}>
            Analytics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setAdminTab("profile")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="person-outline"
            size={22}
            color={adminTab === "profile" ? "#3B82F6" : "#64748B"}
          />
          <Text style={[styles.tabLabel, adminTab === "profile" && styles.tabLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Worker tabbed app (existing code, unchanged)
return <View style={styles.appContainer}>...existing worker tabs...</View>;
```

**Step 3: Add PlaceholderScreen inline component**

Above the `export default`, add:

```tsx
function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0F172A",
      }}
    >
      <Ionicons name="construct-outline" size={48} color="#64748B" />
      <Text style={{ color: "#F8FAFC", fontSize: 24, fontWeight: "700", marginTop: 16 }}>
        {title}
      </Text>
      <Text style={{ color: "#64748B", fontSize: 14, marginTop: 8 }}>{subtitle}</Text>
    </View>
  );
}
```

**Step 4: Verify**

Run:

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: Errors for missing AdminDashboardScreen and AdminRoutesScreen (expected — created in Tasks 5-6). If so, create empty placeholder files to unblock:

Create `apps/mobile/src/screens/AdminDashboardScreen.tsx`:

```tsx
import React from "react";
import { View, Text } from "react-native";

export default function AdminDashboardScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0F172A",
      }}
    >
      <Text style={{ color: "#F8FAFC", fontSize: 18 }}>Loading dashboard...</Text>
    </View>
  );
}
```

Create `apps/mobile/src/screens/AdminRoutesScreen.tsx`:

```tsx
import React from "react";
import { View, Text } from "react-native";
import type { Route } from "../types";

export default function AdminRoutesScreen({ onViewRoute }: { onViewRoute: (r: Route) => void }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0F172A",
      }}
    >
      <Text style={{ color: "#F8FAFC", fontSize: 18 }}>Loading routes...</Text>
    </View>
  );
}
```

**Step 5: Commit**

```bash
git add apps/mobile/src/
git commit -m "feat: role-aware navigation — admins see Dashboard/Routes/Drivers/Analytics tabs"
```

---

### Task 3: Backend — GET /api/admin/dashboard

**Files:**

- Create: `apps/api/src/routes/admin.ts`
- Modify: `apps/api/src/index.ts` (wire route)

**Step 1: Create admin routes file**

Create `apps/api/src/routes/admin.ts`:

```ts
import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../lib/errors.js";
import prisma from "../lib/prisma.js";

const router = Router();

// All admin routes require auth + admin role
router.use(authenticate);
router.use(requireRole("HUB_ADMIN", "SUPER_ADMIN"));

// GET /api/admin/dashboard — live driver status overview
router.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active shifts (started today, status IN_PROGRESS)
    const activeShifts = await prisma.shift.findMany({
      where: {
        status: "IN_PROGRESS",
        startTime: { gte: today },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
    });

    // Today's routes with driver info
    const todayRoutes = await prisma.route.findMany({
      where: { date: { gte: today } },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        platformLink: {
          include: { platform: { select: { name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Aggregate stats
    const totalRoutes = todayRoutes.length;
    const inProgress = todayRoutes.filter((r) => r.status === "IN_PROGRESS").length;
    const completed = todayRoutes.filter((r) => r.status === "COMPLETED").length;
    const completionRate = totalRoutes > 0 ? Math.round((completed / totalRoutes) * 100) : 0;

    // Build driver cards — each active driver with their current route
    const driverMap = new Map<
      string,
      {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl: string | null;
        shiftStart: string;
        currentRoute: (typeof todayRoutes)[0] | null;
        routesCompleted: number;
        routesTotal: number;
      }
    >();

    for (const shift of activeShifts) {
      const driverRoutes = todayRoutes.filter((r) => r.userId === shift.userId);
      const activeRoute = driverRoutes.find((r) => r.status === "IN_PROGRESS") || null;
      driverMap.set(shift.userId, {
        id: shift.user.id,
        firstName: shift.user.firstName,
        lastName: shift.user.lastName,
        email: shift.user.email,
        avatarUrl: shift.user.avatarUrl,
        shiftStart: shift.startTime.toISOString(),
        currentRoute: activeRoute,
        routesCompleted: driverRoutes.filter((r) => r.status === "COMPLETED").length,
        routesTotal: driverRoutes.length,
      });
    }

    res.json({
      activeDrivers: driverMap.size,
      routes: {
        total: totalRoutes,
        inProgress,
        completed,
        completionRate,
      },
      drivers: Array.from(driverMap.values()),
      todayRoutes: todayRoutes.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        totalStops: r.totalStops,
        completedStops: r.completedStops,
        totalPackages: r.totalPackages,
        deliveredPackages: r.deliveredPackages,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        driver: r.user,
        platform: r.platformLink?.platform?.name || null,
      })),
    });
  }),
);

export default router;
```

**Step 2: Wire admin routes in index.ts**

In `apps/api/src/index.ts`, add import:

```ts
import adminRoutes from "./routes/admin.js";
```

Add route registration after the templates line:

```ts
app.use("/api/admin", apiLimiter, adminRoutes);
```

**Step 3: Verify backend compiles**

Run:

```bash
cd apps/api && npx tsc --noEmit
```

Expected: No errors

**Step 4: Commit**

```bash
git add apps/api/src/routes/admin.ts apps/api/src/index.ts
git commit -m "feat: add GET /api/admin/dashboard endpoint for live driver status"
```

---

### Task 4: Backend — GET /api/admin/routes

**Files:**

- Modify: `apps/api/src/routes/admin.ts`

**Step 1: Add routes oversight endpoint**

Append to `apps/api/src/routes/admin.ts`, before `export default router`:

```ts
// GET /api/admin/routes — all routes for today across all drivers
router.get(
  "/routes",
  asyncHandler(async (req, res) => {
    const { status, driver, platform, date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const where: Record<string, unknown> = {
      date: { gte: targetDate, lt: nextDay },
    };

    if (status) where.status = status as string;
    if (driver) where.userId = driver as string;
    if (platform) {
      where.platformLink = { platform: { slug: platform as string } };
    }

    const routes = await prisma.route.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        platformLink: {
          include: { platform: { select: { id: true, name: true, slug: true } } },
        },
        stops: {
          select: { id: true, status: true, address: true, sequence: true, facilityName: true },
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get unique drivers and platforms for filter options
    const drivers = await prisma.user.findMany({
      where: { role: "WORKER" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    });

    const platforms = await prisma.deliveryPlatform.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    res.json({
      routes: routes.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        date: r.date,
        totalStops: r.totalStops,
        completedStops: r.completedStops,
        totalPackages: r.totalPackages,
        deliveredPackages: r.deliveredPackages,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        notes: r.notes,
        driver: r.user,
        platform: r.platformLink?.platform || null,
        stops: r.stops,
      })),
      filters: { drivers, platforms },
      total: routes.length,
    });
  }),
);
```

**Step 2: Verify**

Run:

```bash
cd apps/api && npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add apps/api/src/routes/admin.ts
git commit -m "feat: add GET /api/admin/routes endpoint with filters"
```

---

### Task 5: Mobile — Admin Dashboard Screen (Live Status)

**Files:**

- Rewrite: `apps/mobile/src/screens/AdminDashboardScreen.tsx`
- Modify: `apps/mobile/src/services/api.ts` (add admin API methods)
- Modify: `apps/mobile/src/types/index.ts` (add admin types)

**Step 1: Add admin types**

Append to `apps/mobile/src/types/index.ts`:

```ts
// ─── Admin Types ─────────────────────────────────────────

export interface AdminDashboardData {
  activeDrivers: number;
  routes: {
    total: number;
    inProgress: number;
    completed: number;
    completionRate: number;
  };
  drivers: AdminDriverCard[];
  todayRoutes: AdminRouteCard[];
}

export interface AdminDriverCard {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  shiftStart: string;
  currentRoute: AdminRouteCard | null;
  routesCompleted: number;
  routesTotal: number;
}

export interface AdminRouteCard {
  id: string;
  name: string | null;
  status: RouteStatus;
  totalStops: number;
  completedStops: number;
  totalPackages: number;
  deliveredPackages: number;
  startedAt: string | null;
  completedAt: string | null;
  driver: { id: string; firstName: string; lastName: string };
  platform: string | null;
}

export interface AdminRoutesData {
  routes: AdminRouteDetail[];
  filters: {
    drivers: { id: string; firstName: string; lastName: string }[];
    platforms: { id: string; name: string; slug: string }[];
  };
  total: number;
}

export interface AdminRouteDetail extends AdminRouteCard {
  date: string;
  notes: string | null;
  stops: {
    id: string;
    status: StopStatus;
    address: string;
    sequence: number;
    facilityName: string | null;
  }[];
}
```

**Step 2: Add admin API methods**

Append to `apps/mobile/src/services/api.ts`, inside the ApiClient class before the closing `}`:

```ts
// ─── Admin ──────────────────────────────────────────────

async getAdminDashboard(): Promise<import("../types").AdminDashboardData> {
  return this.request("/admin/dashboard");
}

async getAdminRoutes(params?: {
  status?: string;
  driver?: string;
  platform?: string;
  date?: string;
}): Promise<import("../types").AdminRoutesData> {
  const query = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
        .join("&")
    : "";
  return this.request(`/admin/routes${query}`);
}
```

**Step 3: Build AdminDashboardScreen**

Rewrite `apps/mobile/src/screens/AdminDashboardScreen.tsx`:

```tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import type { AdminDashboardData, AdminDriverCard } from "../types";

export default function AdminDashboardScreen() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getAdminDashboard();
      setData(result);
    } catch (err) {
      console.error("Failed to fetch admin dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Failed to load dashboard</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
      }
    >
      <Text style={styles.header}>Dashboard</Text>
      <Text style={styles.subheader}>Live driver activity</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard icon="people" label="Active Drivers" value={data.activeDrivers} color="#10B981" />
        <StatCard icon="map" label="Total Routes" value={data.routes.total} color="#3B82F6" />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          icon="checkmark-circle"
          label="Completed"
          value={data.routes.completed}
          color="#8B5CF6"
        />
        <StatCard
          icon="trending-up"
          label="Completion"
          value={`${data.routes.completionRate}%`}
          color="#F59E0B"
        />
      </View>

      {/* Active drivers */}
      <Text style={styles.sectionTitle}>Active Drivers</Text>
      {data.drivers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="moon-outline" size={32} color="#64748B" />
          <Text style={styles.emptyText}>No drivers on shift</Text>
        </View>
      ) : (
        data.drivers.map((driver) => <DriverCard key={driver.id} driver={driver} />)
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DriverCard({ driver }: { driver: AdminDriverCard }) {
  const shiftDuration = Math.round(
    (Date.now() - new Date(driver.shiftStart).getTime()) / (1000 * 60),
  );
  const hours = Math.floor(shiftDuration / 60);
  const mins = shiftDuration % 60;

  return (
    <View style={styles.driverCard}>
      <View style={styles.driverHeader}>
        <View style={styles.driverAvatar}>
          <Text style={styles.driverInitials}>
            {driver.firstName[0]}
            {driver.lastName[0]}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.driverName}>
            {driver.firstName} {driver.lastName}
          </Text>
          <Text style={styles.driverMeta}>
            On shift: {hours}h {mins}m | Routes: {driver.routesCompleted}/{driver.routesTotal}
          </Text>
        </View>
      </View>

      {driver.currentRoute ? (
        <View style={styles.routeInfo}>
          <Text style={styles.routeLabel}>Current Route</Text>
          <Text style={styles.routeName}>{driver.currentRoute.name || "Unnamed Route"}</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${driver.currentRoute.totalStops > 0 ? (driver.currentRoute.completedStops / driver.currentRoute.totalStops) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {driver.currentRoute.completedStops}/{driver.currentRoute.totalStops} stops
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.noRoute}>No active route</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A" },
  header: { color: "#F8FAFC", fontSize: 28, fontWeight: "800", marginTop: 48 },
  subheader: { color: "#64748B", fontSize: 14, marginTop: 4, marginBottom: 20 },
  errorText: { color: "#EF4444", fontSize: 16, marginTop: 12 },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statValue: { color: "#F8FAFC", fontSize: 28, fontWeight: "700", marginTop: 8 },
  statLabel: { color: "#94A3B8", fontSize: 12, marginTop: 4 },

  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 12,
  },

  emptyCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
  },
  emptyText: { color: "#64748B", fontSize: 14, marginTop: 8 },

  driverCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  driverHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  driverInitials: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  driverName: { color: "#F8FAFC", fontSize: 16, fontWeight: "600" },
  driverMeta: { color: "#94A3B8", fontSize: 12, marginTop: 2 },

  routeInfo: { marginTop: 12, backgroundColor: "#0F172A", borderRadius: 8, padding: 12 },
  routeLabel: { color: "#64748B", fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  routeName: { color: "#F8FAFC", fontSize: 14, fontWeight: "600", marginTop: 4 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#334155",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#3B82F6", borderRadius: 3 },
  progressText: { color: "#94A3B8", fontSize: 12 },
  noRoute: { color: "#64748B", fontSize: 13, marginTop: 12 },
});
```

**Step 4: Verify**

Run:

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: No errors

**Step 5: Commit**

```bash
git add apps/mobile/src/screens/AdminDashboardScreen.tsx apps/mobile/src/services/api.ts apps/mobile/src/types/index.ts
git commit -m "feat: admin dashboard screen with live driver status cards"
```

---

### Task 6: Mobile — Admin Routes Oversight Screen

**Files:**

- Rewrite: `apps/mobile/src/screens/AdminRoutesScreen.tsx`

**Step 1: Build AdminRoutesScreen with filters**

Rewrite `apps/mobile/src/screens/AdminRoutesScreen.tsx`:

```tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import type { Route, AdminRoutesData, AdminRouteDetail } from "../types";

const STATUS_FILTERS = ["ALL", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "#F59E0B",
  IN_PROGRESS: "#3B82F6",
  COMPLETED: "#10B981",
  CANCELLED: "#EF4444",
};

export default function AdminRoutesScreen({ onViewRoute }: { onViewRoute: (r: Route) => void }) {
  const [data, setData] = useState<AdminRoutesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [driverFilter, setDriverFilter] = useState<string | undefined>();

  const fetchData = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (driverFilter) params.driver = driverFilter;
      const result = await api.getAdminRoutes(params);
      setData(result);
    } catch (err) {
      console.error("Failed to fetch admin routes:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, driverFilter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
      }
    >
      <Text style={styles.header}>Routes Oversight</Text>
      <Text style={styles.subheader}>All drivers, today</Text>

      {/* Status filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text
              style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}
            >
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Driver filter chips */}
      {data?.filters.drivers && data.filters.drivers.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !driverFilter && styles.filterChipActive]}
            onPress={() => setDriverFilter(undefined)}
          >
            <Text style={[styles.filterChipText, !driverFilter && styles.filterChipTextActive]}>
              All Drivers
            </Text>
          </TouchableOpacity>
          {data.filters.drivers.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={[styles.filterChip, driverFilter === d.id && styles.filterChipActive]}
              onPress={() => setDriverFilter(d.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  driverFilter === d.id && styles.filterChipTextActive,
                ]}
              >
                {d.firstName} {d.lastName[0]}.
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Route count */}
      <Text style={styles.countText}>{data?.total || 0} routes</Text>

      {/* Route cards */}
      {!data?.routes.length ? (
        <View style={styles.emptyCard}>
          <Ionicons name="map-outline" size={32} color="#64748B" />
          <Text style={styles.emptyText}>No routes match filters</Text>
        </View>
      ) : (
        data.routes.map((route) => (
          <TouchableOpacity
            key={route.id}
            style={styles.routeCard}
            onPress={() =>
              onViewRoute({
                id: route.id,
                date: route.date,
                status: route.status,
                name: route.name,
                totalStops: route.totalStops,
                completedStops: route.completedStops,
                totalPackages: route.totalPackages,
                deliveredPackages: route.deliveredPackages,
                startedAt: route.startedAt,
                completedAt: route.completedAt,
                notes: route.notes,
              } as Route)
            }
            activeOpacity={0.7}
          >
            <View style={styles.routeHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeName}>{route.name || "Unnamed Route"}</Text>
                <Text style={styles.routeDriver}>
                  {route.driver.firstName} {route.driver.lastName}
                  {route.platform ? ` · ${route.platform.name}` : ""}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: (STATUS_COLORS[route.status] || "#64748B") + "20" },
                ]}
              >
                <Text
                  style={[styles.statusText, { color: STATUS_COLORS[route.status] || "#64748B" }]}
                >
                  {route.status.replace("_", " ")}
                </Text>
              </View>
            </View>

            {/* Progress */}
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${route.totalStops > 0 ? (route.completedStops / route.totalStops) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {route.completedStops}/{route.totalStops} stops
              </Text>
            </View>

            {/* Stop summary */}
            {route.stops.length > 0 && (
              <View style={styles.stopsPreview}>
                {route.stops.slice(0, 3).map((stop) => (
                  <Text key={stop.id} style={styles.stopText} numberOfLines={1}>
                    {stop.sequence}. {stop.facilityName || stop.address}{" "}
                    <Text style={{ color: STATUS_COLORS[stop.status] || "#64748B" }}>
                      ({stop.status.toLowerCase()})
                    </Text>
                  </Text>
                ))}
                {route.stops.length > 3 && (
                  <Text style={styles.moreStops}>+{route.stops.length - 3} more stops</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A" },
  header: { color: "#F8FAFC", fontSize: 28, fontWeight: "800", marginTop: 48 },
  subheader: { color: "#64748B", fontSize: 14, marginTop: 4, marginBottom: 16 },

  filterRow: { flexDirection: "row", marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#1E293B",
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: "#3B82F6" },
  filterChipText: { color: "#94A3B8", fontSize: 13, fontWeight: "600" },
  filterChipTextActive: { color: "#FFF" },

  countText: { color: "#64748B", fontSize: 13, marginBottom: 12 },

  emptyCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
  },
  emptyText: { color: "#64748B", fontSize: 14, marginTop: 8 },

  routeCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  routeHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  routeName: { color: "#F8FAFC", fontSize: 16, fontWeight: "600" },
  routeDriver: { color: "#94A3B8", fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },

  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#334155",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#3B82F6", borderRadius: 3 },
  progressText: { color: "#94A3B8", fontSize: 12 },

  stopsPreview: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#334155" },
  stopText: { color: "#CBD5E1", fontSize: 13, marginBottom: 4 },
  moreStops: { color: "#64748B", fontSize: 12, marginTop: 4 },
});
```

**Step 2: Verify**

Run:

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add apps/mobile/src/screens/AdminRoutesScreen.tsx
git commit -m "feat: admin routes oversight screen with status and driver filters"
```

---

### Task 7: End-to-End Verification

**Step 1: Type-check both apps**

Run:

```bash
cd apps/api && npx tsc --noEmit && echo "API OK"
cd apps/mobile && npx tsc --noEmit && echo "Mobile OK"
```

Expected: Both pass

**Step 2: Test admin endpoints with curl**

Start the API if not running:

```bash
cd apps/api && npm run dev &
```

Login as Glenn (SUPER_ADMIN):

```bash
TOKEN=$(curl -s http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"glenn@deliverybridge.app","password":"demo1234"}' | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token")

curl -s http://localhost:3001/api/admin/dashboard -H "Authorization: Bearer $TOKEN" | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')),null,2)"

curl -s http://localhost:3001/api/admin/routes -H "Authorization: Bearer $TOKEN" | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')),null,2)"
```

Expected: Both return JSON with correct structure. Dashboard has `activeDrivers`, `routes`, `drivers`, `todayRoutes`. Routes has `routes`, `filters`, `total`.

Test WORKER is denied:

```bash
WORKER_TOKEN=$(curl -s http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"demo@deliverybridge.app","password":"demo1234"}' | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token")

curl -s http://localhost:3001/api/admin/dashboard -H "Authorization: Bearer $WORKER_TOKEN"
```

Expected: `{"error":"Insufficient permissions"}` with 403 status

**Step 3: Verify mobile app shows correct tabs**

Open the app, login as Glenn — should see Dashboard/Routes/Drivers/Analytics/Profile tabs.
Logout, login as Demo Driver — should see Today/Routes/Scan/Earnings/Profile tabs.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: hub admin dashboard phase A — live status + route oversight"
```

---

## Summary

| Task | What                                     | Layer   |
| ---- | ---------------------------------------- | ------- |
| 1    | Replace Unicode icons with Ionicons      | Mobile  |
| 2    | Role-aware tab navigation                | Mobile  |
| 3    | GET /api/admin/dashboard                 | Backend |
| 4    | GET /api/admin/routes                    | Backend |
| 5    | AdminDashboardScreen (live driver cards) | Mobile  |
| 6    | AdminRoutesScreen (filters + oversight)  | Mobile  |
| 7    | End-to-end verification                  | Both    |
