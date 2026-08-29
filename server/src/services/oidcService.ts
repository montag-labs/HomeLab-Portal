import * as oidc from "openid-client";

const TRANSACTION_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING_TRANSACTIONS = 1_000;

interface OidcSettings {
  issuerUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string;
  label: string;
  allowedGroups: string[];
  groupsClaim: string;
  clientAuthMethod: "client_secret_post" | "client_secret_basic" | "none";
}

interface OidcTransaction {
  codeVerifier: string;
  nonce: string;
  expiresAt: number;
}

export interface OidcIdentity {
  subject: string;
  displayName?: string;
}

const transactions = new Map<string, OidcTransaction>();
let configurationPromise: Promise<oidc.Configuration> | undefined;

function readSettings(): OidcSettings | undefined {
  const issuerUrl = process.env.OIDC_ISSUER_URL?.trim();
  const clientId = process.env.OIDC_CLIENT_ID?.trim();
  const redirectUri = process.env.OIDC_REDIRECT_URI?.trim();
  const allowedGroups = (process.env.OIDC_ALLOWED_GROUPS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!issuerUrl || !clientId || !redirectUri || allowedGroups.length === 0) return undefined;

  const clientSecret = process.env.OIDC_CLIENT_SECRET?.trim() || undefined;
  const configuredMethod = process.env.OIDC_CLIENT_AUTH_METHOD?.trim();
  const clientAuthMethod = configuredMethod === "client_secret_basic"
    || configuredMethod === "client_secret_post"
    || configuredMethod === "none"
    ? configuredMethod
    : clientSecret ? "client_secret_post" : "none";
  const requestedScopes = (process.env.OIDC_SCOPES?.trim() || "openid profile email groups")
    .split(/\s+/)
    .filter(Boolean);
  if (!requestedScopes.includes("openid")) requestedScopes.unshift("openid");

  return {
    issuerUrl,
    clientId,
    clientSecret,
    redirectUri,
    scopes: requestedScopes.join(" "),
    label: process.env.OIDC_DISPLAY_NAME?.trim() || "Single Sign-on",
    allowedGroups,
    groupsClaim: process.env.OIDC_GROUPS_CLAIM?.trim() || "groups",
    clientAuthMethod,
  };
}

function getClientAuthentication(settings: OidcSettings): oidc.ClientAuth {
  if (settings.clientAuthMethod === "client_secret_basic") {
    return oidc.ClientSecretBasic(settings.clientSecret);
  }
  if (settings.clientAuthMethod === "client_secret_post") {
    return oidc.ClientSecretPost(settings.clientSecret);
  }
  return oidc.None();
}

async function getConfiguration(settings: OidcSettings): Promise<oidc.Configuration> {
  configurationPromise ??= oidc.discovery(
    new URL(settings.issuerUrl),
    settings.clientId,
    settings.clientSecret ? { client_secret: settings.clientSecret } : undefined,
    getClientAuthentication(settings),
  ).catch((error) => {
    configurationPromise = undefined;
    throw error;
  });
  return configurationPromise;
}

function pruneTransactions(now = Date.now()): void {
  for (const [state, transaction] of transactions) {
    if (transaction.expiresAt <= now) transactions.delete(state);
  }
}

function readClaim(claims: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, claims);
}

function hasAllowedGroup(claims: Record<string, unknown>, settings: OidcSettings): boolean {
  const value = readClaim(claims, settings.groupsClaim);
  const groups = Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : typeof value === "string" ? [value] : [];
  return settings.allowedGroups.some((allowedGroup) => groups.includes(allowedGroup));
}

export function getOidcStatus(): { enabled: boolean; label?: string; passwordLoginDisabled: boolean } {
  const settings = readSettings();
  return {
    enabled: Boolean(settings),
    label: settings?.label,
    passwordLoginDisabled: Boolean(settings) && process.env.OIDC_DISABLE_PASSWORD_LOGIN === "true",
  };
}

export async function createOidcAuthorizationUrl(): Promise<URL> {
  const settings = readSettings();
  if (!settings) throw new Error("OIDC configuration or allowed admin groups are missing");
  const configuration = await getConfiguration(settings);
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  pruneTransactions();
  if (transactions.size >= MAX_PENDING_TRANSACTIONS) {
    throw new Error("Too many pending OIDC transactions");
  }
  transactions.set(state, { codeVerifier, nonce, expiresAt: Date.now() + TRANSACTION_TTL_MS });

  return oidc.buildAuthorizationUrl(configuration, {
    redirect_uri: settings.redirectUri,
    scope: settings.scopes,
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });
}

export async function completeOidcAuthorization(callbackUrl: URL): Promise<OidcIdentity> {
  const settings = readSettings();
  if (!settings) throw new Error("OIDC configuration or allowed admin groups are missing");
  const state = callbackUrl.searchParams.get("state") ?? "";
  const transaction = transactions.get(state);
  transactions.delete(state);
  if (!transaction || transaction.expiresAt <= Date.now()) {
    throw new Error("OIDC transaction is missing or expired");
  }

  const configuration = await getConfiguration(settings);
  const currentUrl = new URL(settings.redirectUri);
  currentUrl.search = callbackUrl.search;
  const tokens = await oidc.authorizationCodeGrant(configuration, currentUrl, {
    pkceCodeVerifier: transaction.codeVerifier,
    expectedState: state,
    expectedNonce: transaction.nonce,
  });
  const claims = tokens.claims() as Record<string, unknown> | undefined;
  if (!claims || typeof claims.sub !== "string") throw new Error("OIDC ID token has no subject");
  if (!hasAllowedGroup(claims, settings)) throw new Error("OIDC user is not in an allowed admin group");

  const displayName = typeof claims.name === "string"
    ? claims.name
    : typeof claims.preferred_username === "string"
      ? claims.preferred_username
      : typeof claims.email === "string" ? claims.email : undefined;
  return { subject: claims.sub, displayName };
}
