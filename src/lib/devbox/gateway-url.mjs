function pickGatewayString(gateway, keys) {
  if (!gateway || typeof gateway !== "object") {
    return null;
  }
  for (const key of keys) {
    const value = gateway[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function getGatewayUrlFromDevboxInfo(info) {
  return pickGatewayString(info?.gateway, [
    "url",
    "route",
    "externalURL",
    "appURL",
    "accessURL",
  ]);
}

export function getGatewayAuthTokenFromDevboxInfo(info) {
  return pickGatewayString(info?.gateway, [
    "accessToken",
    "authToken",
    "bearerToken",
    "token",
    "jwt",
  ]);
}

export function resolveGatewayUrl(runtimeName, currentUrl, info) {
  const fromDevbox = getGatewayUrlFromDevboxInfo(info);
  if (fromDevbox) {
    return fromDevbox;
  }
  const existing = currentUrl?.trim();
  if (existing) {
    return existing;
  }
  if (runtimeName) {
    throw new Error(
      `Devbox ${runtimeName} is running but gateway URL is missing from API response`,
    );
  }
  return null;
}
