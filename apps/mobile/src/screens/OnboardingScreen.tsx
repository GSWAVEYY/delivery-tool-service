import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import type { DeliveryPlatform } from "../types";
import api from "../services/api";
import { useAuthStore } from "../store/auth";
import { getPlatformColor } from "../utils/platformColors";

const isWeb = Platform.OS === "web";

interface Props {
  onComplete: () => void;
}

type Step = 1 | 2;

export default function OnboardingScreen({ onComplete }: Props) {
  const { user } = useAuthStore();
  const [step, setStep] = useState<Step>(1);
  const [platforms, setPlatforms] = useState<DeliveryPlatform[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [linking, setLinking] = useState(false);

  const fetchPlatforms = async () => {
    setLoadingPlatforms(true);
    try {
      const data = await api.getPlatforms();
      setPlatforms(data.platforms ?? []);
    } catch {
      // non-fatal — user can still skip
    } finally {
      setLoadingPlatforms(false);
    }
  };

  const handleGoToStep2 = () => {
    setStep(2);
    fetchPlatforms();
  };

  const togglePlatform = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleLinkAndFinish = async () => {
    if (selected.size === 0) {
      onComplete();
      return;
    }
    setLinking(true);
    try {
      await Promise.all(
        Array.from(selected).map((platformId) =>
          api.linkPlatform({ platformId }).catch(() => {
            // ignore individual failures — best effort
          }),
        ),
      );
    } catch {
      // ignore
    } finally {
      setLinking(false);
    }
    onComplete();
  };

  const firstName = user?.firstName || "there";

  // ─── Step 1: Welcome ───────────────────────────────────

  if (step === 1) {
    return (
      <View style={styles.container}>
        <View style={styles.step1Inner}>
          {/* Brand mark */}
          <View style={styles.brandBadge}>
            <Text style={styles.brandText}>DB</Text>
          </View>

          {/* Hero icon */}
          <Text style={styles.heroIcon}>🚚</Text>

          {/* Headline */}
          <Text style={styles.welcomeHeadline}>
            Welcome to DeliveryBridge,{"\n"}
            <Text style={styles.welcomeName}>{firstName}!</Text>
          </Text>

          <Text style={styles.welcomeBody}>
            Let's set up your delivery hub{"\n"}in under a minute.
          </Text>

          {/* Feature bullets */}
          <View style={styles.featureList}>
            <FeatureBullet icon="📦" text="Manage routes across all your distributors" />
            <FeatureBullet icon="📋" text="Scan packages, track stops, log deliveries" />
            <FeatureBullet icon="🏥" text="Built for medical & pharmaceutical delivery" />
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleGoToStep2}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Get Started →</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onComplete} activeOpacity={0.7} style={styles.skipLink}>
            <Text style={styles.skipText}>Skip setup for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Step 2: Platform selection ───────────────────────

  return (
    <View style={styles.container}>
      {/* Fixed header */}
      <View style={styles.step2Header}>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
        <Text style={styles.stepIndicator}>Step 2 of 2</Text>
        <Text style={styles.step2Headline}>Which distributors do you deliver for?</Text>
        <Text style={styles.step2Sub}>
          Select all that apply. These are your subcontracted carriers.
        </Text>
      </View>

      {/* Platform grid */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loadingPlatforms ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#3B82F6" size="large" />
            <Text style={styles.loadingText}>Loading platforms...</Text>
          </View>
        ) : (
          <View style={styles.platformGrid}>
            {platforms.map((platform) => {
              const isSelected = selected.has(platform.id);
              const brandColor = getPlatformColor(platform.name);
              return (
                <TouchableOpacity
                  key={platform.id}
                  style={[
                    styles.platformCard,
                    isSelected && { borderColor: brandColor, backgroundColor: brandColor + "12" },
                  ]}
                  onPress={() => togglePlatform(platform.id)}
                  activeOpacity={0.75}
                >
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: brandColor }]}>
                      <Text style={styles.checkBadgeText}>✓</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.platformIcon,
                      {
                        backgroundColor: brandColor + "22",
                        borderWidth: 1,
                        borderColor: brandColor + "55",
                      },
                      isSelected && { backgroundColor: brandColor + "33" },
                    ]}
                  >
                    <Text style={[styles.platformInitial, { color: brandColor }]}>
                      {platform.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[styles.platformName, isSelected && { color: "#F8FAFC" }]}
                    numberOfLines={2}
                  >
                    {platform.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Bottom spacer so content clears the fixed footer */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed footer actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.linkBtn, linking && styles.btnDisabled]}
          onPress={handleLinkAndFinish}
          disabled={linking}
          activeOpacity={0.85}
        >
          {linking ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.linkBtnText}>
              {selected.size > 0 ? `Link Selected (${selected.size}) →` : "Continue →"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onComplete} activeOpacity={0.7} style={styles.skipLinkFooter}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────

function FeatureBullet({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },

  // ── Step 1 ──
  step1Inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  brandBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#1E40AF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  brandText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  heroIcon: {
    fontSize: 72,
    marginBottom: 24,
    textAlign: "center",
  },
  welcomeHeadline: {
    fontSize: 30,
    fontWeight: "700",
    color: "#F8FAFC",
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 14,
  },
  welcomeName: {
    color: "#3B82F6",
  },
  welcomeBody: {
    fontSize: 17,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 36,
  },
  featureList: {
    alignSelf: "stretch",
    gap: 14,
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 14,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    fontSize: 15,
    color: "#CBD5E1",
    fontWeight: "500",
    flex: 1,
  },
  primaryBtn: {
    alignSelf: "stretch",
    backgroundColor: "#3B82F6",
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  skipLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    color: "#64748B",
    textDecorationLine: "underline",
  },

  // ── Step 2 ──
  step2Header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#1E293B",
    borderRadius: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressFill: {
    width: "100%",
    height: 4,
    backgroundColor: "#3B82F6",
    borderRadius: 2,
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  step2Headline: {
    fontSize: 26,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 8,
    lineHeight: 34,
  },
  step2Sub: {
    fontSize: 15,
    color: "#94A3B8",
    lineHeight: 22,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingRow: {
    paddingTop: 60,
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: "#64748B",
  },
  platformGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  platformCard: {
    width: "47%",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  platformCardSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#0F2744",
  },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  platformIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1E3A5F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  platformIconSelected: {
    backgroundColor: "#1E40AF",
  },
  platformInitial: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  platformName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
  platformNameSelected: {
    color: "#93C5FD",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0F172A",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 16,
    paddingBottom: isWeb ? 20 : 36,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 10,
  },
  linkBtn: {
    alignSelf: "stretch",
    backgroundColor: "#3B82F6",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  linkBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  skipLinkFooter: {
    paddingVertical: 4,
  },
});
