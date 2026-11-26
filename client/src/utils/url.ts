/** Returns the value only if it is an http(s) URL, so javascript: or data: links are never rendered or opened. */
export function safeWebUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}
