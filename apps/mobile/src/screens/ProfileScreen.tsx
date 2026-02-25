import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { useAuthStore } from "../store/auth";

const isWeb = Platform.OS === "web";

type MenuPanel = "account" | "hub" | "help" | "notifications" | null;

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [openPanel, setOpenPanel] = useState<MenuPanel>(null);

  const togglePanel = (panel: MenuPanel) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  };

  const handleLogout = () => {
    if (isWeb) {
      if (window.confirm("Are you sure you want to sign out?")) {
        logout();
      }
    } else {
      Alert.alert("Logout", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logout },
      ]);
    }
  };

  const handleHelpLink = () => {
    const url = "https://deliverybridge.com";
    if (isWeb) {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url).catch(() => {
        Alert.alert("Could not open browser");
      });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* Avatar card */}
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.charAt(0)}
            {user?.lastName?.charAt(0)}
          </Text>
        </View>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        )}
      </View>

      {/* Menu section */}
      <View style={styles.section}>
        {/* Account Settings */}
        <TouchableOpacity
          style={[styles.menuItem, openPanel === "account" && styles.menuItemOpen]}
          onPress={() => togglePanel("account")}
          activeOpacity={0.7}
        >
          <Text style={styles.menuText}>Account Settings</Text>
          <Text style={styles.menuChevron}>{openPanel === "account" ? "▲" : "▼"}</Text>
        </TouchableOpacity>
        {openPanel === "account" && (
          <View style={styles.panel}>
            <View style={styles.panelRow}>
              <Text style={styles.panelLabel}>First Name</Text>
              <Text style={styles.panelValue}>{user?.firstName || "—"}</Text>
            </View>
            <View style={styles.panelDivider} />
            <View style={styles.panelRow}>
              <Text style={styles.panelLabel}>Last Name</Text>
              <Text style={styles.panelValue}>{user?.lastName || "—"}</Text>
            </View>
            <View style={styles.panelDivider} />
            <View style={styles.panelRow}>
              <Text style={styles.panelLabel}>Email</Text>
              <Text style={styles.panelValue} numberOfLines={1}>
                {user?.email || "—"}
              </Text>
            </View>
            {user?.phone ? (
              <>
                <View style={styles.panelDivider} />
                <View style={styles.panelRow}>
                  <Text style={styles.panelLabel}>Phone</Text>
                  <Text style={styles.panelValue}>{user.phone}</Text>
                </View>
              </>
            ) : null}
            <Text style={styles.panelNote}>To update your details, contact support.</Text>
          </View>
        )}

        {/* Notification Preferences */}
        <TouchableOpacity
          style={[styles.menuItem, openPanel === "notifications" && styles.menuItemOpen]}
          onPress={() => togglePanel("notifications")}
          activeOpacity={0.7}
        >
          <Text style={styles.menuText}>Notification Preferences</Text>
          <Text style={styles.menuChevron}>{openPanel === "notifications" ? "▲" : "▼"}</Text>
        </TouchableOpacity>
        {openPanel === "notifications" && (
          <View style={styles.panel}>
            <View style={styles.comingSoonRow}>
              <Text style={styles.comingSoonIcon}>🔔</Text>
              <View>
                <Text style={styles.comingSoonTitle}>Coming soon</Text>
                <Text style={styles.comingSoonBody}>
                  Push notification controls will be available in an upcoming update.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* My Hub */}
        <TouchableOpacity
          style={[styles.menuItem, openPanel === "hub" && styles.menuItemOpen]}
          onPress={() => togglePanel("hub")}
          activeOpacity={0.7}
        >
          <Text style={styles.menuText}>My Hub</Text>
          <Text style={styles.menuChevron}>{openPanel === "hub" ? "▲" : "▼"}</Text>
        </TouchableOpacity>
        {openPanel === "hub" && (
          <View style={styles.panel}>
            <View style={styles.comingSoonRow}>
              <Text style={styles.comingSoonIcon}>🏢</Text>
              <View>
                <Text style={styles.comingSoonTitle}>Coming soon</Text>
                <Text style={styles.comingSoonBody}>
                  Hub management — team tracking, shared dashboards, and more.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Help & Support */}
        <TouchableOpacity
          style={[styles.menuItem, openPanel === "help" && styles.menuItemOpen]}
          onPress={() => togglePanel("help")}
          activeOpacity={0.7}
        >
          <Text style={styles.menuText}>Help & Support</Text>
          <Text style={styles.menuChevron}>{openPanel === "help" ? "▲" : "▼"}</Text>
        </TouchableOpacity>
        {openPanel === "help" && (
          <View style={styles.panel}>
            <Text style={styles.helpBody}>
              Need help? Visit our support site or email us directly.
            </Text>
            <TouchableOpacity style={styles.helpBtn} onPress={handleHelpLink} activeOpacity={0.8}>
              <Text style={styles.helpBtnText}>Visit DeliveryBridge.com ↗</Text>
            </TouchableOpacity>
            <Text style={styles.helpEmail}>support@deliverybridge.com</Text>
          </View>
        )}
      </View>

      {/* Upgrade CTA */}
      {!user?.isPremium && (
        <TouchableOpacity style={styles.upgradeButton} activeOpacity={0.8}>
          <Text style={styles.upgradeText}>Upgrade to Premium</Text>
          <Text style={styles.upgradePrice}>$4.99/mo</Text>
        </TouchableOpacity>
      )}

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    paddingBottom: 20,
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
  card: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1E40AF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  email: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
  premiumBadge: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  menuItem: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  menuText: {
    fontSize: 16,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  menuChevron: {
    fontSize: 11,
    color: "#64748B",
  },
  panel: {
    backgroundColor: "#162032",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#1E293B",
  },
  panelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  panelLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  panelValue: {
    fontSize: 14,
    color: "#CBD5E1",
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  panelDivider: {
    height: 1,
    backgroundColor: "#1E293B",
  },
  panelNote: {
    fontSize: 12,
    color: "#475569",
    marginTop: 12,
    fontStyle: "italic",
  },
  comingSoonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  comingSoonIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  comingSoonTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 4,
  },
  comingSoonBody: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    flex: 1,
  },
  helpBody: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 20,
    marginBottom: 16,
  },
  helpBtn: {
    backgroundColor: "#1E3A5F",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  helpBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#93C5FD",
  },
  helpEmail: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  upgradeButton: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  upgradeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  upgradePrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DDD6FE",
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
});
