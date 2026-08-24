import { timingSafeEqual } from "node:crypto";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const TOKEN_FILE = process.env.UPDATE_TOKEN_FILE ?? "/var/lib/homelab-portal/update-token";
const TOKEN_DIR = path.dirname(TOKEN_FILE);
const ACK_FILE = `${TOKEN_DIR}/update-token-acknowledged`;

export async function readUpdateToken(): Promise<string | undefined> {
  try {
    return (await readFile(TOKEN_FILE, "utf8")).trim() || undefined;
  } catch {
    return process.env.UPDATE_TOKEN || undefined;
  }
}

export async function getPendingUpdateToken(): Promise<string | undefined> {
  const token = await readUpdateToken();
  if (!token) return undefined;
  try {
    await access(ACK_FILE);
    return undefined;
  } catch {
    return token;
  }
}

export async function acknowledgeUpdateToken(candidate: string): Promise<boolean> {
  const token = await readUpdateToken();
  if (!token) return false;
  const expected = Buffer.from(token);
  const actual = Buffer.from(candidate);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  await mkdir(TOKEN_DIR, { recursive: true, mode: 0o700 });
  await writeFile(ACK_FILE, `${new Date().toISOString()}\n`, { mode: 0o600 });
  return true;
}

export async function resetUpdateToken(token: string): Promise<void> {
  await mkdir(TOKEN_DIR, { recursive: true, mode: 0o700 });
  await writeFile(TOKEN_FILE, `${token.trim()}\n`, { mode: 0o600 });
  await unlink(ACK_FILE).catch(() => undefined);
}

export const updateTokenPath = TOKEN_FILE;
export const updateTokenAckPath = ACK_FILE;
