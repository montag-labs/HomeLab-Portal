import http from "node:http";
import https from "node:https";

export interface HttpResult { status: number; body: string }

const PROBE_TIMEOUT_MS = 1800;
const MAX_BODY_CHARS = 65536;

/** Only validated numeric destinations are passed by scan workers. Never follows redirects. */
export function probe(
  url: string,
  signal: AbortSignal,
  method = "GET",
  body?: string,
  soapAction?: string,
): Promise<HttpResult | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (result: HttpResult | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(result);
    };
    const client = url.startsWith("https:") ? https : http;
    const headers = body ? { "Content-Type": "text/xml; charset=utf-8", SOAPAction: `"${soapAction}"` } : {};
    const request = client.request(url, { method, signal, headers, rejectUnauthorized: true }, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        text += chunk;
        if (text.length > MAX_BODY_CHARS) {
          finish({ status: response.statusCode ?? 0, body: "" });
          request.destroy();
        }
      });
      response.on("end", () => finish({ status: response.statusCode ?? 0, body: text }));
      response.on("error", () => finish(null));
    });
    const timer = setTimeout(() => {
      finish(null);
      request.destroy();
    }, PROBE_TIMEOUT_MS);
    request.on("error", () => finish(null));
    request.end(body);
  });
}
