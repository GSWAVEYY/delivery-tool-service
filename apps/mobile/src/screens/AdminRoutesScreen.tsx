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
import type { Route, AdminRoutesData } from "../types";

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

      <Text style={styles.countText}>{data?.total || 0} routes</Text>

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
