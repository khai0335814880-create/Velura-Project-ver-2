import { CONFIG } from "./config.js";

const API_BASE_URL = CONFIG.API_BASE_URL;

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const accountApi = {
  hasSession() {
    return Boolean(getAccessToken());
  },

  list(params = {}) {
    return request(`/api/v1/admin/accounts${query(params)}`);
  },

  listRoleRequests(params = {}) {
    return request(`/api/v1/admin/account-role-requests${query(params)}`);
  },

  listAuditLogs(params = {}) {
    return request(`/api/v1/admin/account-audit-logs${query(params)}`);
  },

  lock(userId, payload) {
    return request(`/api/v1/admin/accounts/${encodeURIComponent(userId)}/lock`, { method: "POST", body: payload });
  },

  unlock(userId, payload) {
    return request(`/api/v1/admin/accounts/${encodeURIComponent(userId)}/unlock`, { method: "POST", body: payload });
  },

  changeRole(userId, payload) {
    return request(`/api/v1/admin/accounts/${encodeURIComponent(userId)}/role`, { method: "POST", body: payload });
  },

  reviewRoleRequest(requestId, decision, payload) {
    return request(`/api/v1/admin/account-role-requests/${encodeURIComponent(requestId)}/${decision}`, {
      method: "POST",
      body: payload
    });
  }
};

async function request(path, options = {}) {
  const token = getAccessToken();
  if (!token) throw new ApiError(401, "AUTH_REQUIRED", "Phiên Supabase chưa sẵn sàng");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await parseResponse(response);
  if (!response.ok) {
    const error = payload?.error || {};
    throw new ApiError(response.status, error.code || "API_ERROR", error.message || "Không thể xử lý yêu cầu", error.details);
  }
  return payload;
}

function getAccessToken() {
  const direct = sessionStorage.getItem("velura_supabase_access_token") || localStorage.getItem("velura_supabase_access_token");
  if (direct) return direct;

  for (const storage of [sessionStorage, localStorage]) {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index) || "";
      if (!/^sb-.+-auth-token$/.test(key)) continue;
      try {
        const value = JSON.parse(storage.getItem(key));
        const session = Array.isArray(value) ? value[0] : value;
        if (session?.access_token) return session.access_token;
        if (session?.currentSession?.access_token) return session.currentSession.access_token;
      } catch {
        // Ignore unrelated or stale session entries.
      }
    }
  }
  return "";
}

function query(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export { ApiError };
