import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import type { EarningsSummary } from "../types";
import api from "../services/api";

export default function EarningsScreen() {
  const [summary, setSummary] = useState<{
    today: EarningsSummary;
    thisWeek: EarningsSummary;
    thisMonth: EarningsSummary;
    allTime: EarningsSummary;
  } | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchSummary();
  }, []);

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
      <View style={styles.header}>
        <Text style={styles.title}>Earnings</Text>
      </View>

      {summary ? (
        <View style={styles.grid}>
          <StatCard label="Today" data={summary.today} />
          <StatCard label="This Week" data={summary.thisWeek} />
          <StatCard label="This Month" data={summary.thisMonth} />
          <StatCard label="All Time" data={summary.allTime} />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{loading ? "Loading..." : "No earnings data yet"}</Text>
        </View>
      )}
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
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
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
});
