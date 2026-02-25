import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Switch,
  Animated,
} from "react-native";
import api from "../services/api";
import type { Package, Route } from "../types";
import { getPlatformColor, getPlatformInitial } from "../utils/platformColors";

const isWeb = Platform.OS === "web";

interface RecentScan extends Package {
  scannedLocal: string;
  isNew?: boolean;
  isError?: boolean;
}

interface SessionStats {
  scanned: number;
  newPackages: number;
  errors: number;
}

function PackageStatusBadge({ status }: { status: string }) {
  const color =
    status === "DELIVERED"
      ? "#34D399"
      : status === "OUT_FOR_DELIVERY"
        ? "#3B82F6"
        : status === "RETURNED"
          ? "#EF4444"
          : status === "DAMAGED"
            ? "#F59E0B"
            : "#94A3B8";
  return <Text style={[badgeStyles.text, { color }]}>{status.replace(/_/g, " ")}</Text>;
}

const badgeStyles = StyleSheet.create({
  text: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
});

// ─── Flash overlay component ──────────────────────────────

function FlashFeedback({ type }: { type: "success" | "error" | null }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!type) return;
    opacity.setValue(1);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [type]);

  if (!type) return null;
  return (
    <Animated.View
      style={[
        flashStyles.overlay,
        {
          opacity,
          backgroundColor: type === "success" ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)",
        },
      ]}
      pointerEvents="none"
    >
      <Text style={[flashStyles.icon, { color: type === "success" ? "#34D399" : "#EF4444" }]}>
        {type === "success" ? "✓" : "✗"}
      </Text>
    </Animated.View>
  );
}

const flashStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
    borderRadius: 12,
  },
  icon: {
    fontSize: 48,
    fontWeight: "900",
  },
});

