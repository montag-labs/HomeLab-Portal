import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as oidc from "openid-client";
import { z } from "zod";

const TRANSACTION_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING_TRANSACTIONS = 1_000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OIDC_CONFIG_FILE = process.env.OIDC_CONFIG_FILE
  ?? path.resolve(__dirname, "../../data/oidc.json");

const clientAuthMethodSchema = z.enum(["client_secret_post", "client_secret_basic", "none"]);
const storedConfigSchema = z.object({
  enabled: z.boolean().default(false),
  issuerUrl: z.string().max(2048).default(""),
  clientId: z.string().max(512).default(""),
  clientSecret: z.string().max(4096).optional(),
  redirectUri: z.string().max(2048).default(""),
  allowedGroups: z.array(z.string().min(1).max(512)).max(100).default([]),
  groupsClaim: z.string().min(1).max(256).default("groups"),
  scopes: z.string().min(1).max(1024).default("openid profile email groups"),
  displayName: z.string().min(1).max(80).default("Single Sign-on"),
  clientAuthMethod: clientAuthMethodSchema.default("client_secret_post"),
  disablePasswordLogin: z.boolean().default(false),
  lastVerifiedAt: z.string().datetime().optional(),
});
const adminConfigInputSchema = storedConfigSchema
  .omit({ clientSecret: true, lastVerifiedAt: true })
  .extend({
    clientSecret: z.string().max(4096).optional(),
    clearClientSecret: z.boolean().optional(),
  });

type StoredOidcConfig = z.infer<typeof storedConfigSchema>;
type OidcClientAuthMethod = z.infer<typeof clientAuthMethodSchema>;

interface OidcTransaction {
  codeVerifier: string;
  nonce: string;
  settingsFingerprint: string;
  expiresAt: number;
}

export interface OidcIdentity {
  subject: string;
  displayName?: string;
}

export interface OidcAdminConfig {
  enabled: boolean;
  issuerUrl: string;
  clientId: string;
  redirectUri: string;
  allowedGroups: string[];
  groupsClaim: string;
  scopes: string;
  displayName: string;
  clientAuthMethod: OidcClientAuthMethod;
  disablePasswordLogin: boolean;
  clientSecretConfigured: boolean;
  lastVerifiedAt?: string;
  managedByEnvironment: boolean;
}

export type OidcAdminConfigInput = z.infer<typeof adminConfigInputSchema>;

const transactions = new Map<string, OidcTransaction>();
let cachedConfiguration: { fingerprint: string; promise: Promise<oidc.Configuration> } | undefined;

