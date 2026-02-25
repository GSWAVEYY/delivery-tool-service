import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import api from "../services/api";
import type { Package, Route } from "../types";

const isWeb = Platform.OS === "web";

interface RecentScan extends Package {
  scannedLocal: string;
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
        [{ ...pkg, scannedLocal: new Date().toISOString() }, ...prev].slice(0, 10),
      );
      setScanInput("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Package not found";
      if (isWeb) window.alert(msg);
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
        [{ ...pkg, scannedLocal: new Date().toISOString() }, ...prev].slice(0, 10),
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Scan Package</Text>
          <Text style={styles.subheading}>Look up or add packages to an active route</Text>
        </View>

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
          <Text style={styles.label}>Barcode / Tracking Number</Text>
          <View style={styles.scanRow}>
            <TextInput
              style={styles.scanInput}
              placeholder="Enter or scan barcode..."
              placeholderTextColor="#475569"
              value={scanInput}
              onChangeText={setScanInput}
              onSubmitEditing={handleScan}
              returnKeyType="search"
              autoCapitalize="characters"
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
                <Text style={styles.scanBtnText}>Scan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick add */}
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

        {/* Recent scans */}
        {recentScans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Recent Scans</Text>
            {recentScans.map((pkg) => (
              <View key={`${pkg.id}-${pkg.scannedLocal}`} style={styles.scanRecord}>
                <View style={styles.scanRecordLeft}>
                  <Text style={styles.scanTracking} numberOfLines={1}>
                    {pkg.trackingNumber}
                  </Text>
                  <Text style={styles.scanTime}>
                    {new Date(pkg.scannedLocal).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
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
