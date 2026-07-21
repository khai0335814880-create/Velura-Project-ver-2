import { API_BASE_URL, getAccessToken } from "./supabase-auth.js";

export class ReviewApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ReviewApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const reviewApi = {
  list(params = {}) {
    return request(`/api/v1/admin/reviews${query(params)}`);
  },
  get(reviewId) {
    return request(`/api/v1/admin/reviews/${encodeURIComponent(reviewId)}`);
  },
  unhide(reviewId, body) {
    return request(`/api/v1/admin/reviews/${encodeURIComponent(reviewId)}/unhide`, { method: "POST", body });
  },
  hide(reviewId, body) {
    return request(`/api/v1/admin/reviews/${encodeURIComponent(reviewId)}/hide`, { method: "POST", body });
  },
  reply(reviewId, body) {
    return request(`/api/v1/admin/reviews/${encodeURIComponent(reviewId)}/reply`, { method: "POST", body });
  },
  escalate(reviewId, body) {
    return request(`/api/v1/admin/reviews/${encodeURIComponent(reviewId)}/escalate`, { method: "POST", body });
  },
  auditLogs(params = {}) {
    return request(`/api/v1/admin/reviews/audit-logs${query(params)}`);
  }
};

async function request(path, options = {}) {
  const token = getAccessToken();
  if (!token) throw new ReviewApiError(401, "AUTH_REQUIRED", "Not authenticated");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(options.body !== undefined ? { "content-type": "application/json" } : {})
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = payload?.error || {};
    throw new ReviewApiError(response.status, error.code || "REVIEW_API_ERROR", error.message || "Request failed", error.details);
  }
  return payload;
}

function query(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}
