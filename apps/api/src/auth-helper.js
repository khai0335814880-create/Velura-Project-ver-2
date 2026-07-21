import crypto from "node:crypto";
import { config } from "./config.js";

export const USER_SESSION_TTL_SECONDS = 60 * 60;

function getJwtSecret() {
  if (!config.supabaseServiceRoleKey) {
    throw new Error("VELURA_SUPABASE_SERVICE_ROLE_KEY is required for JWT operations");
  }
  return config.supabaseServiceRoleKey;
}

export function hashPassword(password) {
  if (!password) return "";
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  return hashPassword(password) === hash;
}

export function signJwt(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const sHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const sPayload = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + USER_SESSION_TTL_SECONDS
  })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${sHeader}.${sPayload}`)
    .digest("base64url");
  return `${sHeader}.${sPayload}.${signature}`;
}

export function verifyJwt(token) {
  try {
    const [sHeader, sPayload, signature] = token.split(".");
    const expectedSignature = crypto
      .createHmac("sha256", getJwtSecret())
      .update(`${sHeader}.${sPayload}`)
      .digest("base64url");
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(sPayload, "base64url").toString("utf8"));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
