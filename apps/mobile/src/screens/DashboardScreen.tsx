import React, { useEffect, useCallback, useState, useRef } from "react";
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
  TextInput,
} from "react-native";
import { useAuthStore } from "../store/auth";
import { useDashboardStore } from "../store/dashboard";
import type { PlatformLink, Shift } from "../types";
import api from "../services/api";

interface Props {
  onAddPlatform?: () => void;
}

// ─── helpers ────────────────────────────────────────────

function formatDuration(startTime: string): string {
  const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const isWeb = Platform.OS === "web";

// On native, Alert.prompt exists. On web we use window.prompt.
function webPrompt(msg: string, defaultVal = ""): string | null {
  if (isWeb) {
     
    return (window as Window).prompt(msg, defaultVal);
  }
  return null;
}

// ─── ActiveShiftCard ────────────────────────────────────

interface EndEarningsForm {
  earnings: string;
  tips: string;
  deliveries: string;
}

function ActiveShiftCard({
  shift,
  platformLink,
  onShiftEnded,
}: {
  shift: Shift;
  platformLink: PlatformLink | undefined;
  onShiftEnded: () => void;
}) {
  const [, setTick] = useState(0);
  const [showEndForm, setShowEndForm] = useState(false);
  const [form, setForm] = useState<EndEarningsForm>({ earnings: "", tips: "", deliveries: "" });
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleEnd = async () => {
    if (!showEndForm) {
      setShowEndForm(true);
      return;
    }

    const earningsVal = parseFloat(form.earnings);
    if (!form.earnings || isNaN(earningsVal)) {
      if (isWeb) {
        window.alert("Please enter a valid earnings amount");
      } else {
        Alert.alert("Error", "Please enter a valid earnings amount");
      }
      return;
    }

    setSubmitting(true);
    try {
      const endTime = new Date().toISOString();

      // Log earnings if platform link exists
      if (platformLink) {
        await api.addEarning({
          platformLinkId: platformLink.id,
          date: new Date().toISOString().split("T")[0],
          earnings: earningsVal,
          tips: form.tips ? parseFloat(form.tips) : undefined,
          deliveries: form.deliveries ? parseInt(form.deliveries, 10) : undefined,
        });
      }

      // End the shift
      await api.updateShiftStatus(shift.id, { status: "COMPLETED", endTime });
      onShiftEnded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to end shift";
      if (isWeb) {
        window.alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={shiftStyles.activeCard}>
      <View style={shiftStyles.activeHeader}>
        <View style={shiftStyles.activeDot} />
        <Text style={shiftStyles.activeTitle}>Active Shift</Text>
        <Text style={shiftStyles.activePlatform}>
          {platformLink?.displayName || platformLink?.platform?.name || shift.platform}
        </Text>
      </View>
      <Text style={shiftStyles.timer}>{formatDuration(shift.startTime)}</Text>

      {showEndForm ? (
        <View style={shiftStyles.endForm}>
          <Text style={shiftStyles.endFormLabel}>How'd the shift go?</Text>
          <TextInput
            style={shiftStyles.input}
            placeholder="Earnings (e.g. 84.50)"
            placeholderTextColor="#64748B"
            keyboardType="decimal-pad"
            value={form.earnings}
            onChangeText={(v) => setForm((f) => ({ ...f, earnings: v }))}
          />
          <TextInput
            style={shiftStyles.input}
            placeholder="Tips (optional)"
            placeholderTextColor="#64748B"
            keyboardType="decimal-pad"
            value={form.tips}
            onChangeText={(v) => setForm((f) => ({ ...f, tips: v }))}
          />
          <TextInput
            style={shiftStyles.input}
            placeholder="Deliveries (optional)"
            placeholderTextColor="#64748B"
            keyboardType="number-pad"
            value={form.deliveries}
            onChangeText={(v) => setForm((f) => ({ ...f, deliveries: v }))}
          />
          <View style={shiftStyles.endFormActions}>
            <TouchableOpacity
              style={shiftStyles.cancelBtn}
              onPress={() => setShowEndForm(false)}
              activeOpacity={0.7}
            >
              <Text style={shiftStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[shiftStyles.endBtn, submitting && shiftStyles.btnDisabled]}
              onPress={handleEnd}
              activeOpacity={0.7}
              disabled={submitting}
            >
              <Text style={shiftStyles.endBtnText}>{submitting ? "Saving..." : "End Shift"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={shiftStyles.endBtn} onPress={handleEnd} activeOpacity={0.7}>
          <Text style={shiftStyles.endBtnText}>End Shift</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── StartShiftSection ──────────────────────────────────

function StartShiftSection({
  platformLinks,
  onShiftStarted,
}: {
  platformLinks: PlatformLink[];
  onShiftStarted: (shift: Shift) => void;
}) {
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    const linkId = selectedLinkId || (platformLinks.length === 1 ? platformLinks[0].id : null);
    if (!linkId) {
      setShowPicker(true);
      return;
    }

    const link = platformLinks.find((l) => l.id === linkId);
    if (!link) return;

    setStarting(true);
    try {
      const result = await api.createShift({
        platformId: link.platformId,
        startTime: new Date().toISOString(),
      });
      onShiftStarted(result.shift);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start shift";
      if (isWeb) {
        window.alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setStarting(false);
    }
  };

  if (showPicker && platformLinks.length > 1) {
    return (
      <View style={startStyles.pickerCard}>
        <Text style={startStyles.pickerTitle}>Choose Platform</Text>
        {platformLinks.map((link) => (
          <TouchableOpacity
            key={link.id}
            style={[
              startStyles.pickerOption,
              selectedLinkId === link.id && startStyles.pickerOptionSelected,
            ]}
            onPress={() => setSelectedLinkId(link.id)}
            activeOpacity={0.7}
          >
            <View style={startStyles.pickerDot}>
              <Text style={startStyles.pickerInitial}>{link.platform.name.charAt(0)}</Text>
            </View>
            <Text style={startStyles.pickerName}>{link.displayName || link.platform.name}</Text>
            {selectedLinkId === link.id && <Text style={startStyles.checkmark}>✓</Text>}
          </TouchableOpacity>
        ))}
        <View style={startStyles.pickerActions}>
          <TouchableOpacity
            style={startStyles.cancelBtn}
            onPress={() => {
              setShowPicker(false);
              setSelectedLinkId(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={startStyles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[startStyles.startBtn, !selectedLinkId && startStyles.btnDisabled]}
            onPress={handleStart}
            disabled={!selectedLinkId || starting}
            activeOpacity={0.7}
          >
            <Text style={startStyles.startBtnText}>{starting ? "Starting..." : "Start Shift"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={startStyles.card}>
      <Text style={startStyles.label}>Ready to work?</Text>
      <TouchableOpacity
        style={[startStyles.startBtn, starting && startStyles.btnDisabled]}
        onPress={handleStart}
        disabled={starting}
        activeOpacity={0.8}
      >
        <Text style={startStyles.startBtnText}>{starting ? "Starting..." : "Start Shift"}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── DashboardScreen ────────────────────────────────────

export default function DashboardScreen({ onAddPlatform }: Props) {
  const { user } = useAuthStore();
  const { data, isLoading, fetchDashboard, launchPlatform } = useDashboardStore();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftChecked, setShiftChecked] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchActiveShift();
  }, []);

  const fetchActiveShift = async () => {
    try {
      const result = await api.getShifts("IN_PROGRESS");
      const inProgress = result.shifts?.[0] ?? null;
      setActiveShift(inProgress);
    } catch {
      // non-fatal
    } finally {
      setShiftChecked(true);
    }
  };

  const onRefresh = useCallback(() => {
    fetchDashboard();
    fetchActiveShift();
  }, [fetchDashboard]);

  const handleLaunch = async (link: PlatformLink) => {
    if (isWeb) {
      const url = link.platform.webPortalUrl;
      if (url) {
        window.open(url, "_blank");
        return;
      }
      window.alert(`No web portal available for ${link.platform.name}`);
      return;
    }

    const url = await launchPlatform(link.id);
    if (!url) {
      Alert.alert("Error", "No launch URL available for this platform");
      return;
    }

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else if (link.platform.webPortalUrl) {
      await Linking.openURL(link.platform.webPortalUrl);
    } else {
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

  // Find the PlatformLink matching the active shift's platform
  const activeShiftLink = activeShift
    ? data?.platformLinks?.find((l) => l.platformId === activeShift.platform)
    : undefined;

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

        {/* Shift Section */}
        {shiftChecked && (data?.platformLinks?.length ?? 0) > 0 && (
          <View style={styles.shiftSection}>
            {activeShift ? (
              <ActiveShiftCard
                shift={activeShift}
                platformLink={activeShiftLink}
                onShiftEnded={() => {
                  setActiveShift(null);
                  fetchDashboard();
                }}
              />
            ) : (
              <StartShiftSection
                platformLinks={data?.platformLinks ?? []}
                onShiftStarted={(shift) => setActiveShift(shift)}
              />
            )}
          </View>
        )}

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

// ─── Styles ─────────────────────────────────────────────

const shiftStyles = StyleSheet.create({
  activeCard: {
    backgroundColor: "#064E3B",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#065F46",
  },
  activeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#34D399",
  },
  activeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#34D399",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  activePlatform: {
    fontSize: 13,
    color: "#6EE7B7",
    marginLeft: 4,
  },
  timer: {
    fontSize: 40,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 16,
  },
  endForm: {
    gap: 10,
  },
  endFormLabel: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  endFormActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
  },
  endBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  endBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

const startStyles = StyleSheet.create({
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  pickerCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 14,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
  },
  pickerOptionSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#1E3A5F",
  },
  pickerDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E40AF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  pickerInitial: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pickerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  checkmark: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "700",
  },
  pickerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
  },
  startBtn: {
    flex: 1,
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

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
  shiftSection: {
    marginHorizontal: 20,
    marginBottom: 20,
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
