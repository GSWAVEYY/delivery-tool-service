import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import type { EarningsSummary, PlatformLink } from "../types";
import api from "../services/api";

const isWeb = Platform.OS === "web";

interface LogForm {
  platformLinkId: string;
  date: string;
  earnings: string;
  tips: string;
  deliveries: string;
  notes: string;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function EarningsScreen() {
  const [summary, setSummary] = useState<{
    today: EarningsSummary;
    thisWeek: EarningsSummary;
    thisMonth: EarningsSummary;
    allTime: EarningsSummary;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [platformLinks, setPlatformLinks] = useState<PlatformLink[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<LogForm>({
    platformLinkId: "",
    date: todayStr(),
    earnings: "",
    tips: "",
    deliveries: "",
    notes: "",
  });

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await api.getEarningsSummary();
      setSummary(data);
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatforms = async () => {
    try {
      const data = await api.getDashboard();
      setPlatformLinks(data.platformLinks ?? []);
      if (data.platformLinks?.length > 0) {
        setForm((f) => ({ ...f, platformLinkId: data.platformLinks[0].id }));
      }
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchPlatforms();
  }, []);

  const handleSubmit = async () => {
    const earningsVal = parseFloat(form.earnings);
    if (!form.earnings || isNaN(earningsVal) || earningsVal < 0) {
      const msg = "Please enter a valid earnings amount";
      if (isWeb) window.alert(msg);
      else Alert.alert("Error", msg);
      return;
    }
    if (!form.platformLinkId) {
      const msg = "Please select a platform";
      if (isWeb) window.alert(msg);
      else Alert.alert("Error", msg);
      return;
    }

    setSubmitting(true);
    try {
      await api.addEarning({
        platformLinkId: form.platformLinkId,
        date: form.date || todayStr(),
        earnings: earningsVal,
        tips: form.tips ? parseFloat(form.tips) : undefined,
        deliveries: form.deliveries ? parseInt(form.deliveries, 10) : undefined,
        notes: form.notes || undefined,
      });

      // Reset form and refresh
      setForm({
        platformLinkId: platformLinks[0]?.id ?? "",
        date: todayStr(),
        earnings: "",
        tips: "",
        deliveries: "",
        notes: "",
      });
      setShowForm(false);
      fetchSummary();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log earnings";
      if (isWeb) window.alert(msg);
      else Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const StatCard = ({ label, data }: { label: string; data: EarningsSummary }) => (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statAmount}>${data.earnings.toFixed(2)}</Text>
      <View style={styles.statRow}>
        <Text style={styles.statDetail}>{data.deliveries} deliveries</Text>
        {data.tips > 0 && <Text style={styles.statTips}>+${data.tips.toFixed(2)} tips</Text>}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSummary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Earnings</Text>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => setShowForm((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.logBtnText}>{showForm ? "Cancel" : "+ Log Earnings"}</Text>
        </TouchableOpacity>
      </View>

      {/* Log Earnings inline form */}
      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Log Earnings</Text>

          {/* Platform picker */}
          {platformLinks.length > 1 && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Platform</Text>
              <View style={styles.platformPicker}>
                {platformLinks.map((link) => (
                  <TouchableOpacity
                    key={link.id}
                    style={[
                      styles.platformOption,
                      form.platformLinkId === link.id && styles.platformOptionSelected,
                    ]}
                    onPress={() => setForm((f) => ({ ...f, platformLinkId: link.id }))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.platformOptionText,
                        form.platformLinkId === link.id && styles.platformOptionTextSelected,
                      ]}
                    >
                      {link.displayName || link.platform.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.date}
              onChangeText={(v) => setForm((f) => ({ ...f, date: v }))}
              placeholder="2025-01-24"
              placeholderTextColor="#64748B"
            />
          </View>

          {/* Earnings */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Earnings ($)</Text>
            <TextInput
              style={styles.input}
              value={form.earnings}
              onChangeText={(v) => setForm((f) => ({ ...f, earnings: v }))}
              placeholder="0.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
            />
          </View>

          {/* Tips + Deliveries row */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.fieldLabel}>Tips ($)</Text>
              <TextInput
                style={styles.input}
                value={form.tips}
                onChangeText={(v) => setForm((f) => ({ ...f, tips: v }))}
                placeholder="0.00"
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Deliveries</Text>
              <TextInput
                style={styles.input}
                value={form.deliveries}
                onChangeText={(v) => setForm((f) => ({ ...f, deliveries: v }))}
                placeholder="0"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              placeholder="Any notes..."
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={2}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>{submitting ? "Saving..." : "Save Earnings"}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Summary cards */}
      {summary && summary.allTime.earnings > 0 ? (
        <View style={styles.grid}>
          <StatCard label="Today" data={summary.today} />
          <StatCard label="This Week" data={summary.thisWeek} />
          <StatCard label="This Month" data={summary.thisMonth} />
          <StatCard label="All Time" data={summary.allTime} />
        </View>
      ) : loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardIcon}>💰</Text>
          <Text style={styles.emptyCardTitle}>No earnings recorded yet</Text>
          <Text style={styles.emptyCardBody}>
            Start a shift or log your first delivery to see your earnings here
          </Text>
          <TouchableOpacity
            style={styles.emptyCardBtn}
            onPress={() => setShowForm(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyCardBtnText}>+ Log Earnings</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  logBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  logBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  formCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 6,
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
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  platformPicker: {
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
  platformOptionSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#1E3A5F",
  },
  platformOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  platformOptionTextSelected: {
    color: "#93C5FD",
  },
  submitBtn: {
    backgroundColor: "#34D399",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#064E3B",
  },
  grid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
  },
  statLabel: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#34D399",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  statDetail: {
    fontSize: 13,
    color: "#64748B",
  },
  statTips: {
    fontSize: 13,
    color: "#6EE7B7",
    fontWeight: "600",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
  },
  emptyCard: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 36,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  emptyCardIcon: {
    fontSize: 56,
    marginBottom: 18,
  },
  emptyCardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 10,
    textAlign: "center",
  },
  emptyCardBody: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyCardBtn: {
    backgroundColor: "#34D399",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 32,
  },
  emptyCardBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#064E3B",
  },
});
