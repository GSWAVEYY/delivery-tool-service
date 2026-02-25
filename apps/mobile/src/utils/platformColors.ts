const PLATFORM_COLORS: Record<string, string> = {
  amazon: "#F59E0B",
  fedex: "#8B5CF6",
  doordash: "#EF4444",
  ups: "#D97706",
  lasership: "#10B981",
  ontrac: "#06B6D4",
  instacart: "#22C55E",
  uber: "#000000",
  grubhub: "#F97316",
  usps: "#1D4ED8",
  shipt: "#14B8A6",
  gopuff: "#3B82F6",
  spark: "#2563EB",
};

export function getPlatformColor(platformName: string): string {
  const lower = platformName.toLowerCase();
  for (const [key, color] of Object.entries(PLATFORM_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "#3B82F6"; // default blue
}

export function getPlatformInitial(platformName: string): string {
  return platformName.charAt(0).toUpperCase();
}
