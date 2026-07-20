import { clearAuthSession, isTokenExpired } from "./auth-session.js";
import { CONFIG } from "../config.js";

// Velura Frontend API Client Module

const API_URL = CONFIG.API_BASE_URL;


/**
 * Check if there is any valid session (real JWT or dev-mock).
 * Used by UI components to determine login state without making API calls.
 */
export function isSessionValid() {
  const token = localStorage.getItem("velura_token");
  if (token) {
    if (isTokenExpired(token)) {
      clearAuthSession();
      return false;
    }
    return true;
  }
  const rawUser = localStorage.getItem("velura_user");
  if (rawUser) {
    try {
      const user = JSON.parse(rawUser);
      return !!user.is_dev_mock;
    } catch { return false; }
  }
  return false;
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("velura_token");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  // Auto-generate or reuse guest session id
  let guestSessionId = localStorage.getItem("velura_guest_session_id");
  if (!guestSessionId) {
    guestSessionId = "gs_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("velura_guest_session_id", guestSessionId);
  }

  if (guestSessionId) {
    headers["X-Guest-Session-ID"] = guestSessionId;
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let fetchOptions = { ...options, headers };
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(options.body);
  } else if (options.body && typeof options.body === "string") {
    // If it's already a string, keep it as is
    fetchOptions.body = options.body;
  }

  try {
    const response = await fetch(`${API_URL}${path}`, fetchOptions);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        const currentPath = window.location.pathname;
        const isSafeAccountPage =
          currentPath.includes("profile.html") ||
          currentPath.includes("track-order.html");

        // Never clear the persisted login session from this generic API helper.
        // A 401 can happen while optional widgets load (wishlist, cart, AI, etc.).
        // Only explicit logout should remove velura_token/velura_user.
        if (
          currentPath.includes("/pages/account/") &&
          !isSafeAccountPage
        ) {
          window.location.href = "/src/pages/auth/signin.html";
        }
      }

      const error = new Error(data.error?.message || data.message || `Lỗi API (${response.status})`);
      error.status = response.status;
      error.code = data.error?.code || data.code || "API_ERROR";
      error.details = data.error?.details || data.details;
      error.requestId = data.error?.requestId || response.headers.get("x-request-id") || "";
      throw error;
    }
    return data;
  } catch (error) {
    if (!(error.status)) {
      // Network error (fetch itself failed) — do NOT touch auth session.
      // This prevents wiping the session when the API server is temporarily down.
      console.error(`[API ERROR] ${path}:`, error);
      throw error;
    }
    console.error(`[API ERROR] ${path}:`, error);
    throw error;
  }
}
