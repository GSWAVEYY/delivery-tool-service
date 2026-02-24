import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import { useAuthStore } from "../store/auth";
import { useDashboardStore } from "../store/dashboard";
import type { PlatformLink } from "../types";

interface Props {
  onAddPlatform?: () => void;
}

export default function DashboardScreen({ onAddPlatform }: Props) {
  const { user } = useAuthStore();
  const { data, isLoading, fetchDashboard, launchPlatform } = useDashboardStore();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = useCallback(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleLaunch = async (link: PlatformLink) => {
    const url = await launchPlatform(link.id);
    if (!url) {
      Alert.alert("Error", "No launch URL available for this platform");
      return;
    }

    // Try deep link first, fall back to web
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else if (link.platform.webPortalUrl) {
      await Linking.openURL(link.platform.webPortalUrl);
    } else {
      // Try Android package intent
      if (Platform.OS === "android" && link.platform.androidPackage) {
        const playStoreUrl = `market://details?id=${link.platform.androidPackage}`;
        const canOpenStore = await Linking.canOpenURL(playStoreUrl);
        if (canOpenStore) {
          Alert.alert(
            "App Not Installed",
            `${link.platform.name} is not installed. Open Play Store?`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Store", onPress: () => Linking.openURL(playStoreUrl) },
            ],
          );
          return;
        }
      }
      Alert.alert("Error", `Could not open ${link.platform.name}`);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {user?.firstName || "Driver"}</Text>
            <Text style={styles.subtitle}>Your delivery hub</Text>
          </View>
          <View style={styles.headerBrand}>
            <Text style={styles.brandMark}>DB</Text>
          </View>
        </View>

        {/* Earnings Summary Card */}
        {data?.earningsSummary && (
          <View style={styles.earningsCard}>
            <Text style={styles.earningsTitle}>Last 7 Days</Text>
            <Text style={styles.earningsAmount}>${data.earningsSummary.last7Days.toFixed(2)}</Text>
            {data.earningsSummary.tips7Days > 0 && (
              <Text style={styles.earningsTips}>
                +${data.earningsSummary.tips7Days.toFixed(2)} tips
              </Text>
            )}
          </View>
        )}

        {/* Today's Shifts */}
        {data?.todayShifts && data.todayShifts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Shifts</Text>
            {data.todayShifts.map((shift) => (
              <View key={shift.id} style={styles.shiftCard}>
                <Text style={styles.shiftPlatform}>{shift.platform}</Text>
                <Text style={styles.shiftTime}>
                  {new Date(shift.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {shift.endTime &&
                    ` - ${new Date(shift.endTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    shift.status === "IN_PROGRESS" && styles.statusActive,
                    shift.status === "COMPLETED" && styles.statusDone,
                  ]}
                >
                  <Text style={styles.statusText}>{shift.status.replace("_", " ")}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Platform Quick Launch Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Launch</Text>
          {data?.platformLinks && data.platformLinks.length > 0 ? (
            <View style={styles.platformGrid}>
              {data.platformLinks.map((link) => (
                <TouchableOpacity
                  key={link.id}
                  style={styles.platformCard}
                  onPress={() => handleLaunch(link)}
                  activeOpacity={0.7}
                >
                  <View style={styles.platformIcon}>
                    <Text style={styles.platformInitial}>{link.platform.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.platformName} numberOfLines={1}>
                    {link.displayName || link.platform.name}
                  </Text>
                  {link.lastAccessed && (
                    <Text style={styles.lastUsed}>
                      Last: {new Date(link.lastAccessed).toLocaleDateString()}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No platforms linked yet.</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to add your delivery platforms.
              </Text>
            </View>
          )}
        </View>

        {/* Notifications badge */}
        {data?.unreadNotifications ? (
          <View style={styles.notifBanner}>
            <Text style={styles.notifText}>
              {data.unreadNotifications} unread notification
              {data.unreadNotifications > 1 ? "s" : ""}
            </Text>
          </View>
        ) : null}

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Floating add button */}
      {onAddPlatform && (
        <TouchableOpacity style={styles.fab} onPress={onAddPlatform} activeOpacity={0.8}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollView: {
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
  headerBrand: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1E40AF",
    alignItems: "center",
    justifyContent: "center",
  },
  brandMark: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  subtitle: {
    fontSize: 16,
    color: "#94A3B8",
    marginTop: 4,
  },
  earningsCard: {
    marginHorizontal: 20,
    backgroundColor: "#1E3A5F",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  earningsTitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#34D399",
  },
  earningsTips: {
    fontSize: 14,
    color: "#6EE7B7",
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  shiftCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shiftPlatform: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    flex: 1,
  },
  shiftTime: {
    fontSize: 14,
    color: "#94A3B8",
    marginRight: 12,
  },
  statusBadge: {
    backgroundColor: "#374151",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: "#065F46",
  },
  statusDone: {
    backgroundColor: "#1E40AF",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F8FAFC",
    textTransform: "uppercase",
  },
  platformGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  platformCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    width: "47%",
    alignItems: "center",
  },
  platformIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1E40AF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  platformInitial: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  platformName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F8FAFC",
    textAlign: "center",
  },
  lastUsed: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  emptyState: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#94A3B8",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
  },
  notifBanner: {
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  notifText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
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
