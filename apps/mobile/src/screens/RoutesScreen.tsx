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
  Alert,
} from "react-native";
import api from "../services/api";
import type { Route, RouteStatus, PlatformLink, RouteTemplate } from "../types";
import { getPlatformColor, getPlatformInitial } from "../utils/platformColors";

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

  const platformName = route.platformLink?.platform?.name;
  const platformColor = platformName ? getPlatformColor(platformName) : null;

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={cardStyles.topRow}>
        <View style={cardStyles.nameCol}>
          <Text style={cardStyles.name} numberOfLines={1}>
            {route.name || `Route ${route.id.slice(-6)}`}
          </Text>
          <Text style={cardStyles.date}>{dateLabel}</Text>
        </View>
        <View style={cardStyles.rightCol}>
          {platformName && platformColor && (
            <View
              style={[
                cardStyles.platformPill,
                { backgroundColor: platformColor + "22", borderColor: platformColor + "55" },
              ]}
            >
              <Text style={[cardStyles.platformPillText, { color: platformColor }]}>
                {platformName}
              </Text>
            </View>
          )}
          <RouteBadge status={route.status} />
        </View>
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
  rightCol: { alignItems: "flex-end", gap: 4 },
  name: { fontSize: 16, fontWeight: "700", color: "#F8FAFC" },
  date: { fontSize: 12, color: "#64748B", marginTop: 2 },
  platformPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  platformPillText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
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
  const [nameEdited, setNameEdited] = useState(false);
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [selectedLinkId, setSelectedLinkId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleSelectPlatform = (linkId: string) => {
    setSelectedLinkId(linkId);
    if (!nameEdited) {
      const link = platformLinks.find((l) => l.id === linkId);
      if (link) {
        const platformName = link.displayName || link.platform.name;
        setName(`${platformName} Route`);
      }
    }
  };

  const handleClearPlatform = () => {
    setSelectedLinkId("");
    if (!nameEdited) setName("");
  };

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

        {platformLinks.length > 0 && (
          <>
            <Text style={formStyles.label}>Platform</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={formStyles.platformScroll}
            >
              <TouchableOpacity
                style={[
                  formStyles.platformChip,
                  !selectedLinkId && formStyles.platformChipSelected,
                ]}
                onPress={handleClearPlatform}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    formStyles.platformChipText,
                    !selectedLinkId && formStyles.platformChipTextSelected,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>
              {platformLinks.map((link) => {
                const color = getPlatformColor(link.platform.name);
                const initial = getPlatformInitial(link.platform.name);
                const selected = selectedLinkId === link.id;
                return (
                  <TouchableOpacity
                    key={link.id}
                    style={[
                      formStyles.platformChip,
                      selected && { borderColor: color, backgroundColor: color + "18" },
                    ]}
                    onPress={() => handleSelectPlatform(link.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[formStyles.chipIcon, { backgroundColor: color + "30" }]}>
                      <Text style={[formStyles.chipInitial, { color }]}>{initial}</Text>
                    </View>
                    <Text style={[formStyles.platformChipText, selected && { color }]}>
                      {link.displayName || link.platform.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {selectedLinkId &&
          (() => {
            const link = platformLinks.find((l) => l.id === selectedLinkId);
            const platformName = link?.displayName || link?.platform.name;
            const isMedical =
              platformName &&
              (platformName.toLowerCase().includes("amerisource") ||
                platformName.toLowerCase().includes("cencora") ||
                platformName.toLowerCase().includes("mckesson") ||
                platformName.toLowerCase().includes("cardinal"));
            if (!isMedical || !platformName) return null;
            return (
              <View style={medRouteStyles.note}>
                <Text style={medRouteStyles.noteText}>
                  Medical delivery route for {platformName}
                </Text>
              </View>
            );
          })()}

        <Text style={formStyles.label}>Route Name *</Text>
        <TextInput
          style={formStyles.input}
          placeholder="e.g. McKesson Morning Run, Cardinal Health Route..."
          placeholderTextColor="#475569"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setNameEdited(true);
          }}
        />

        <Text style={formStyles.label}>Date</Text>
        <TextInput
          style={formStyles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#475569"
          value={date}
          onChangeText={setDate}
        />

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
  platformScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  platformChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
  },
  platformChipSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#1E3A5F",
  },
  platformChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
  },
  platformChipTextSelected: {
    color: "#3B82F6",
  },
  chipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  chipInitial: {
    fontSize: 11,
    fontWeight: "800",
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

const medRouteStyles = StyleSheet.create({
  note: {
    backgroundColor: "#0C2340",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    marginTop: 4,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#93C5FD",
  },
});

// ─── RoutesScreen ─────────────────────────────────────────

export default function RoutesScreen({ onViewRoute }: Props) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [platformLinks, setPlatformLinks] = useState<PlatformLink[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [templates, setTemplates] = useState<RouteTemplate[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [usingTemplate, setUsingTemplate] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RouteTemplate | null>(null);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [stopNoteText, setStopNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchTemplates = async () => {
    try {
      const data = await api.getTemplates();
      setTemplates(data.templates);
    } catch {
      // non-fatal
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    setUsingTemplate(templateId);
    try {
      const data = await api.useTemplate(templateId);
      setShowTemplatePicker(false);
      setSelectedTemplate(null);
      onViewRoute(data.route);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create route from template";
      if (isWeb) window.alert(msg);
      else Alert.alert("Error", msg);
    } finally {
      setUsingTemplate(null);
    }
  };

  const handleSaveStopNote = async (templateId: string, stopId: string) => {
    setSavingNote(true);
    try {
      await api.updateTemplateStopNotes(templateId, stopId, stopNoteText);
      setSelectedTemplate((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stops: prev.stops.map((s) => (s.id === stopId ? { ...s, notes: stopNoteText } : s)),
        };
      });
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId
            ? {
                ...t,
                stops: t.stops.map((s) => (s.id === stopId ? { ...s, notes: stopNoteText } : s)),
              }
            : t,
        ),
      );
      setEditingStopId(null);
      setStopNoteText("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save note";
      if (isWeb) window.alert(msg);
      else Alert.alert("Error", msg);
    } finally {
      setSavingNote(false);
    }
  };

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
        <TouchableOpacity
          style={tplStyles.btn}
          onPress={() => {
            fetchTemplates();
            setShowTemplatePicker(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={tplStyles.btnText}>Start from Template</Text>
        </TouchableOpacity>
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

      {showTemplatePicker && !selectedTemplate && (
        <View style={tplStyles.overlay}>
          <View style={tplStyles.pickerHeader}>
            <Text style={tplStyles.pickerTitle}>Choose a Template</Text>
            <TouchableOpacity
              onPress={() => {
                setShowTemplatePicker(false);
                setSelectedTemplate(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={tplStyles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={tplStyles.pickerScroll} keyboardShouldPersistTaps="handled">
            {templates.length === 0 ? (
              <View style={tplStyles.emptyState}>
                <Text style={tplStyles.emptyTitle}>No templates yet</Text>
                <Text style={tplStyles.emptyBody}>
                  Save a route as a template to reuse it later.
                </Text>
              </View>
            ) : (
              templates.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={tplStyles.card}
                  onPress={() => setSelectedTemplate(t)}
                  activeOpacity={0.75}
                >
                  <Text style={tplStyles.cardName}>{t.name}</Text>
                  <View style={tplStyles.cardMeta}>
                    {t.platformLink?.platform?.name && (
                      <Text style={tplStyles.cardPlatform}>{t.platformLink.platform.name}</Text>
                    )}
                    <Text style={tplStyles.cardDetail}>
                      {t.stops.length} stop{t.stops.length !== 1 ? "s" : ""}
                    </Text>
                    <Text style={tplStyles.cardDetail}>
                      by {t.creator.firstName} {t.creator.lastName}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}

      {showTemplatePicker && selectedTemplate && (
        <View style={tplStyles.overlay}>
          <View style={tplStyles.pickerHeader}>
            <TouchableOpacity onPress={() => setSelectedTemplate(null)}>
              <Text style={tplStyles.closeText}>Back</Text>
            </TouchableOpacity>
            <Text style={tplStyles.pickerTitle}>{selectedTemplate.name}</Text>
            <TouchableOpacity
              onPress={() => {
                setShowTemplatePicker(false);
                setSelectedTemplate(null);
              }}
            >
              <Text style={tplStyles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          {selectedTemplate.platformLink && (
            <Text style={tplStyles.detailPlatform}>
              {selectedTemplate.platformLink.platform.name}
            </Text>
          )}

          <ScrollView style={tplStyles.pickerScroll} keyboardShouldPersistTaps="handled">
            {selectedTemplate.stops.map((stop) => (
              <View key={stop.id} style={stopNoteStyles.card}>
                <View style={stopNoteStyles.stopHeader}>
                  <Text style={stopNoteStyles.sequence}>{stop.sequence}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={stopNoteStyles.address}>{stop.address}</Text>
                    {stop.city && (
                      <Text style={stopNoteStyles.city}>
                        {stop.city}
                        {stop.state ? `, ${stop.state}` : ""} {stop.zipCode || ""}
                      </Text>
                    )}
                  </View>
                </View>

                {editingStopId === stop.id ? (
                  <View style={stopNoteStyles.editForm}>
                    <TextInput
                      style={stopNoteStyles.input}
                      value={stopNoteText}
                      onChangeText={setStopNoteText}
                      placeholder="Add helpful notes for drivers..."
                      placeholderTextColor="#64748B"
                      multiline
                      numberOfLines={3}
                    />
                    <View style={stopNoteStyles.editActions}>
                      <TouchableOpacity
                        style={stopNoteStyles.cancelBtn}
                        onPress={() => {
                          setEditingStopId(null);
                          setStopNoteText("");
                        }}
                      >
                        <Text style={stopNoteStyles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[stopNoteStyles.saveBtn, savingNote && { opacity: 0.5 }]}
                        onPress={() => handleSaveStopNote(selectedTemplate.id, stop.id)}
                        disabled={savingNote}
                      >
                        <Text style={stopNoteStyles.saveText}>
                          {savingNote ? "Saving..." : "Save"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    {stop.notes && <Text style={stopNoteStyles.note}>{stop.notes}</Text>}
                    <TouchableOpacity
                      style={stopNoteStyles.editBtn}
                      onPress={() => {
                        setEditingStopId(stop.id);
                        setStopNoteText(stop.notes || "");
                      }}
                    >
                      <Text style={stopNoteStyles.editBtnText}>
                        {stop.notes ? "Edit Note" : "+ Add Note"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>

          <TouchableOpacity
            style={[tplStyles.useBtn, usingTemplate === selectedTemplate.id && { opacity: 0.5 }]}
            onPress={() => handleUseTemplate(selectedTemplate.id)}
            disabled={usingTemplate === selectedTemplate.id}
            activeOpacity={0.8}
          >
            <Text style={tplStyles.useBtnText}>
              {usingTemplate === selectedTemplate.id ? "Creating Route..." : "Use This Template"}
            </Text>
          </TouchableOpacity>
        </View>
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

// ─── Template Picker Styles ──────────────────────────────

const tplStyles = StyleSheet.create({
  btn: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 12,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#93C5FD",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0F172A",
    zIndex: 90,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  pickerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  closeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3B82F6",
  },
  pickerScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 36,
    alignItems: "center",
    marginTop: 20,
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
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  cardPlatform: {
    fontSize: 12,
    fontWeight: "700",
    color: "#34D399",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cardDetail: {
    fontSize: 12,
    color: "#64748B",
  },
  creatingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
    marginTop: 8,
  },
  detailPlatform: {
    fontSize: 14,
    fontWeight: "600",
    color: "#93C5FD",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  useBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    alignItems: "center",
  },
  useBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

const stopNoteStyles = StyleSheet.create({
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  stopHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  sequence: {
    fontSize: 14,
    fontWeight: "800",
    color: "#3B82F6",
    backgroundColor: "#1E3A5F",
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: "center",
    lineHeight: 28,
    overflow: "hidden",
  },
  address: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  city: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },
  note: {
    fontSize: 13,
    color: "#CBD5E1",
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    lineHeight: 18,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  editBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#93C5FD",
  },
  editForm: {
    marginTop: 10,
  },
  input: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#334155",
    minHeight: 70,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  saveText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
