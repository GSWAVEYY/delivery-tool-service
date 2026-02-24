import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { User } from "@deliverybridge/shared";
import api from "../services/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

const TOKEN_KEY = "deliverybridge_token";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { user, token } = await api.login({ email, password });
    api.setToken(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ user, token, isAuthenticated: true });
  },

  register: async (data) => {
    const { user, token } = await api.register(data);
    api.setToken(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors
    }
    api.setToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        api.setToken(token);
        const { user } = await api.getMe();
        set({ user, token, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    set({ isLoading: false });
  },
}));
