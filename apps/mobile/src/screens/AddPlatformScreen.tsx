import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import type { DeliveryPlatform } from "@deliverybridge/shared";
import api from "../services/api";
import { useDashboardStore } from "../store/dashboard";

interface Props {
  onDone: () => void;
}

export default function AddPlatformScreen({ onDone }: Props) {
  const { linkPlatform } = useDashboardStore();
  const [search, setSearch] = useState("");
  const [platforms, setPlatforms] = useState<DeliveryPlatform[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlatforms();
  }, []);

  useEffect(() => {
    if (search.length > 0) {
      const timer = setTimeout(() => searchPlatforms(search), 300);
      return () => clearTimeout(timer);
    } else {
      loadPlatforms();
    }
  }, [search]);

  const loadPlatforms = async () => {
    try {
      const { platforms } = await api.getPlatforms();
      setPlatforms(platforms);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchPlatforms = async (q: string) => {
    try {
      const { platforms } = await api.searchPlatforms(q);
      setPlatforms(platforms);
    } catch {
      // Silently fail search
    }
  };

  const handleAdd = async (platform: DeliveryPlatform) => {
    try {
      await linkPlatform(platform.id, platform.name);
      Alert.alert("Added", `${platform.name} added to your dashboard`, [
        { text: "Add More" },
        { text: "Done", onPress: onDone },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Platform</Text>
        <TouchableOpacity onPress={onDone}>
          <Text style={styles.doneButton}>Done</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search delivery platforms..."
        placeholderTextColor="#64748B"
        value={search}
        onChangeText={setSearch}
        autoFocus
      />

      <FlatList
        data={platforms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.platformRow}
            onPress={() => handleAdd(item)}
          >
            <View style={styles.platformIcon}>
              <Text style={styles.platformInitial}>
                {item.name.charAt(0)}
              </Text>
            </View>
            <View style={styles.platformInfo}>
              <Text style={styles.platformName}>{item.name}</Text>
              <Text style={styles.platformMeta}>
                {item.hasOfficialApi ? "Official API" : "Deep link"}
                {item.webPortalUrl ? " + Web portal" : ""}
              </Text>
            </View>
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading ? "Loading platforms..." : "No platforms found"}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  doneButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3B82F6",
  },
  searchInput: {
    marginHorizontal: 20,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 20,
  },
  platformRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  platformIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1E40AF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  platformInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  platformInfo: {
    flex: 1,
  },
  platformName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  platformMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  addIcon: {
    fontSize: 24,
    fontWeight: "600",
    color: "#3B82F6",
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 40,
  },
});
