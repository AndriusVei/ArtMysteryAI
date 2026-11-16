import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { AIError } from "./ai-core.ts";

export function canonicalJSON(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJSON((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export const signGeneration = (value: unknown, secret: string) => createHmac("sha256", secret).update("result:" + canonicalJSON(value)).digest("hex");
export function verifyGeneration(value: unknown, signature: unknown, secret: string) {
  return typeof signature === "string" && /^[a-f0-9]{64}$/.test(signature)
    && timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(signGeneration(value, secret), "hex"));
}
export function trustedIPHash(request: Request, secret: string, vercel = process.env.VERCEL === "1"): string {
  const host = new URL(request.url).hostname;
  const ip = vercel ? request.headers.get("x-vercel-forwarded-for")?.trim() : ["localhost", "127.0.0.1"].includes(host) ? "127.0.0.1" : null;
  if (!ip || !isIP(ip)) throw new AIError("not_configured");
  return createHmac("sha256", secret).update("ip:" + ip).digest("hex");
}