function cleanList(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function withOpenIdScope(value: string): string {
  const scopes = value.trim().split(/\s+/).filter(Boolean);
  if (!scopes.includes("openid")) scopes.unshift("openid");
  return scopes.join(" ");
}

function environmentConfig(): StoredOidcConfig | undefined {
  const environmentKeys = [
    "OIDC_ISSUER_URL",
    "OIDC_CLIENT_ID",
    "OIDC_CLIENT_SECRET",
    "OIDC_REDIRECT_URI",
    "OIDC_ALLOWED_GROUPS",
  ];
  if (!environmentKeys.some((key) => Boolean(process.env[key]?.trim()))) return undefined;
  const clientSecret = process.env.OIDC_CLIENT_SECRET?.trim() || undefined;
  const configuredMethod = process.env.OIDC_CLIENT_AUTH_METHOD?.trim();
  const clientAuthMethod: OidcClientAuthMethod = clientAuthMethodSchema.safeParse(configuredMethod).success
    ? configuredMethod as OidcClientAuthMethod
    : clientSecret ? "client_secret_post" : "none";

  return storedConfigSchema.parse({
    enabled: true,
    issuerUrl: process.env.OIDC_ISSUER_URL?.trim() ?? "",
    clientId: process.env.OIDC_CLIENT_ID?.trim() ?? "",
    clientSecret,
    redirectUri: process.env.OIDC_REDIRECT_URI?.trim() ?? "",
    allowedGroups: cleanList(process.env.OIDC_ALLOWED_GROUPS ?? ""),
    groupsClaim: process.env.OIDC_GROUPS_CLAIM?.trim() || "groups",
    scopes: withOpenIdScope(process.env.OIDC_SCOPES?.trim() || "openid profile email groups"),
    displayName: process.env.OIDC_DISPLAY_NAME?.trim() || "Single Sign-on",
    clientAuthMethod,
    disablePasswordLogin: process.env.OIDC_DISABLE_PASSWORD_LOGIN === "true",
  });
}

async function readStoredConfig(): Promise<StoredOidcConfig> {
  try {
    return storedConfigSchema.parse(JSON.parse(await readFile(OIDC_CONFIG_FILE, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return storedConfigSchema.parse({});
    throw error;
  }
}

async function atomicWriteConfig(config: StoredOidcConfig): Promise<void> {
  const directory = path.dirname(OIDC_CONFIG_FILE);
  const temporaryFile = `${OIDC_CONFIG_FILE}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(temporaryFile, JSON.stringify(storedConfigSchema.parse(config), null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  try {
    await rename(temporaryFile, OIDC_CONFIG_FILE);
  } catch (error) {
    await rm(temporaryFile, { force: true });
    throw error;
  }
}

function isSecureApplicationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      || (url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname));
  } catch {
    return false;
  }
}

function validateEnabledConfig(config: StoredOidcConfig): void {
  if (!config.enabled) return;
  if (!isSecureApplicationUrl(config.issuerUrl)) {
    throw new Error("OIDC issuer must use HTTPS");
  }
  if (!isSecureApplicationUrl(config.redirectUri)) {
    throw new Error("OIDC redirect URI must use HTTPS");
  }
  if (!config.clientId || config.allowedGroups.length === 0) {
    throw new Error("OIDC client ID and at least one allowed admin group are required");
  }
  if (config.clientAuthMethod !== "none" && !config.clientSecret) {
    throw new Error("The selected OIDC client authentication method requires a client secret");
  }
}

function fingerprint(config: StoredOidcConfig): string {
  return JSON.stringify({
    enabled: config.enabled,
    issuerUrl: config.issuerUrl,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    allowedGroups: config.allowedGroups,
    groupsClaim: config.groupsClaim,
    scopes: config.scopes,
    clientAuthMethod: config.clientAuthMethod,
  });
}

async function effectiveConfig(): Promise<StoredOidcConfig | undefined> {
  const config = environmentConfig() ?? await readStoredConfig();
  if (!config.enabled) return undefined;
  validateEnabledConfig(config);
  return config;
}

function getClientAuthentication(config: StoredOidcConfig): oidc.ClientAuth {
  if (config.clientAuthMethod === "client_secret_basic") return oidc.ClientSecretBasic(config.clientSecret);
  if (config.clientAuthMethod === "client_secret_post") return oidc.ClientSecretPost(config.clientSecret);
  return oidc.None();
}

async function getConfiguration(config: StoredOidcConfig): Promise<oidc.Configuration> {
  const configFingerprint = fingerprint(config);
  if (cachedConfiguration?.fingerprint !== configFingerprint) {
    const promise = oidc.discovery(
      new URL(config.issuerUrl),
      config.clientId,
      config.clientSecret ? { client_secret: config.clientSecret } : undefined,
      getClientAuthentication(config),
    ).catch((error) => {
      if (cachedConfiguration?.promise === promise) cachedConfiguration = undefined;
      throw error;
    });
    cachedConfiguration = { fingerprint: configFingerprint, promise };
  }
  return cachedConfiguration.promise;
}

function pruneTransactions(now = Date.now()): void {
  for (const [state, transaction] of transactions) {
    if (transaction.expiresAt <= now) transactions.delete(state);
  }
}

function readClaim(claims: Record<string, unknown>, claimPath: string): unknown {
  return claimPath.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, claims);
}

function hasAllowedGroup(claims: Record<string, unknown>, config: StoredOidcConfig): boolean {
  const value = readClaim(claims, config.groupsClaim);
  const groups = Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : typeof value === "string" ? [value] : [];
  return config.allowedGroups.some((allowedGroup) => groups.includes(allowedGroup));
}

export async function getOidcStatus(): Promise<{
  enabled: boolean;
  label?: string;
  passwordLoginDisabled: boolean;
}> {
  try {
    const config = await effectiveConfig();
    return {
      enabled: Boolean(config),
      label: config?.displayName,
      passwordLoginDisabled: Boolean(config?.disablePasswordLogin),
    };
  } catch {
    return { enabled: false, passwordLoginDisabled: false };
  }
}

export async function getAdminOidcConfig(): Promise<OidcAdminConfig> {
  const environment = environmentConfig();
  const config = environment ?? await readStoredConfig();
  return {
    enabled: config.enabled,
    issuerUrl: config.issuerUrl,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    allowedGroups: config.allowedGroups,
    groupsClaim: config.groupsClaim,
    scopes: config.scopes,
    displayName: config.displayName,
    clientAuthMethod: config.clientAuthMethod,
    disablePasswordLogin: config.disablePasswordLogin,
    clientSecretConfigured: Boolean(config.clientSecret),
    lastVerifiedAt: config.lastVerifiedAt,
    managedByEnvironment: Boolean(environment),
  };
}

export async function updateAdminOidcConfig(input: unknown): Promise<OidcAdminConfig> {
  if (environmentConfig()) throw new Error("OIDC configuration is managed by environment variables");
  const parsedInput = adminConfigInputSchema.parse(input);
  const current = await readStoredConfig();
  const next = storedConfigSchema.parse({
    enabled: parsedInput.enabled,
    issuerUrl: parsedInput.issuerUrl.trim(),
    clientId: parsedInput.clientId.trim(),
    clientSecret: parsedInput.clearClientSecret
      ? undefined
      : parsedInput.clientSecret?.trim() || current.clientSecret,
    redirectUri: parsedInput.redirectUri.trim(),
    allowedGroups: parsedInput.allowedGroups.map((group) => group.trim()).filter(Boolean),
    groupsClaim: parsedInput.groupsClaim.trim() || "groups",
    scopes: withOpenIdScope(parsedInput.scopes),
    displayName: parsedInput.displayName.trim() || "Single Sign-on",
    clientAuthMethod: parsedInput.clientAuthMethod,
    disablePasswordLogin: parsedInput.disablePasswordLogin,
    lastVerifiedAt: current.lastVerifiedAt,
  });
  validateEnabledConfig(next);
  if (fingerprint(current) !== fingerprint(next)) next.lastVerifiedAt = undefined;
  if (next.disablePasswordLogin && !next.lastVerifiedAt) {
    throw new Error("Complete a successful SSO test before disabling password login");
  }
  await atomicWriteConfig(next);
  cachedConfiguration = undefined;
  return getAdminOidcConfig();
}

async function markStoredConfigVerified(expectedFingerprint: string): Promise<void> {
  if (environmentConfig()) return;
  const current = await readStoredConfig();
  if (fingerprint(current) !== expectedFingerprint) return;
  current.lastVerifiedAt = new Date().toISOString();
  await atomicWriteConfig(current);
}

export async function createOidcAuthorizationUrl(): Promise<URL> {
  const config = await effectiveConfig();
  if (!config) throw new Error("OIDC is not enabled");
  const configuration = await getConfiguration(config);
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  pruneTransactions();
  if (transactions.size >= MAX_PENDING_TRANSACTIONS) throw new Error("Too many pending OIDC transactions");
  transactions.set(state, {
    codeVerifier,
    nonce,
    settingsFingerprint: fingerprint(config),
    expiresAt: Date.now() + TRANSACTION_TTL_MS,
  });

  return oidc.buildAuthorizationUrl(configuration, {
    redirect_uri: config.redirectUri,
    scope: config.scopes,
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });
}

export async function completeOidcAuthorization(callbackUrl: URL): Promise<OidcIdentity> {
  const state = callbackUrl.searchParams.get("state") ?? "";
  const transaction = transactions.get(state);
  transactions.delete(state);
  if (!transaction || transaction.expiresAt <= Date.now()) {
    throw new Error("OIDC transaction is missing or expired");
  }
  const config = await effectiveConfig();
  if (!config || fingerprint(config) !== transaction.settingsFingerprint) {
    throw new Error("OIDC configuration changed during authentication");
  }

  const configuration = await getConfiguration(config);
  const currentUrl = new URL(config.redirectUri);
  currentUrl.search = callbackUrl.search;
  const tokens = await oidc.authorizationCodeGrant(configuration, currentUrl, {
    pkceCodeVerifier: transaction.codeVerifier,
    expectedState: state,
    expectedNonce: transaction.nonce,
  });
  const claims = tokens.claims() as Record<string, unknown> | undefined;
  if (!claims || typeof claims.sub !== "string") throw new Error("OIDC ID token has no subject");
  if (!hasAllowedGroup(claims, config)) throw new Error("OIDC user is not in an allowed admin group");
  await markStoredConfigVerified(transaction.settingsFingerprint);

  const displayName = typeof claims.name === "string"
    ? claims.name
    : typeof claims.preferred_username === "string"
      ? claims.preferred_username
      : typeof claims.email === "string" ? claims.email : undefined;
  return { subject: claims.sub, displayName };
}
