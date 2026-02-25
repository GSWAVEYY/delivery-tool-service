import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
  ActivityIndicator,
  Linking,
} from "react-native";
import api from "../services/api";
import type { Package, RouteDetail, Stop, StopStatus } from "../types";
import { getPlatformColor, getPlatformInitial } from "../utils/platformColors";

const isWeb = Platform.OS === "web";

// ─── Navigation helper ────────────────────────────────────

function buildMapsUrl(stop: Stop): string {
  const fullAddress = [stop.address, stop.city, stop.state, stop.zipCode]
    .filter(Boolean)
    .join(", ")
    .trim();
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
}

function navigateTo(stop: Stop) {
  const url = buildMapsUrl(stop);
  if (isWeb) {
    window.open(url, "_blank");
  } else {
    Linking.openURL(url).catch(() => {
      // fallback — open browser
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(stop.address)}`);
    });
  }
}

// ─── Status Badge ────────────────────────────────────────

function StopStatusBadge({ status }: { status: StopStatus }) {
  const colors: Record<StopStatus, { bg: string; text: string }> = {
    PENDING: { bg: "#1E293B", text: "#94A3B8" },
    ARRIVED: { bg: "#451A03", text: "#F59E0B" },
    COMPLETED: { bg: "#064E3B", text: "#34D399" },
    SKIPPED: { bg: "#450A0A", text: "#EF4444" },
    ATTEMPTED: { bg: "#312E81", text: "#A5B4FC" },
  };
  const c = colors[status] || colors.PENDING;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: c.bg }]}>
      <Text style={[badgeStyles.text, { color: c.text }]}>{status}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  text: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
});

// ─── Package priority badge ───────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const cfg =
    priority === "STAT"
      ? { bg: "#450A0A", color: "#EF4444" }
      : priority === "Urgent"
        ? { bg: "#451A03", color: "#F59E0B" }
        : { bg: "#1E293B", color: "#64748B" };
  return (
    <View style={[medStyles.priorityBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[medStyles.priorityText, { color: cfg.color }]}>{priority}</Text>
    </View>
  );
}

// ─── Package row with medical indicators ─────────────────

function PackageRow({ pkg }: { pkg: Package }) {
  return (
    <View style={stopStyles.pkgRow}>
      <View style={{ flex: 1, marginRight: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={stopStyles.pkgTracking} numberOfLines={1}>
            {pkg.trackingNumber}
          </Text>
          {pkg.priority && <PriorityBadge priority={pkg.priority} />}
          {pkg.temperatureSensitive && (
            <Text style={medStyles.coldTag}>
              [COLD{pkg.temperatureRange ? ` ${pkg.temperatureRange}` : ""}]
            </Text>
          )}
          {pkg.requiresSignature && <Text style={medStyles.sigTag}>[SIG]</Text>}
        </View>
        {pkg.recipientType && <Text style={medStyles.recipientType}>{pkg.recipientType}</Text>}
      </View>
      <Text style={stopStyles.pkgStatus}>{pkg.status.replace(/_/g, " ")}</Text>
    </View>
  );
}

const medStyles = StyleSheet.create({
  facilityName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 2,
  },
  facilityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: "#1E3A5F",
    marginBottom: 4,
  },
  facilityBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#93C5FD",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  deliveryWindow: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "600",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  contactName: {
    fontSize: 12,
    color: "#94A3B8",
  },
  contactPhone: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  coldTag: {
    fontSize: 10,
    fontWeight: "700",
    color: "#22D3EE",
  },
  sigTag: {
    fontSize: 10,
    fontWeight: "700",
    color: "#F59E0B",
  },
  recipientType: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
});

// ─── Stop Card ────────────────────────────────────────────

function StopCard({
  stop,
  onUpdateStatus,
}: {
  stop: Stop;
  onUpdateStatus: (stopId: string, status: StopStatus) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const update = async (status: StopStatus) => {
    setUpdating(true);
    await onUpdateStatus(stop.id, status);
    setUpdating(false);
  };

  const callContact = () => {
    if (!stop.contactPhone) return;
    const url = `tel:${stop.contactPhone}`;
    if (isWeb) {
      window.open(url);
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <TouchableOpacity
      style={stopStyles.card}
      onPress={() => setExpanded((e) => !e)}
      activeOpacity={0.85}
    >
      <View style={stopStyles.topRow}>
        <View style={stopStyles.seqCircle}>
          <Text style={stopStyles.seqText}>#{stop.sequence}</Text>
        </View>
        <View style={stopStyles.addrCol}>
          {stop.facilityName && (
            <Text style={medStyles.facilityName} numberOfLines={1}>
              {stop.facilityName}
            </Text>
          )}
          {stop.facilityType && (
            <View style={medStyles.facilityBadge}>
              <Text style={medStyles.facilityBadgeText}>{stop.facilityType}</Text>
            </View>
          )}
          <Text
            style={stop.facilityName ? stopStyles.cityLine : stopStyles.address}
            numberOfLines={1}
          >
            {stop.address}
          </Text>
          {(stop.city || stop.state) && (
            <Text style={stopStyles.cityLine}>
              {[stop.city, stop.state, stop.zipCode].filter(Boolean).join(", ")}
            </Text>
          )}
          {stop.deliveryWindow && (
            <Text style={medStyles.deliveryWindow}>Window: {stop.deliveryWindow}</Text>
          )}
          {(stop.contactName || stop.contactPhone) && (
            <View style={medStyles.contactRow}>
              {stop.contactName && <Text style={medStyles.contactName}>{stop.contactName}</Text>}
              {stop.contactPhone && (
                <TouchableOpacity onPress={callContact} activeOpacity={0.7}>
                  <Text style={medStyles.contactPhone}>{stop.contactPhone}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        <View style={stopStyles.rightCol}>
          <StopStatusBadge status={stop.status} />
          {stop.packages.length > 0 && (
            <Text style={stopStyles.pkgCount}>{stop.packages.length} pkg</Text>
          )}
        </View>
      </View>

      {expanded && (
        <View style={stopStyles.expanded}>
          {stop.packages.length > 0 && (
            <View style={stopStyles.pkgList}>
              {stop.packages.map((pkg) => (
                <PackageRow key={pkg.id} pkg={pkg} />
              ))}
            </View>
          )}

          {/* Navigate button */}
          <TouchableOpacity
            style={stopStyles.navBtn}
            onPress={() => navigateTo(stop)}
            activeOpacity={0.8}
          >
            <Text style={stopStyles.navBtnText}>Navigate</Text>
          </TouchableOpacity>

          {stop.status !== "COMPLETED" && stop.status !== "SKIPPED" && (
            <View style={stopStyles.actions}>
              {updating ? (
                <ActivityIndicator color="#3B82F6" size="small" />
              ) : (
                <>
                  {stop.status === "PENDING" && (
                    <TouchableOpacity
                      style={[stopStyles.actionBtn, stopStyles.arrivedBtn]}
                      onPress={() => update("ARRIVED")}
                      activeOpacity={0.8}
                    >
                      <Text style={stopStyles.actionBtnText}>Mark Arrived</Text>
                    </TouchableOpacity>
                  )}
                  {(stop.status === "ARRIVED" || stop.status === "PENDING") && (
                    <TouchableOpacity
                      style={[stopStyles.actionBtn, stopStyles.doneBtn]}
                      onPress={() => update("COMPLETED")}
                      activeOpacity={0.8}
                    >
                      <Text style={stopStyles.actionBtnText}>Mark Complete</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[stopStyles.actionBtn, stopStyles.skipBtn]}
                    onPress={() => update("SKIPPED")}
                    activeOpacity={0.8}
                  >
                    <Text style={[stopStyles.actionBtnText, { color: "#94A3B8" }]}>Skip</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const stopStyles = StyleSheet.create({
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  seqCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  seqText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  },
  addrCol: {
    flex: 1,
  },
  address: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  cityLine: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  rightCol: {
    alignItems: "flex-end",
    gap: 4,
  },
  pkgCount: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  expanded: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
    gap: 10,
  },
  pkgList: {
    gap: 6,
  },
  pkgRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pkgTracking: {
    fontSize: 12,
    color: "#94A3B8",
    flex: 1,
    marginRight: 8,
    fontFamily: "monospace",
  },
  pkgStatus: {
    fontSize: 11,
    color: "#64748B",
    textTransform: "uppercase",
  },
  navBtn: {
    backgroundColor: "#1E3A5F",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3B82F6",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  arrivedBtn: { backgroundColor: "#451A03", borderWidth: 1, borderColor: "#78350F" },
  doneBtn: { backgroundColor: "#064E3B", borderWidth: 1, borderColor: "#065F46" },
  skipBtn: { backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F8FAFC",
  },
});

// ─── Add Stop Modal ───────────────────────────────────────

function AddStopForm({
  onAdd,
  onCancel,
}: {
  onAdd: (address: string, city: string, state: string, zip: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!address.trim()) {
      if (isWeb) window.alert("Address is required");
      return;
    }
    setSaving(true);
    await onAdd(address.trim(), city.trim(), state.trim(), zip.trim());
    setSaving(false);
  };

  return (
    <View style={formStyles.overlay}>
      <View style={formStyles.card}>
        <Text style={formStyles.title}>Add Stop</Text>
        <TextInput
          style={formStyles.input}
          placeholder="Address *"
          placeholderTextColor="#475569"
          value={address}
          onChangeText={setAddress}
        />
        <TextInput
          style={formStyles.input}
          placeholder="City"
          placeholderTextColor="#475569"
          value={city}
          onChangeText={setCity}
        />
        <View style={formStyles.row}>
          <TextInput
            style={[formStyles.input, { flex: 1 }]}
            placeholder="State"
            placeholderTextColor="#475569"
            value={state}
            onChangeText={setState}
          />
          <TextInput
            style={[formStyles.input, { flex: 1 }]}
            placeholder="ZIP"
            placeholderTextColor="#475569"
            value={zip}
            onChangeText={setZip}
            keyboardType="number-pad"
          />
        </View>
        <View style={formStyles.btnRow}>
          <TouchableOpacity style={formStyles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={formStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[formStyles.submitBtn, saving && formStyles.disabled]}
            onPress={submit}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={formStyles.submitText}>{saving ? "Adding..." : "Add Stop"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Bulk Import Form ─────────────────────────────────────

interface ParsedStop {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

function parseAddressLine(line: string): ParsedStop {
  const parts = line.split(",").map((p) => p.trim());
  if (parts.length === 1) {
    return { address: parts[0] };
  }
  const streetAddress = parts[0];
  const city = parts.length >= 2 ? parts[1] : undefined;
  const lastPart = parts[parts.length - 1];
  const stateZipMatch = lastPart.match(/([A-Za-z]{2})\s*(\d{5})/);
  let state: string | undefined;
  let zipCode: string | undefined;
  if (stateZipMatch) {
    state = stateZipMatch[1].toUpperCase();
    zipCode = stateZipMatch[2];
  }
  return { address: streetAddress, city, state, zipCode };
}

function BulkImportForm({
  onImport,
  onCancel,
}: {
  onImport: (stops: ParsedStop[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const handleImport = async () => {
    if (lines.length === 0) {
      if (isWeb) window.alert("Paste at least one address");
      return;
    }
    const parsed = lines.map(parseAddressLine);
    setImporting(true);
    setProgress(`Importing 0/${parsed.length} stops...`);
    // We pass them all in one bulk call
    setProgress(`Importing ${parsed.length}/${parsed.length} stops...`);
    await onImport(parsed);
    setImporting(false);
    setProgress(null);
  };

  return (
    <View style={formStyles.overlay}>
      <View style={formStyles.card}>
        <Text style={formStyles.title}>Import Stops</Text>
        <TextInput
          style={[formStyles.input, bulkStyles.textarea]}
          placeholder={
            "Paste addresses, one per line\n\n123 Main St, City, ST 12345\n456 Oak Ave, City, ST 67890"
          }
          placeholderTextColor="#475569"
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />
        {lines.length > 0 && (
          <Text style={bulkStyles.lineCount}>{lines.length} address(es) detected</Text>
        )}
        {progress && <Text style={bulkStyles.progressText}>{progress}</Text>}
        <View style={formStyles.btnRow}>
          <TouchableOpacity style={formStyles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={formStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[formStyles.submitBtn, (importing || lines.length === 0) && formStyles.disabled]}
            onPress={handleImport}
            disabled={importing || lines.length === 0}
            activeOpacity={0.8}
          >
            <Text style={formStyles.submitText}>
              {importing
                ? (progress ?? "Importing...")
                : `Import ${lines.length} Stop${lines.length !== 1 ? "s" : ""}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const bulkStyles = StyleSheet.create({
  textarea: {
    minHeight: 160,
    textAlignVertical: "top",
  },
  lineCount: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
    marginTop: -4,
  },
  progressText: {
    fontSize: 13,
    color: "#F59E0B",
    fontWeight: "600",
    textAlign: "center",
  },
});

const formStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
    zIndex: 100,
  },
  card: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
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
    borderColor: "#334155",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  btnRow: {
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
});

