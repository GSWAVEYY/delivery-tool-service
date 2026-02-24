import { create } from "zustand";
import type { DashboardData, PlatformLink } from "@deliverybridge/shared";
import api from "../services/api";

interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;

  fetchDashboard: () => Promise<void>;
  linkPlatform: (platformId: string, displayName?: string) => Promise<void>;
  unlinkPlatform: (linkId: string) => Promise<void>;
  launchPlatform: (linkId: string) => Promise<string | null>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  data: null,
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getDashboard();
      set({ data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  linkPlatform: async (platformId, displayName) => {
    try {
      await api.linkPlatform({ platformId, displayName });
      await get().fetchDashboard();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  unlinkPlatform: async (linkId) => {
    try {
      await api.unlinkPlatform(linkId);
      await get().fetchDashboard();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  launchPlatform: async (linkId) => {
    try {
      const result = await api.launchPlatform(linkId);
      return result.launchUrl || null;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },
}));
