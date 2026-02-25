const PLATFORM_COLORS: Record<string, string> = {
  amerisource: "#0057B8", // AmerisourceBergen/Cencora blue
  cencora: "#0057B8",
  mckesson: "#00857C", // McKesson teal
  cardinal: "#C8102E", // Cardinal Health red
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
