import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import api from "../services/api";
import type { Route, RouteStatus, PlatformLink } from "../types";

const isWeb = Platform.OS === "web";

type FilterTab = "all" | "active" | "completed";

interface Props {
  onViewRoute: (route: Route) => void;
}

// ─── Status Badge ─────────────────────────────────────────

function RouteBadge({ status }: { status: RouteStatus }) {
  const configs: Record<RouteStatus, { bg: string; color: string }> = {
    ASSIGNED: { bg: "#451A03", color: "#F59E0B" },
    IN_PROGRESS: { bg: "#064E3B", color: "#34D399" },
    COMPLETED: { bg: "#1E3A5F", color: "#3B82F6" },
    CANCELLED: { bg: "#450A0A", color: "#EF4444" },
  };
  const c = configs[status] || { bg: "#1E293B", color: "#94A3B8" };
  return (
    <View style={[badgeStyles.badge, { backgroundColor: c.bg }]}>
      <Text style={[badgeStyles.text, { color: c.color }]}>{status.replace(/_/g, " ")}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  text: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
});

// ─── Route Card ──────────────────────────────────────────

function RouteCard({ route, onPress }: { route: Route; onPress: () => void }) {
  const dateLabel = new Date(route.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={cardStyles.topRow}>
        <View style={cardStyles.nameCol}>
          <Text style={cardStyles.name} numberOfLines={1}>
            {route.name || `Route ${route.id.slice(-6)}`}
          </Text>
          <Text style={cardStyles.date}>{dateLabel}</Text>
          {route.platformLink && (
            <Text style={cardStyles.platform}>{route.platformLink.platform?.name}</Text>
          )}
        </View>
        <RouteBadge status={route.status} />
      </View>
      <View style={cardStyles.stats}>
        <Text style={cardStyles.stat}>
          {route.completedStops}/{route.totalStops} stops
        </Text>
        <Text style={cardStyles.dot}> · </Text>
        <Text style={cardStyles.stat}>
          {route.deliveredPackages}/{route.totalPackages} pkgs
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  nameCol: { flex: 1, marginRight: 10 },
  name: { fontSize: 16, fontWeight: "700", color: "#F8FAFC" },
  date: { fontSize: 12, color: "#64748B", marginTop: 2 },
  platform: { fontSize: 12, color: "#475569", marginTop: 1 },
  stats: { flexDirection: "row", alignItems: "center" },
  stat: { fontSize: 13, color: "#94A3B8" },
  dot: { color: "#334155" },
});

// ─── Create Route Form ───────────────────────────────────

function CreateRouteForm({
  platformLinks,
  onCreated,
  onCancel,
}: {
  platformLinks: PlatformLink[];
  onCreated: (route: Route) => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [name, setName] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [selectedLinkId, setSelectedLinkId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      if (isWeb) window.alert("Route name is required");
      return;
    }
    setSaving(true);
    try {
      const result = await api.createRoute({
        name: name.trim(),
        date: date || today,
        platformLinkId: selectedLinkId || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated(result.route);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create route";
      if (isWeb) window.alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={formStyles.overlay}>
      <ScrollView style={formStyles.sheet} keyboardShouldPersistTaps="handled">
        <Text style={formStyles.title}>Create Route</Text>

        <Text style={formStyles.label}>Route Name *</Text>
        <TextInput
          style={formStyles.input}
          placeholder="e.g. Morning Run, Zone 4..."
          placeholderTextColor="#475569"
          value={name}
          onChangeText={setName}
        />

        <Text style={formStyles.label}>Date</Text>
        <TextInput
          style={formStyles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#475569"
          value={date}
          onChangeText={setDate}
        />

        {platformLinks.length > 0 && (
          <>
            <Text style={formStyles.label}>Platform (optional)</Text>
            <View style={formStyles.platformList}>
              <TouchableOpacity
                style={[formStyles.platformOption, !selectedLinkId && formStyles.platformSelected]}
                onPress={() => setSelectedLinkId("")}
                activeOpacity={0.7}
              >
                <Text style={formStyles.platformText}>None</Text>
              </TouchableOpacity>
              {platformLinks.map((link) => (
                <TouchableOpacity
                  key={link.id}
                  style={[
                    formStyles.platformOption,
                    selectedLinkId === link.id && formStyles.platformSelected,
                  ]}
                  onPress={() => setSelectedLinkId(link.id)}
                  activeOpacity={0.7}
                >
                  <Text style={formStyles.platformText}>
                    {link.displayName || link.platform.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={formStyles.label}>Notes (optional)</Text>
        <TextInput
          style={[formStyles.input, formStyles.textarea]}
          placeholder="Any notes about this route..."
          placeholderTextColor="#475569"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <View style={formStyles.actions}>
          <TouchableOpacity style={formStyles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={formStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[formStyles.submitBtn, saving && formStyles.disabled]}
            onPress={submit}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={formStyles.submitText}>{saving ? "Creating..." : "Create Route"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const formStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
    zIndex: 100,
  },
  sheet: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "85%",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#334155",
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  platformList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  platformOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
  },
  platformSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#1E3A5F",
  },
  platformText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#CBD5E1",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#94A3B8",
  },
  submitBtn: {
    flex: 1,
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  disabled: { opacity: 0.5 },
});

// ─── RoutesScreen ─────────────────────────────────────────

export default function RoutesScreen({ onViewRoute }: Props) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [platformLinks, setPlatformLinks] = useState<PlatformLink[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [routeRes, dashRes] = await Promise.all([api.getRoutes(), api.getDashboard()]);
      setRoutes(routeRes.routes);
      setPlatformLinks(dashRes.platformLinks || []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = routes.filter((r) => {
    if (filter === "active") return r.status === "ASSIGNED" || r.status === "IN_PROGRESS";
    if (filter === "completed") return r.status === "COMPLETED";
    return true;
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, Route[]>>((acc, r) => {
    const day = r.date.split("T")[0];
    if (!acc[day]) acc[day] = [];
    acc[day].push(r);
    return acc;
  }, {});

  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const handleCreated = (route: Route) => {
    setShowCreate(false);
    setRoutes((prev) => [route, ...prev]);
    onViewRoute(route);
  };

  const FILTERS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Routes</Text>
        {/* Filter chips */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor="#3B82F6"
            />
          }
        >
          {sortedDays.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No routes yet</Text>
              <Text style={styles.emptyBody}>Create your first route to get started.</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setShowCreate(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyBtnText}>+ Create Route</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedDays.map((day) => {
              const dayRoutes = grouped[day];
              const dateLabel = new Date(day + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              });
              const isToday = day === new Date().toISOString().split("T")[0];
              return (
                <View key={day} style={styles.dayGroup}>
                  <Text style={styles.dayLabel}>{isToday ? "Today" : dateLabel}</Text>
                  {dayRoutes.map((route) => (
                    <RouteCard key={route.id} route={route} onPress={() => onViewRoute(route)} />
                  ))}
                </View>
              );
            })
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {showCreate && (
        <CreateRouteForm
          platformLinks={platformLinks}
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  chipActive: {
    backgroundColor: "#1E3A5F",
    borderColor: "#3B82F6",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  chipTextActive: {
    color: "#3B82F6",
  },
  scroll: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayGroup: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emptyState: {
    margin: 20,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 36,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: -2,
  },
});
