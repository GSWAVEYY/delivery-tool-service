import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  DashboardData,
  DeliveryPlatform,
  PlatformLink,
  PlatformLaunchData,
  EarningsSummary,
  Route,
  RouteDetail,
  Stop,
  Package,
  TodayData,
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

  async addEarning(data: {
    platformLinkId: string;
    date: string;
    earnings: number;
    tips?: number;
    deliveries?: number;
    notes?: string;
  }) {
    return this.request("/earnings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ─── Shifts ─────────────────────────────────────────────

  async getShifts(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request<{ shifts: import("../types").Shift[] }>(`/shifts${query}`);
  }

  async createShift(data: { platformId: string; startTime: string; notes?: string }) {
    return this.request<{ shift: import("../types").Shift }>("/shifts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateShiftStatus(shiftId: string, data: { status: string; endTime?: string }) {
    return this.request<{ shift: import("../types").Shift }>(`/shifts/${shiftId}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // ─── Routes ─────────────────────────────────────────────

  async getRoutes(params?: { date?: string; status?: string }): Promise<{ routes: Route[] }> {
    const query = params
      ? "?" +
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
          .join("&")
      : "";
    return this.request(`/routes${query}`);
  }

  async getRoute(routeId: string): Promise<{ route: RouteDetail }> {
    return this.request(`/routes/${routeId}`);
  }

  async createRoute(data: {
    platformLinkId?: string;
    name: string;
    date?: string;
    notes?: string;
  }): Promise<{ route: Route }> {
    return this.request("/routes", { method: "POST", body: JSON.stringify(data) });
  }

  async updateRouteStatus(routeId: string, status: string): Promise<{ route: Route }> {
    return this.request(`/routes/${routeId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  // ─── Stops ──────────────────────────────────────────────

  async addStop(
    routeId: string,
    data: {
      address: string;
      city?: string;
      state?: string;
      zipCode?: string;
      sequence?: number;
    },
  ): Promise<{ stop: Stop }> {
    return this.request(`/routes/${routeId}/stops`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateStopStatus(
    routeId: string,
    stopId: string,
    data: { status: string; notes?: string },
  ): Promise<{ stop: Stop }> {
    return this.request(`/routes/${routeId}/stops/${stopId}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async bulkAddStops(
    routeId: string,
    stops: Array<{ address: string; city?: string; state?: string; zipCode?: string }>,
  ): Promise<{ stops: Stop[]; count: number }> {
    return this.request(`/routes/${routeId}/stops/bulk`, {
      method: "POST",
      body: JSON.stringify({ stops }),
    });
  }

  // ─── Packages ───────────────────────────────────────────

  async addPackage(
    routeId: string,
    data: { trackingNumber: string; barcode?: string; stopId?: string },
  ): Promise<{ package: Package }> {
    return this.request(`/routes/${routeId}/packages`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async scanPackage(routeId: string, barcode: string): Promise<{ package: Package }> {
    return this.request(`/routes/${routeId}/packages/scan`, {
      method: "POST",
      body: JSON.stringify({ barcode }),
    });
  }

  async updatePackageStatus(
    routeId: string,
    packageId: string,
    data: { status: string; notes?: string },
  ): Promise<{ package: Package }> {
    return this.request(`/routes/${routeId}/packages/${packageId}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getRoutePackages(routeId: string, status?: string): Promise<{ packages: Package[] }> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request(`/routes/${routeId}/packages${query}`);
  }

  // ─── Today ──────────────────────────────────────────────

  async getToday(): Promise<TodayData> {
    return this.request("/routes/today");
  }
}

export const api = new ApiClient();
export default api;
