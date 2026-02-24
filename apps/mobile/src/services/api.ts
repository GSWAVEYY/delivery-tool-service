import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  DashboardData,
  DeliveryPlatform,
  PlatformLink,
  PlatformLaunchData,
  EarningsSummary,
} from "../types";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Network error" }));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // ─── Auth ───────────────────────────────────────────────

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<{ user: AuthResponse["user"] }>("/auth/me");
  }

  async logout() {
    return this.request("/auth/logout", { method: "POST" });
  }

  // ─── Dashboard ──────────────────────────────────────────

  async getDashboard(): Promise<DashboardData> {
    return this.request("/dashboard");
  }

  async linkPlatform(data: {
    platformId: string;
    displayName?: string;
    username?: string;
  }): Promise<{ link: PlatformLink }> {
    return this.request("/dashboard/link", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async unlinkPlatform(linkId: string) {
    return this.request(`/dashboard/link/${linkId}`, { method: "DELETE" });
  }

  async launchPlatform(linkId: string): Promise<PlatformLaunchData> {
    return this.request(`/dashboard/launch/${linkId}`, { method: "POST" });
  }

  // ─── Platforms ──────────────────────────────────────────

  async getPlatforms(): Promise<{ platforms: DeliveryPlatform[] }> {
    return this.request("/platforms");
  }

  async searchPlatforms(q: string): Promise<{ platforms: DeliveryPlatform[] }> {
    return this.request(`/platforms/search?q=${encodeURIComponent(q)}`);
  }

  // ─── Earnings ───────────────────────────────────────────

  async getEarningsSummary(): Promise<{
    today: EarningsSummary;
    thisWeek: EarningsSummary;
    thisMonth: EarningsSummary;
    allTime: EarningsSummary;
  }> {
    return this.request("/earnings/summary");
  }
}

export const api = new ApiClient();
export default api;
