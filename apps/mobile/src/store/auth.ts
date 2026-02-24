import { create } from "zustand";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { User } from "../types";
import api from "../services/api";

// Platform-aware token storage: localStorage on web, SecureStore on native
const tokenStorage = {
  async get(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silently fail
    }
  },
  async remove(key: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silently fail
    }
  },
};

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
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
    await tokenStorage.set(TOKEN_KEY, token);
    set({ user, token, isAuthenticated: true });
  },

  register: async (data) => {
    const { user, token } = await api.register(data);
    api.setToken(token);
    await tokenStorage.set(TOKEN_KEY, token);
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors
    }
    api.setToken(null);
    await tokenStorage.remove(TOKEN_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadSession: async () => {
    try {
      const token = await tokenStorage.get(TOKEN_KEY);
      if (token) {
        api.setToken(token);
        const { user } = await api.getMe();
        set({ user, token, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch {
      await tokenStorage.remove(TOKEN_KEY);
    }
    set({ isLoading: false });
  },
}));
