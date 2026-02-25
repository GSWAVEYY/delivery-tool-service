import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Platform,
  Linking,
} from "react-native";
import { useAuthStore } from "../store/auth";
import api from "../services/api";
import type { Route, TodayData, PlatformLink } from "../types";
import { getPlatformColor, getPlatformInitial } from "../utils/platformColors";

const isWeb = Platform.OS === "web";

interface Props {
  onViewRoute: (route: Route) => void;
  onCreateRoute: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "IN_PROGRESS"
      ? "#34D399"
      : status === "COMPLETED"
        ? "#3B82F6"
        : status === "CANCELLED"
          ? "#EF4444"
          : "#F59E0B";
  const bg =
    status === "IN_PROGRESS"
      ? "#064E3B"
      : status === "COMPLETED"
        ? "#1E3A5F"
        : status === "CANCELLED"
          ? "#450A0A"
          : "#451A03";
  return (
    <View style={[badgeStyles.badge, { backgroundColor: bg }]}>
      <Text style={[badgeStyles.text, { color }]}>{status.replace(/_/g, " ")}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${Math.round(pct * 100)}%` as `${number}%` }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: "#1E293B",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 10,
  },
  fill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
});

function PlatformBadge({ platformName }: { platformName: string }) {
  const color = getPlatformColor(platformName);
  return (
    <View
      style={[
        platformBadgeStyles.pill,
        { backgroundColor: color + "22", borderColor: color + "55" },
      ]}
    >
      <Text style={[platformBadgeStyles.text, { color }]}>{platformName}</Text>
    </View>
  );
}

const platformBadgeStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});

function RouteCard({
  route,
  onPress,
  onStart,
}: {
  route: Route;
  onPress: () => void;
  onStart?: () => void;
}) {
  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={cardStyles.topRow}>
        <View style={cardStyles.nameCol}>
          <Text style={cardStyles.name} numberOfLines={1}>
            {route.name || `Route ${route.id.slice(-6)}`}
          </Text>
          {route.platformLink?.platform?.name && (
            <PlatformBadge platformName={route.platformLink.platform.name} />
          )}
        </View>
        <StatusBadge status={route.status} />
      </View>

      <View style={cardStyles.statsRow}>
        <Text style={cardStyles.stat}>
          {route.completedStops}/{route.totalStops} stops
        </Text>
        <Text style={cardStyles.statDot}> · </Text>
        <Text style={cardStyles.stat}>
          {route.deliveredPackages}/{route.totalPackages} pkgs
        </Text>
      </View>

      {route.status === "ASSIGNED" && onStart && (
        <TouchableOpacity style={cardStyles.startBtn} onPress={onStart} activeOpacity={0.8}>
          <Text style={cardStyles.startBtnText}>Start Route</Text>
        </TouchableOpacity>
      )}

      {route.status === "IN_PROGRESS" && (
        <ProgressBar value={route.completedStops} total={route.totalStops} />
      )}
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  nameCol: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    fontSize: 13,
    color: "#94A3B8",
  },
  statDot: {
    color: "#334155",
  },
  startBtn: {
    marginTop: 12,
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default function TodayScreen({ onViewRoute, onCreateRoute }: Props) {
  const { user } = useAuthStore();
  const [data, setData] = useState<TodayData | null>(null);
  const [platformLinks, setPlatformLinks] = useState<PlatformLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [todayResult, dashResult] = await Promise.all([api.getToday(), api.getDashboard()]);
      setData(todayResult);
      setPlatformLinks(dashResult.platformLinks || []);
    } catch {
      // non-fatal — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStartRoute = async (route: Route) => {
    try {
      await api.updateRouteStatus(route.id, "IN_PROGRESS");
      await load();
      onViewRoute({ ...route, status: "IN_PROGRESS" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start route";
      if (isWeb) window.alert(msg);
    }
  };

  const handleLaunch = async (link: PlatformLink) => {
    try {
      const result = await api.launchPlatform(link.id);
      const url = result.launchUrl || link.platform.webPortalUrl;
      if (!url) return;
      if (isWeb) {
        window.open(url, "_blank");
      } else {
        Linking.openURL(url).catch(() => {
          if (link.platform.webPortalUrl) Linking.openURL(link.platform.webPortalUrl);
        });
      }
    } catch {
      // non-fatal
    }
  };

  const activeRoute = data?.todayRoutes.find((r) => r.status === "IN_PROGRESS");
  const stats = data?.stats;

  return (
    <View style={styles.container}>
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>Today</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <View style={styles.brand}>
            <Text style={styles.brandText}>DB</Text>
          </View>
        </View>

        {/* Stats bar */}
        {stats && (
          <View style={styles.statsBar}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{stats.activeRoutes}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statNum}>
                {stats.completedStops}/{stats.totalStops}
              </Text>
              <Text style={styles.statLabel}>Stops</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statNum}>
                {stats.deliveredPackages}/{stats.totalPackages}
              </Text>
              <Text style={styles.statLabel}>Packages</Text>
            </View>
          </View>
        )}

        {/* Platform cards */}
        <View style={styles.platformSection}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 20 }]}>Your Platforms</Text>
          {platformLinks.length === 0 ? (
            <TouchableOpacity
              style={styles.platformCTA}
              onPress={onCreateRoute}
              activeOpacity={0.8}
            >
              <Text style={styles.platformCTAText}>Link your delivery platforms →</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.platformScroll}
            >
              {platformLinks.map((link) => {
                const color = getPlatformColor(link.platform.name);
                const initial = getPlatformInitial(link.platform.name);
                const routeCount = (data?.todayRoutes || []).filter(
                  (r) =>
                    r.platformLink?.platformId === link.platformId || r.platformLinkId === link.id,
                ).length;
                return (
                  <View key={link.id} style={styles.platformCard}>
                    <View
                      style={[
                        styles.platformIcon,
                        { backgroundColor: color + "22", borderColor: color + "55" },
                      ]}
                    >
                      <Text style={[styles.platformInitial, { color }]}>{initial}</Text>
                    </View>
                    <Text style={styles.platformName} numberOfLines={1}>
                      {link.displayName || link.platform.name}
                    </Text>
                    <Text style={styles.platformRoutes}>
                      {routeCount} route{routeCount !== 1 ? "s" : ""} today
                    </Text>
                    <TouchableOpacity
                      style={[styles.openAppBtn, { borderColor: color + "88" }]}
                      onPress={() => handleLaunch(link)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.openAppText, { color }]}>Open App</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Active route banner */}
        {activeRoute && (
          <View style={styles.activeSection}>
            <View style={styles.activeBanner}>
              <View style={styles.activeDot} />
              <Text style={styles.activeLabel}>In Progress</Text>
            </View>
            <Text style={styles.activeName}>{activeRoute.name || "Active Route"}</Text>
            <Text style={styles.activeSubtext}>
              {activeRoute.completedStops} of {activeRoute.totalStops} stops ·{" "}
              {activeRoute.deliveredPackages} of {activeRoute.totalPackages} packages
            </Text>
            <ProgressBar value={activeRoute.completedStops} total={activeRoute.totalStops} />
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => onViewRoute(activeRoute)}
              activeOpacity={0.8}
            >
              <Text style={styles.continueBtnText}>Continue Route →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Route list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{loading ? "Loading..." : "Today's Routes"}</Text>

          {!loading && (!data?.todayRoutes || data.todayRoutes.length === 0) ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No routes today</Text>
              <Text style={styles.emptyBody}>
                No routes assigned. Create a route or check with your hub.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={onCreateRoute} activeOpacity={0.8}>
                <Text style={styles.emptyBtnText}>+ Create Route</Text>
              </TouchableOpacity>
            </View>
          ) : (
            data?.todayRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                onPress={() => onViewRoute(route)}
                onStart={route.status === "ASSIGNED" ? () => handleStartRoute(route) : undefined}
              />
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={onCreateRoute} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  date: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  brand: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1E40AF",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  statsBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#1E293B",
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#334155",
  },
  activeSection: {
    marginHorizontal: 20,
    backgroundColor: "#0C2340",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#1E3A5F",
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34D399",
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#34D399",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  activeName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  activeSubtext: {
    fontSize: 13,
    color: "#94A3B8",
  },
  continueBtn: {
    marginTop: 14,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 32,
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
    lineHeight: 20,
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
  platformSection: {
    marginBottom: 20,
  },
  platformScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  platformCard: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 14,
    width: 140,
    alignItems: "center",
    gap: 6,
  },
  platformIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  platformInitial: {
    fontSize: 20,
    fontWeight: "800",
  },
  platformName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F8FAFC",
    textAlign: "center",
  },
  platformRoutes: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
  },
  openAppBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  openAppText: {
    fontSize: 12,
    fontWeight: "700",
  },
  platformCTA: {
    marginHorizontal: 20,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    borderStyle: "dashed",
  },
  platformCTAText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
});
