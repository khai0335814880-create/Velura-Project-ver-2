import { supabaseConfig } from "./supabase-config.js";
import { CONFIG } from "./config.js";

const SUPABASE_URL = supabaseConfig.url;
const SUPABASE_ANON_KEY = supabaseConfig.anonKey;
const API_BASE_URL = CONFIG.API_BASE_URL;

const TOKEN_KEY = "velura_supabase_access_token";
const SESSION_KEY = "velura_current_session";

const ROLE_PAGES = {
  super_admin: ["dashboard", "accounts", "products", "orders", "reviews", "returns-cskh", "pricing", "promotions", "logs"],
  admin_viewer: ["dashboard"],
  admin_operator_sanpham: ["products", "dashboard"],
  admin_operator_donhang: ["orders", "dashboard"],
  admin_operator_gia_km: ["pricing", "dashboard", "promotions"],
  admin_operator_danhgia_review: ["reviews", "dashboard"],
  admin_operator_cskh_dt: ["returns-cskh", "dashboard"],
  member: ["welcome"],
  guest: ["welcome"]
};

const ROLE_LABELS = {
  super_admin: "Admin quản trị",
  admin_viewer: "Admin chỉ xem",
  admin_operator_sanpham: "Admin quản lý sản phẩm",
  admin_operator_donhang: "Admin quản lý đơn hàng",
  admin_operator_gia_km: "Admin quản lý giá & khuyến mãi",
  admin_operator_danhgia_review: "Admin quản lý đánh giá",
  admin_operator_cskh_dt: "Admin quản lý đổi trả & CSKH",
  member: "Thành viên",
  guest: "Khách"
};

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";
}

export function setAccessToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(TOKEN_KEY);
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(SESSION_KEY);
}

export function clearSession() {
  clearAccessToken();
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  for (const storage of [sessionStorage, localStorage]) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith("sb-") && key.endsWith("-auth-token")) storage.removeItem(key);
    }
  }
}

export async function establishAuthoritativeSession(supabaseSession) {
  const token = supabaseSession?.access_token;
  if (!token) throw new Error("Supabase session is missing an access token");
  setAccessToken(token);
  const context = await fetchAuthContext(token);
  const session = buildAppSession(context);
  setSession(session);
  return session;
}

export async function fetchAuthContext(accessToken = getAccessToken()) {
  if (!accessToken) throw new Error("Authentication is required");
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json"
    }
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = null; }
  console.log('[fetchAuthContext] status', response.status, 'body', text.slice(0, 300));
  if (!response.ok) {
    clearSession();
    throw new Error(payload?.error?.message || "Unable to verify the Supabase session");
  }
  return payload;
}

export function buildAppSession(context) {
  const profile = context?.profile;
  const authUser = context?.user || {};
  const roleCode = context?.role || "member";
  const fullName = profile?.full_name || authUser.email?.split("@")[0] || "Velura user";
  const initials = fullName.split(/\s+/).filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
  return {
    id: profile?.user_id || authUser.id,
    authUserId: authUser.id,
    email: profile?.email || authUser.email || "",
    name: fullName,
    phone: profile?.phone || authUser.phone || "",
    role: context?.roleName || ROLE_LABELS[roleCode] || "Thành viên",
    roleCode,
    type: context?.isAdmin ? "admin" : "member",
    adminRole: context?.isAdmin ? roleCode : null,
    avatar: profile?.avatar || initials,
    isActive: profile?.is_active !== false,
    isVerified: profile?.is_verified !== false,
    allowedPages: Array.isArray(context?.allowedPages) ? context.allowedPages : ROLE_PAGES[roleCode] || ROLE_PAGES.member
  };
}

export async function signOut() {
  const token = getAccessToken();
  try {
    if (token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${token}`
        }
      });
    }
  } finally {
    clearSession();
  }
}

export function firstAllowedPage(session) {
  return session?.allowedPages?.[0] || "welcome";
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export { API_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, ROLE_PAGES, ROLE_LABELS };
