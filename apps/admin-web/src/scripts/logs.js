import adminIconsUrl from "../assets/icons/admin-icons.svg?url";
import { auditLogApi } from "./audit-log-api.js";
import { accountApi } from "./account-api.js";

const state = { rows: [], filtered: [], tab: "all", users: [], currentPage: 1, itemsPerPage: 10 };
const panel = document.querySelector("#log-panel");
const overlay = document.querySelector("#log-overlay");

export function escapeAuditHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}
function icon(name) { return `<svg class="admin-line-icon"><use href="${adminIconsUrl}#${escapeAuditHtml(name)}"></use></svg>`; }
function date(value) { if (!value) return "-"; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "-" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(parsed); }
function filters() { return `<form class="admin-filter-bar admin-log-filter" data-log-filter><label class="admin-search-field">${icon("search")}<input class="admin-form-control" name="q" placeholder="Tìm hành động, đối tượng hoặc admin" data-log-search></label><select class="admin-form-control" name="module" data-log-module><option value="">Tất cả phân hệ</option>${["accounts", "products", "orders", "reviews", "returns", "support", "pricing", "promotions", "vouchers", "system"].map((value) => `<option value="${value}">${value}</option>`).join("")}</select><select class="admin-form-control" name="result" data-log-result><option value="">Tất cả kết quả</option><option value="success">Thành công</option><option value="failure">Thất bại</option></select><div class="admin-filter-bar__actions"><button class="admin-btn admin-btn--filter admin-btn--sm">Lọc</button><button class="admin-btn admin-btn--ghost admin-btn--sm" type="reset">Đặt lại</button></div></form>`; }
function table() {
  if (!state.filtered.length) return '<div class="admin-log-empty"><strong>Không có nhật ký phù hợp</strong><p>Dữ liệu được đọc từ audit_log theo RLS.</p></div>';
  
  const totalItems = state.filtered.length;
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  if (state.currentPage < 1) state.currentPage = 1;

  const start = (state.currentPage - 1) * state.itemsPerPage;
  const end = Math.min(start + state.itemsPerPage, totalItems);
  const pagedRows = state.filtered.slice(start, end);

  let paginationButtons = "";
  if (totalPages > 1) {
    paginationButtons += `<button type="button" data-log-page="${state.currentPage - 1}" ${state.currentPage === 1 ? "disabled" : ""}>←</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages > 6) {
        if (i !== 1 && i !== totalPages && Math.abs(state.currentPage - i) > 1) {
          if (i === 2 && state.currentPage > 3) {
            paginationButtons += `<span class="pagination-ellipsis" style="padding: 0 4px; color: var(--muted);">...</span>`;
          } else if (i === totalPages - 1 && state.currentPage < totalPages - 2) {
            paginationButtons += `<span class="pagination-ellipsis" style="padding: 0 4px; color: var(--muted);">...</span>`;
          }
          continue;
        }
      }
      paginationButtons += `<button type="button" class="${state.currentPage === i ? "is-active" : ""}" data-log-page="${i}">${i}</button>`;
    }
    paginationButtons += `<button type="button" data-log-page="${state.currentPage + 1}" ${state.currentPage === totalPages ? "disabled" : ""}>→</button>`;
  }
  const paginationHtml = totalPages > 1 ? `<nav class="admin-pagination">${paginationButtons}</nav>` : "";

  const rowsHtml = pagedRows.map((row) => {
    const actorUser = state.users?.find((u) => u.user_id === row.actor_id);
    const actorName = actorUser ? `${actorUser.full_name} (${actorUser.email})` : (row.actor_id || "system");
    return `<tr><td>${escapeAuditHtml(date(row.timestamp))}</td><td>${escapeAuditHtml(actorName)}</td><td>${escapeAuditHtml(row.actor_role || "-")}</td><td><span class="admin-log-module">${escapeAuditHtml(row.module)}</span></td><td>${escapeAuditHtml(row.action)}</td><td>${escapeAuditHtml(row.target_id || "-")}</td><td>${escapeAuditHtml(row.ip_address || "-")}</td><td><button class="admin-icon-button admin-icon-button--sm" data-log-detail="${escapeAuditHtml(row.audit_id)}">${icon("eye")}</button></td></tr>`;
  }).join("");

  const showStart = totalItems === 0 ? 0 : start + 1;
  return `<div class="admin-table-wrap"><table class="admin-table admin-log-table"><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Vai trò</th><th>Phân hệ</th><th>Hành động</th><th>Đối tượng</th><th>IP</th><th>Chi tiết</th></tr></thead><tbody>${rowsHtml}</tbody></table></div><div class="admin-log-footer"><p class="admin-table-note">Hiển thị ${showStart} - ${end} / ${totalItems} nhật ký</p>${paginationHtml}</div>`;
}
function render() {
  panel.innerHTML = filters() + table();
  updateKpis();
}

function updateKpis() {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  
  const todayStr = today.toDateString();
  const yesterdayStr = yesterday.toDateString();
  
  const todayRows = state.rows.filter((row) => new Date(row.timestamp).toDateString() === todayStr);
  const yesterdayRows = state.rows.filter((row) => new Date(row.timestamp).toDateString() === yesterdayStr);
  
  const diff = todayRows.length - yesterdayRows.length;
  const trendText = diff >= 0 ? `+${diff} so với hôm qua` : `${diff} so với hôm qua`;
  const trendClass = diff >= 0 ? "admin-kpi-card__trend--up" : "admin-kpi-card__trend--down";
  
  const successCount = state.rows.filter(r => !String(r.action).toLowerCase().includes("fail") && !String(r.action).toLowerCase().includes("error")).length;
  const failureCount = state.rows.filter(r => String(r.action).toLowerCase().includes("fail") || String(r.action).toLowerCase().includes("error")).length;
  const blockedCount = state.rows.filter(r => String(r.action).toLowerCase().includes("block") || String(r.action).toLowerCase().includes("deny") || String(r.action).toLowerCase().includes("refuse")).length;
  const securityCount = state.rows.filter(r => String(r.action).toLowerCase().includes("auth") || String(r.action).toLowerCase().includes("login") || String(r.action).toLowerCase().includes("role") || String(r.action).toLowerCase().includes("permission")).length;

  const values = [todayRows.length, successCount, failureCount, blockedCount, securityCount];
  document.querySelectorAll(".admin-log-kpis .admin-kpi-card__value").forEach((node, index) => {
    node.textContent = String(values[index] || 0);
  });

  // Calculate and update subtext trends in KPIs
  const cards = document.querySelectorAll(".admin-log-kpis .admin-kpi-card");
  if (cards.length >= 5) {
    // Card 1: Today events trend
    const trendNode1 = cards[0].querySelector(".admin-kpi-card__trend");
    if (trendNode1) {
      trendNode1.textContent = trendText;
      trendNode1.className = `admin-kpi-card__trend ${trendClass}`;
    }
    
    // Card 2: Success rate percentage
    const trendNode2 = cards[1].querySelector(".admin-kpi-card__trend");
    if (trendNode2) {
      const total = state.rows.length || 1;
      const successPercent = ((successCount / total) * 100).toFixed(1);
      trendNode2.textContent = `${successPercent}% tổng sự kiện`;
    }
    
    // Card 3: Failure status
    const trendNode3 = cards[2].querySelector(".admin-kpi-card__trend");
    if (trendNode3) {
      trendNode3.textContent = failureCount > 0 ? "Cần kiểm tra ngay" : "Hoạt động ổn định";
      trendNode3.className = `admin-kpi-card__trend ${failureCount > 0 ? "admin-kpi-card__trend--warning" : "admin-kpi-card__trend--up"}`;
    }
    
    // Card 4: Blocked conflicts
    const trendNode4 = cards[3].querySelector(".admin-kpi-card__trend");
    if (trendNode4) {
      const conflictCount = state.rows.filter(r => String(r.action).toLowerCase().includes("conflict") || JSON.stringify(r).toLowerCase().includes("xung đột")).length;
      trendNode4.textContent = `${conflictCount} xung đột dữ liệu`;
      trendNode4.className = `admin-kpi-card__trend ${conflictCount > 0 ? "admin-kpi-card__trend--warning" : "admin-kpi-card__trend--up"}`;
    }
    
    // Card 5: Security severity
    const trendNode5 = cards[4].querySelector(".admin-kpi-card__trend");
    if (trendNode5) {
      const criticalCount = state.rows.filter(r => String(r.action).toLowerCase().includes("critical") || String(r.action).toLowerCase().includes("severe") || String(r.action).toLowerCase().includes("reject") || JSON.stringify(r).toLowerCase().includes("nghiêm trọng")).length;
      trendNode5.textContent = `${criticalCount} nghiêm trọng`;
      trendNode5.className = `admin-kpi-card__trend ${criticalCount > 0 ? "admin-kpi-card__trend--danger" : "admin-kpi-card__trend--up"}`;
    }
  }

  // Calculate and update alert box counts
  const deniedCount = state.rows.filter(r => String(r.action).toLowerCase().includes("deny") || String(r.action).toLowerCase().includes("refuse") || String(r.action).toLowerCase().includes("block")).length;
  const conflict24hCount = state.rows.filter(r => (String(r.action).toLowerCase().includes("conflict") || JSON.stringify(r).toLowerCase().includes("xung đột")) && (new Date() - new Date(r.timestamp) < 24 * 60 * 60 * 1000)).length;
  const emailFailedCount = state.rows.filter(r => String(r.module) === "email" && (String(r.action).toLowerCase().includes("fail") || String(r.action).toLowerCase().includes("error"))).length;

  const deniedBtn = document.querySelector("[data-log-alert-result='denied']");
  if (deniedBtn) {
    deniedBtn.querySelector("span").textContent = `${deniedCount} thao tác bị từ chối do không đủ quyền`;
    deniedBtn.style.display = deniedCount > 0 ? "" : "none";
  }

  const conflictBtn = document.querySelector("[data-log-alert-result='conflict']");
  if (conflictBtn) {
    conflictBtn.querySelector("span").textContent = `${conflict24hCount} xung đột dữ liệu trong 24 giờ`;
    conflictBtn.style.display = conflict24hCount > 0 ? "" : "none";
  }

  const failedBtn = document.querySelector("[data-log-alert-result='failed']");
  if (failedBtn) {
    failedBtn.querySelector("span").textContent = `${emailFailedCount} lỗi gửi email cảnh báo`;
    failedBtn.style.display = emailFailedCount > 0 ? "" : "none";
  }

  // Calculate tab counts
  const allCount = state.rows.length;
  const adminCount = state.rows.filter(r => ["accounts", "products", "orders", "pricing", "promotions", "vouchers", "returns", "reviews", "support"].includes(r.module)).length;
  const systemCount = state.rows.filter(r => r.module === "system" || !r.module).length;
  const aiCount = state.rows.filter(r => r.module === "ai").length;

  const tabCounts = { all: allCount, admin: adminCount, system: systemCount, ai: aiCount };
  document.querySelectorAll("[data-log-tab]").forEach((node) => {
    const tabName = node.dataset.logTab;
    const span = node.querySelector("span");
    if (span) span.textContent = String(tabCounts[tabName] ?? 0);
  });
}

function detail(id) {
  const row = state.rows.find((item) => item.audit_id === id);
  if (!row) return;
  overlay.innerHTML = `<div class="admin-drawer-backdrop" data-log-close></div><aside class="admin-drawer admin-log-drawer"><header class="admin-drawer__header"><div><small>${escapeAuditHtml(row.audit_id)}</small><h2>Chi tiết nhật ký</h2></div><button class="admin-icon-button" data-log-close>×</button></header><div class="admin-drawer__body"><dl class="admin-data-list">${Object.entries(row).map(([key, value]) => {
    let displayValue;
    if (key === "actor_id" && value) {
      const actorUser = state.users?.find(u => u.user_id === value);
      displayValue = actorUser ? `${escapeAuditHtml(actorUser.full_name)} (${escapeAuditHtml(actorUser.email)}) <br/><small style="color:var(--admin-text-muted);">${escapeAuditHtml(value)}</small>` : escapeAuditHtml(value);
    } else if (typeof value === "object" && value !== null) {
      displayValue = `<pre style="margin: 0; font-family: monospace; white-space: pre-wrap; font-size: 12px; background: var(--admin-bg-light); padding: 8px; border-radius: 4px; border: 1px solid var(--admin-border-light);">${escapeAuditHtml(JSON.stringify(value, null, 2))}</pre>`;
    } else {
      displayValue = escapeAuditHtml(value ?? "-");
    }
    return `<div><dt>${escapeAuditHtml(key)}</dt><dd>${displayValue}</dd></div>`;
  }).join("")}</dl></div></aside>`;
}

async function load() {
  panel.innerHTML = '<div class="admin-log-empty"><strong>Đang tải audit_log từ Supabase...</strong></div>';
  try {
    const [logResult, accountResult] = await Promise.allSettled([
      auditLogApi.list({ limit: 1000 }),
      accountApi.list({ limit: 1000 })
    ]);
    
    if (logResult.status === "rejected") {
      throw logResult.reason;
    }
    
    state.rows = logResult.value.rows || [];
    state.users = accountResult.status === "fulfilled" ? (accountResult.value.rows || []) : [];
    applyFilterAndRender();
  } catch (error) {
    panel.innerHTML = `<div class="admin-log-empty"><strong>${escapeAuditHtml(error.message)}</strong></div>`;
  }
}

function applyFilterAndRender(resetPage = false) {
  if (resetPage) state.currentPage = 1;
  let filtered = [...state.rows];
  
  // Apply tab filter
  if (state.tab === "admin") {
    filtered = filtered.filter(r => ["accounts", "products", "orders", "pricing", "promotions", "vouchers", "returns", "reviews", "support"].includes(r.module));
  } else if (state.tab === "system") {
    filtered = filtered.filter(r => r.module === "system" || !r.module);
  } else if (state.tab === "ai") {
    filtered = filtered.filter(r => r.module === "ai");
  }

  // Apply form filter (q, module, result)
  const form = document.querySelector("[data-log-filter]");
  if (form) {
    const data = new FormData(form);
    const q = String(data.get("q") || "").toLowerCase();
    const module = data.get("module");
    const result = data.get("result");

    if (module) {
      filtered = filtered.filter(r => r.module === module);
    }
    if (result) {
      if (result === "success") {
        filtered = filtered.filter(r => !String(r.action).toLowerCase().includes("fail") && !String(r.action).toLowerCase().includes("error"));
      } else if (result === "failure") {
        filtered = filtered.filter(r => String(r.action).toLowerCase().includes("fail") || String(r.action).toLowerCase().includes("error"));
      }
    }
    if (q) {
      filtered = filtered.filter(r => JSON.stringify(r).toLowerCase().includes(q));
    }
  }

  state.filtered = filtered;
  render();
}

document.addEventListener("click", (event) => {
  const detailButton = event.target.closest("[data-log-detail]");
  if (detailButton) detail(detailButton.dataset.logDetail);
  
  if (event.target.closest("[data-log-close]")) overlay.innerHTML = "";
  if (event.target.closest("[data-log-refresh]")) load();

  const pageBtn = event.target.closest("[data-log-page]");
  if (pageBtn) {
    const page = Number(pageBtn.dataset.logPage);
    if (!Number.isNaN(page) && page > 0) {
      state.currentPage = page;
      render();
    }
    return;
  }
  
  const tab = event.target.closest("[data-log-tab]");
  if (tab) {
    document.querySelectorAll("[data-log-tab]").forEach((node) => node.classList.toggle("admin-tab--active", node === tab));
    state.tab = tab.dataset.logTab;
    applyFilterAndRender(true);
  }

  const alertBtn = event.target.closest("[data-log-alert-result]");
  if (alertBtn) {
    const type = alertBtn.dataset.logAlertResult;
    const form = document.querySelector("[data-log-filter]");
    if (form) {
      form.reset();
      const qInput = form.querySelector("[name='q']");
      if (type === "denied") {
        qInput.value = "deny";
      } else if (type === "conflict") {
        qInput.value = "conflict";
      } else if (type === "failed") {
        qInput.value = "fail";
      }
      applyFilterAndRender(true);
    }
  }
  
  if (event.target.closest("[data-log-export]")) {
    const blob = new Blob([JSON.stringify(state.filtered, null, 2)], { type: "application/json" });
    const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "velura-audit-log.json" });
    link.click();
    URL.revokeObjectURL(link.href);
  }
});

document.addEventListener("submit", (event) => {
  if (!event.target.matches("[data-log-filter]")) return;
  event.preventDefault();
  applyFilterAndRender(true);
});

document.addEventListener("reset", (event) => {
  if (event.target.matches("[data-log-filter]")) {
    setTimeout(() => {
      applyFilterAndRender(true);
    });
  }
});

load();