// ─── ActiveRouteScreen ────────────────────────────────────

export default function ActiveRouteScreen({
  routeId,
  onBack,
}: {
  routeId: string;
  onBack: () => void;
}) {
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddStop, setShowAddStop] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api.getRoute(routeId);
      setRoute(result.route);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load route";
      if (isWeb) window.alert(msg);
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdateStop = async (stopId: string, status: StopStatus) => {
    try {
      await api.updateStopStatus(routeId, stopId, { status });
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update stop";
      if (isWeb) window.alert(msg);
    }
  };

  const handleAddStop = async (address: string, city: string, state: string, zip: string) => {
    try {
      await api.addStop(routeId, {
        address,
        city: city || undefined,
        state: state || undefined,
        zipCode: zip || undefined,
      });
      setShowAddStop(false);
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add stop";
      if (isWeb) window.alert(msg);
    }
  };

  const handleBulkImport = async (stops: ParsedStop[]) => {
    try {
      await api.bulkAddStops(routeId, stops);
      setShowBulkImport(false);
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to import stops";
      if (isWeb) window.alert(msg);
    }
  };

  const handleCompleteRoute = async () => {
    const ok = isWeb ? window.confirm("Mark this route as completed?") : true;
    if (!ok) return;
    setCompleting(true);
    try {
      await api.updateRouteStatus(routeId, "COMPLETED");
      onBack();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete route";
      if (isWeb) window.alert(msg);
    } finally {
      setCompleting(false);
    }
  };

  const handleLaunchPlatform = async () => {
    if (!route?.platformLink) return;
    try {
      const result = await api.launchPlatform(route.platformLink.id);
      const url = result.launchUrl || route.platformLink.platform.webPortalUrl;
      if (!url) return;
      if (isWeb) {
        window.open(url, "_blank");
      } else {
        Linking.openURL(url).catch(() => {
          if (route.platformLink?.platform.webPortalUrl)
            Linking.openURL(route.platformLink.platform.webPortalUrl);
        });
      }
    } catch {
      // non-fatal
    }
  };

  const handleNavigateNext = () => {
    if (!route) return;
    const sorted = route.stops.slice().sort((a, b) => a.sequence - b.sequence);
    const next = sorted.find((s) => s.status === "PENDING" || s.status === "ARRIVED");
    if (next) {
      navigateTo(next);
    } else {
      if (isWeb) window.alert("No pending stops remaining");
    }
  };

  const allDone =
    route &&
    route.stops.length > 0 &&
    route.stops.every((s) => s.status === "COMPLETED" || s.status === "SKIPPED");

  const nextStop = route
    ? route.stops
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .find((s) => s.status === "PENDING" || s.status === "ARRIVED")
    : null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!route) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Route not found</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pct =
    route.totalStops > 0 ? Math.round((route.completedStops / route.totalStops) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          {nextStop && (
            <TouchableOpacity
              style={styles.navigateNextBtn}
              onPress={handleNavigateNext}
              activeOpacity={0.8}
            >
              <Text style={styles.navigateNextText}>Navigate to Next</Text>
            </TouchableOpacity>
          )}
          <View style={styles.headerBadge}>
            <Text style={styles.headerStatus}>{route.status.replace(/_/g, " ")}</Text>
          </View>
        </View>
      </View>

      <View style={styles.titleRow}>
        <View style={styles.titleMainRow}>
          {route.platformLink?.platform &&
            (() => {
              const pColor = getPlatformColor(route.platformLink.platform.name);
              const pInitial = getPlatformInitial(route.platformLink.platform.name);
              return (
                <View
                  style={[
                    styles.platformIcon,
                    { backgroundColor: pColor + "22", borderColor: pColor + "44" },
                  ]}
                >
                  <Text style={[styles.platformInitial, { color: pColor }]}>{pInitial}</Text>
                </View>
              );
            })()}
          <Text style={styles.routeName} numberOfLines={1}>
            {route.name || `Route ${route.id.slice(-6)}`}
          </Text>
        </View>
        {route.platformLink?.platform && (
          <View style={styles.platformRow}>
            <Text style={styles.platformLabel}>{route.platformLink.platform.name}</Text>
            <TouchableOpacity
              style={styles.openPlatformBtn}
              onPress={handleLaunchPlatform}
              activeOpacity={0.8}
            >
              <Text style={styles.openPlatformText}>
                Open {route.platformLink.platform.name} App →
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` as `${number}%` }]} />
        </View>
        <View style={styles.progressStats}>
          <Text style={styles.progressText}>
            {route.completedStops}/{route.totalStops} stops · {pct}%
          </Text>
          <Text style={styles.progressText}>
            {route.deliveredPackages}/{route.totalPackages} packages
          </Text>
        </View>
      </View>

      {/* Stop list */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {route.stops.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No stops yet</Text>
            <Text style={styles.emptySubtext}>Add stops to begin delivery</Text>
          </View>
        ) : (
          route.stops
            .slice()
            .sort((a, b) => a.sequence - b.sequence)
            .map((stop) => <StopCard key={stop.id} stop={stop} onUpdateStatus={handleUpdateStop} />)
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        <View style={styles.addBtnRow}>
          <TouchableOpacity
            style={[styles.addStopBtn, { flex: 1 }]}
            onPress={() => setShowAddStop(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addStopText}>+ Add Stop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.importBtn}
            onPress={() => setShowBulkImport(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.importBtnText}>Import Stops</Text>
          </TouchableOpacity>
        </View>

        {allDone && (
          <TouchableOpacity
            style={[styles.completeBtn, completing && styles.disabled]}
            onPress={handleCompleteRoute}
            disabled={completing}
            activeOpacity={0.8}
          >
            <Text style={styles.completeBtnText}>
              {completing ? "Completing..." : "Complete Route"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showAddStop && <AddStopForm onAdd={handleAddStop} onCancel={() => setShowAddStop(false)} />}
      {showBulkImport && (
        <BulkImportForm onImport={handleBulkImport} onCancel={() => setShowBulkImport(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 18,
    color: "#EF4444",
    fontWeight: "600",
  },
  backLink: {
    fontSize: 15,
    color: "#3B82F6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 16,
  },
  backArrow: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
  },
  headerBadge: {
    backgroundColor: "#064E3B",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: "700",
    color: "#34D399",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  navigateNextBtn: {
    backgroundColor: "#1E3A5F",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  navigateNextText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3B82F6",
  },
  titleRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  platformIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  platformInitial: {
    fontSize: 16,
    fontWeight: "800",
  },
  routeName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F8FAFC",
    flex: 1,
  },
  platformRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  platformLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  openPlatformBtn: {
    backgroundColor: "#1E293B",
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  openPlatformText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
  progressSection: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#1E293B",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressText: {
    fontSize: 12,
    color: "#64748B",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  emptyState: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#64748B",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#0F172A",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    gap: 10,
  },
  addBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  addStopBtn: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  addStopText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#94A3B8",
  },
  importBtn: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  importBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
  completeBtn: {
    backgroundColor: "#34D399",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  completeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  disabled: { opacity: 0.5 },
});
