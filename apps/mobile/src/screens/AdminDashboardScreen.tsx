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
    const interval = setInterval(fetchData, 30000);
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