export default function ScanScreen() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [scanInput, setScanInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  // Add package form
  const [showAddForm, setShowAddForm] = useState(false);
  const [trackingNum, setTrackingNum] = useState("");
  const [barcode, setBarcode] = useState("");
  const [adding, setAdding] = useState(false);

  // Quick scan mode
  const [quickScanMode, setQuickScanMode] = useState(false);
  const [flashType, setFlashType] = useState<"success" | "error" | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [borderColor, setBorderColor] = useState("#334155");
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    scanned: 0,
    newPackages: 0,
    errors: 0,
  });
  const scanInputRef = useRef<TextInput>(null);

  const loadActiveRoutes = useCallback(async () => {
    try {
      const result = await api.getRoutes({ status: "IN_PROGRESS" });
      const active = result.routes;
      setRoutes(active);
      if (active.length === 1) setSelectedRouteId(active[0].id);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    loadActiveRoutes();
  }, [loadActiveRoutes]);

  // Auto-focus on quick scan mode enable
  useEffect(() => {
    if (quickScanMode && scanInputRef.current) {
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [quickScanMode]);

  const triggerFlash = (type: "success" | "error") => {
    setFlashType(type);
    setFlashKey((k) => k + 1);
    setBorderColor(type === "success" ? "#34D399" : "#EF4444");
    setTimeout(() => setBorderColor("#334155"), 800);
  };

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    if (!selectedRouteId) {
      if (isWeb) window.alert("Select a route first");
      return;
    }

    setScanning(true);
    try {
      const result = await api.scanPackage(selectedRouteId, scanInput.trim());
      const pkg = result.package;
      setRecentScans((prev) =>
        [{ ...pkg, scannedLocal: new Date().toISOString(), isNew: false }, ...prev].slice(0, 20),
      );
      setScanInput("");
      if (quickScanMode) {
        triggerFlash("success");
        setSessionStats((s) => ({ ...s, scanned: s.scanned + 1 }));
        setTimeout(() => scanInputRef.current?.focus(), 50);
      }
    } catch {
      if (quickScanMode) {
        // auto-create the package
        try {
          const created = await api.addPackage(selectedRouteId, {
            trackingNumber: scanInput.trim(),
          });
          const pkg = created.package;
          setRecentScans((prev) =>
            [{ ...pkg, scannedLocal: new Date().toISOString(), isNew: true }, ...prev].slice(0, 20),
          );
          setScanInput("");
          triggerFlash("success");
          setSessionStats((s) => ({
            ...s,
            scanned: s.scanned + 1,
            newPackages: s.newPackages + 1,
          }));
          setTimeout(() => scanInputRef.current?.focus(), 50);
        } catch {
          triggerFlash("error");
          setSessionStats((s) => ({ ...s, errors: s.errors + 1 }));
          setScanInput("");
          setTimeout(() => scanInputRef.current?.focus(), 50);
        }
      } else {
        const errMsg = "Package not found";
        if (isWeb) window.alert(errMsg);
      }
    } finally {
      setScanning(false);
    }
  };

  const handleAddPackage = async () => {
    if (!trackingNum.trim()) {
      if (isWeb) window.alert("Tracking number is required");
      return;
    }
    if (!selectedRouteId) {
      if (isWeb) window.alert("Select a route first");
      return;
    }

    setAdding(true);
    try {
      const result = await api.addPackage(selectedRouteId, {
        trackingNumber: trackingNum.trim(),
        barcode: barcode.trim() || undefined,
      });
      const pkg = result.package;
      setRecentScans((prev) =>
        [{ ...pkg, scannedLocal: new Date().toISOString() }, ...prev].slice(0, 20),
      );
      setTrackingNum("");
      setBarcode("");
      setShowAddForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add package";
      if (isWeb) window.alert(msg);
    } finally {
      setAdding(false);
    }
  };

  const resetSession = () => {
    setSessionStats({ scanned: 0, newPackages: 0, errors: 0 });
    setRecentScans([]);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Scan Package</Text>
          <Text style={styles.subheading}>Look up or add packages to an active route</Text>
        </View>

        {/* Active platform context */}
        {selectedRouteId &&
          (() => {
            const selectedRoute = routes.find((r) => r.id === selectedRouteId);
            const platformName = selectedRoute?.platformLink?.platform?.name;
            if (!platformName) return null;
            const color = getPlatformColor(platformName);
            const initial = getPlatformInitial(platformName);
            return (
              <View
                style={[
                  scanContextStyles.banner,
                  { borderColor: color + "44", backgroundColor: color + "11" },
                ]}
              >
                <View style={[scanContextStyles.iconCircle, { backgroundColor: color + "22" }]}>
                  <Text style={[scanContextStyles.iconText, { color }]}>{initial}</Text>
                </View>
                <Text style={scanContextStyles.label}>Scanning for:</Text>
                <Text style={[scanContextStyles.platformName, { color }]}>{platformName}</Text>
              </View>
            );
          })()}

        {/* Quick Scan Toggle */}
        <View style={styles.section}>
          <View style={quickStyles.toggleRow}>
            <View style={quickStyles.toggleInfo}>
              <Text style={quickStyles.toggleLabel}>Quick Scan Mode</Text>
              <Text style={quickStyles.toggleSub}>Auto-create on miss, rapid load</Text>
            </View>
            <Switch
              value={quickScanMode}
              onValueChange={setQuickScanMode}
              trackColor={{ false: "#334155", true: "#1E3A5F" }}
              thumbColor={quickScanMode ? "#3B82F6" : "#64748B"}
            />
          </View>
        </View>

        {/* Session stats */}
        {(quickScanMode || sessionStats.scanned > 0) && (
          <View style={styles.section}>
            <View style={quickStyles.statsRow}>
              <View style={quickStyles.statBox}>
                <Text style={quickStyles.statNum}>{sessionStats.scanned}</Text>
                <Text style={quickStyles.statLabel}>Scanned</Text>
              </View>
              <View style={[quickStyles.statBox, { borderColor: "#34D399" }]}>
                <Text style={[quickStyles.statNum, { color: "#34D399" }]}>
                  {sessionStats.newPackages}
                </Text>
                <Text style={quickStyles.statLabel}>New</Text>
              </View>
              <View style={[quickStyles.statBox, { borderColor: "#EF4444" }]}>
                <Text style={[quickStyles.statNum, { color: "#EF4444" }]}>
                  {sessionStats.errors}
                </Text>
                <Text style={quickStyles.statLabel}>Errors</Text>
              </View>
              <TouchableOpacity
                style={quickStyles.resetBtn}
                onPress={resetSession}
                activeOpacity={0.7}
              >
                <Text style={quickStyles.resetText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Route selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Active Route</Text>
          {routes.length === 0 ? (
            <View style={styles.noRouteBox}>
              <Text style={styles.noRouteText}>No active routes. Start a route from Today.</Text>
            </View>
          ) : (
            <View style={styles.routeList}>
              {routes.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.routeOption,
                    selectedRouteId === r.id && styles.routeOptionSelected,
                  ]}
                  onPress={() => setSelectedRouteId(r.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.routeOptionDot}>
                    {selectedRouteId === r.id && <View style={styles.dotFill} />}
                  </View>
                  <Text style={styles.routeOptionText} numberOfLines={1}>
                    {r.name || `Route ${r.id.slice(-6)}`}
                  </Text>
                  <Text style={styles.routeOptionMeta}>
                    {r.completedStops}/{r.totalStops} stops
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Scan input */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {quickScanMode ? "Quick Scan — Enter Barcode" : "Barcode / Tracking Number"}
          </Text>
          <View style={quickStyles.scanWrapper}>
            <View style={[styles.scanRow, { position: "relative" }]}>
              <TextInput
                ref={scanInputRef}
                style={[styles.scanInput, { borderColor }]}
                placeholder="Enter or scan barcode..."
                placeholderTextColor="#475569"
                value={scanInput}
                onChangeText={setScanInput}
                onSubmitEditing={handleScan}
                returnKeyType="search"
                autoCapitalize="characters"
                autoFocus={quickScanMode}
              />
              <TouchableOpacity
                style={[styles.scanBtn, (scanning || !scanInput.trim()) && styles.disabled]}
                onPress={handleScan}
                disabled={scanning || !scanInput.trim()}
                activeOpacity={0.8}
              >
                {scanning ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.scanBtnText}>{quickScanMode ? "Go" : "Scan"}</Text>
                )}
              </TouchableOpacity>
            </View>
            {/* Flash feedback layered over the input area */}
            <FlashFeedback key={flashKey} type={flashType} />
          </View>
          {quickScanMode && (
            <Text style={quickStyles.quickHint}>
              Quick Scan: auto-creates packages not found in route
            </Text>
          )}
        </View>

        {/* Quick scan counter */}
        {quickScanMode && sessionStats.scanned > 0 && (
          <View style={styles.section}>
            <View style={quickStyles.counterBox}>
              <Text style={quickStyles.counterText}>
                Quick scanned: {sessionStats.scanned} package{sessionStats.scanned !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        )}

        {/* Quick add */}
        {!quickScanMode && (
          <View style={styles.section}>
            {!showAddForm ? (
              <TouchableOpacity
                style={styles.addToggle}
                onPress={() => setShowAddForm(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.addToggleText}>+ Add New Package</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.addForm}>
                <Text style={styles.addFormTitle}>Add Package</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tracking Number *"
                  placeholderTextColor="#475569"
                  value={trackingNum}
                  onChangeText={setTrackingNum}
                  autoCapitalize="characters"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Barcode (optional)"
                  placeholderTextColor="#475569"
                  value={barcode}
                  onChangeText={setBarcode}
                />
                <View style={styles.addFormActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setShowAddForm(false);
                      setTrackingNum("");
                      setBarcode("");
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, adding && styles.disabled]}
                    onPress={handleAddPackage}
                    disabled={adding}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.submitText}>{adding ? "Adding..." : "Add Package"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Recent scans */}
        {recentScans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Recent Scans</Text>
            {recentScans.map((pkg) => (
              <View
                key={`${pkg.id}-${pkg.scannedLocal}`}
                style={[
                  styles.scanRecord,
                  pkg.isNew && quickStyles.newRecord,
                  pkg.isError && quickStyles.errorRecord,
                ]}
              >
                <View style={styles.scanRecordLeft}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.scanTracking} numberOfLines={1}>
                      {pkg.trackingNumber}
                    </Text>
                    {pkg.isNew && <Text style={quickStyles.newBadge}>NEW</Text>}
                  </View>
                  <Text style={styles.scanTime}>
                    {new Date(pkg.scannedLocal).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </Text>
                </View>
                <PackageStatusBadge status={pkg.status} />
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const scanContextStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 13,
    fontWeight: "800",
  },
  label: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  platformName: {
    fontSize: 14,
    fontWeight: "700",
  },
});

const quickStyles = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  toggleSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  statNum: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  statLabel: {
    fontSize: 10,
    color: "#64748B",
    textTransform: "uppercase",
    fontWeight: "700",
    marginTop: 2,
  },
  resetBtn: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  resetText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  scanWrapper: {
    position: "relative",
  },
  quickHint: {
    fontSize: 11,
    color: "#3B82F6",
    marginTop: 6,
    fontWeight: "500",
  },
  counterBox: {
    backgroundColor: "#064E3B",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#065F46",
  },
  counterText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#34D399",
  },
  newRecord: {
    borderColor: "#34D399",
    borderWidth: 1,
  },
  errorRecord: {
    borderColor: "#EF4444",
    borderWidth: 1,
  },
  newBadge: {
    fontSize: 9,
    fontWeight: "800",
    color: "#34D399",
    backgroundColor: "#064E3B",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: "uppercase",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scroll: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  subheading: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  noRouteBox: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  noRouteText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  routeList: {
    gap: 8,
  },
  routeOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 10,
  },
  routeOptionSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#0C2340",
  },
  routeOptionDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#64748B",
    alignItems: "center",
    justifyContent: "center",
  },
  dotFill: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#3B82F6",
  },
  routeOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  routeOptionMeta: {
    fontSize: 12,
    color: "#64748B",
  },
  scanRow: {
    flexDirection: "row",
    gap: 10,
  },
  scanInput: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#334155",
  },
  scanBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 72,
  },
  scanBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  addToggle: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderStyle: "dashed",
  },
  addToggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
  addForm: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 18,
    gap: 10,
  },
  addFormTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 2,
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
  addFormActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
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
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
  },
  submitBtn: {
    flex: 1,
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  disabled: { opacity: 0.5 },
  scanRecord: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  scanRecordLeft: {
    flex: 1,
    marginRight: 12,
  },
  scanTracking: {
    fontSize: 14,
    fontWeight: "600",
    color: "#CBD5E1",
    fontFamily: "monospace",
  },
  scanTime: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
  },
});
