import adminIconsUrl from "../assets/icons/admin-icons.svg?url";
import { accountApi } from "./account-api.js";

const state = {
  accounts: [],
  requests: [],
  logs: [],
  tab: "all",
  filtered: [],
  currentPage: 1,
  itemsPerPage: 10,
  logsPage: 1
};

const panel = document.querySelector("#panel");
const overlay = document.querySelector("#overlay");

const roles = [
  "admin_viewer",
  "admin_operator_sanpham",
  "admin_operator_donhang",
  "admin_operator_cskh_dt",
  "admin_operator_gia_km",
  "admin_operator_danhgia_review",
  "super_admin"
];

const roleLabels = {
  admin_viewer: "Admin xem dữ liệu",
  admin_operator_sanpham: "Admin sản phẩm",
  admin_operator_donhang: "Admin đơn hàng",
  admin_operator_cskh_dt: "Admin CSKH đổi trả",
  admin_operator_gia_km: "Admin giá và khuyến mãi",
  admin_operator_danhgia_review: "Admin đánh giá",
  super_admin: "Super admin"
};

export function countWords(value) {
  const text = String(value || "").trim();
  return text ? text.split(/\s+/u).filter(Boolean).length : 0;
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[char]);
}

function icon(name) {
  return `<svg class="admin-line-icon"><use href="${adminIconsUrl}#${escapeHtml(name)}"></use></svg>`;
}

function initials(row) {
  return String(row.full_name || row.email || row.phone || "KH").trim().slice(0, 2).toUpperCase();
}

function date(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "-"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(parsed);
}

function isRecent(value, days = 30) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return Date.now() - parsed.getTime() <= days * 24 * 60 * 60 * 1000;
}

function status(row) {
  if (row.is_active) return "active";
  return row.lock_type === "permanent" ? "locked_perm" : "locked_temp";
}

function badge(value) {
  const text = {
    active: "Đang hoạt động",
    locked_temp: "Khóa tạm thời",
    locked_perm: "Khóa vĩnh viễn",
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối",
    expired: "Hết hạn",
    verified: "Đã xác thực",
    unverified: "Chưa xác thực",
    member: "Thành viên",
    admin: "Quản trị"
  }[value] || value;
  const tone = {
    active: "success",
    approved: "success",
    verified: "success",
    member: "success",
    pending: "pending",
    unverified: "pending",
    admin: "neutral",
    locked_temp: "danger",
    locked_perm: "danger",
    rejected: "danger",
    expired: "danger"
  }[value] || "neutral";
  return `<span class="admin-badge admin-badge--${tone}">${escapeHtml(text)}</span>`;
}

function accountGroup(row) {
  return row.role === "admin" ? "admins" : "members";
}

function accountRoleText(row) {
  if (row.role !== "admin") return "Member";
  return roleLabels[row.admin_role] || row.admin_role || "Admin";
}

function getTabRows() {
  let rows = [...state.filtered];
  if (state.tab === "members") rows = rows.filter((row) => accountGroup(row) === "members");
  if (state.tab === "admins") rows = rows.filter((row) => accountGroup(row) === "admins");
  if (state.tab === "locked") rows = rows.filter((row) => !row.is_active);
  return rows;
}

function renderPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (totalPages <= 1) return "";

  let buttons = "";
  buttons += `<button type="button" data-account-page="${state.currentPage - 1}" ${state.currentPage === 1 ? "disabled" : ""} aria-label="Trang trước">&lt;</button>`;

  for (let page = 1; page <= totalPages; page += 1) {
    if (totalPages > 6 && page !== 1 && page !== totalPages && Math.abs(state.currentPage - page) > 1) {
      if (page === 2 && state.currentPage > 3) buttons += `<span class="pagination-ellipsis">...</span>`;
      if (page === totalPages - 1 && state.currentPage < totalPages - 2) buttons += `<span class="pagination-ellipsis">...</span>`;
      continue;
    }
    buttons += `<button type="button" class="${state.currentPage === page ? "is-active" : ""}" data-account-page="${page}">${page}</button>`;
  }

  buttons += `<button type="button" data-account-page="${state.currentPage + 1}" ${state.currentPage === totalPages ? "disabled" : ""} aria-label="Trang sau">&gt;</button>`;
  return `<nav class="admin-pagination">${buttons}</nav>`;
}

function updateKpis() {
  const memberCount = state.accounts.filter((row) => accountGroup(row) === "members").length;
  const activeCount = state.accounts.filter((row) => row.is_active).length;
  const lockedCount = state.accounts.filter((row) => !row.is_active).length;
  const pendingCount = state.requests.filter((row) => row.status === "pending").length;
  const values = [state.accounts.length, memberCount, activeCount, lockedCount, pendingCount];

  document.querySelectorAll(".admin-kpi-grid--accounts .admin-kpi-card__value").forEach((node, index) => {
    node.textContent = String(values[index] || 0);
  });

  document.querySelectorAll("[data-tab] span").forEach((node) => {
    const tab = node.parentElement.dataset.tab;
    const count = {
      all: state.accounts.length,
      members: memberCount,
      admins: state.accounts.filter((row) => accountGroup(row) === "admins").length,
      locked: lockedCount,
      promotions: pendingCount,
      logs: state.logs.length
    }[tab] || 0;
    node.textContent = String(count);
  });
}

function filterBar() {
  return `
    <form class="admin-filter-bar admin-order-filter-bar" data-account-filter>
      <label class="admin-search-field">
        ${icon("search")}
        <input class="admin-form-control" name="q" placeholder="Tìm tên, email hoặc số điện thoại">
      </label>
      <select class="admin-form-control" name="role" aria-label="Lọc loại tài khoản">
        <option value="">Tất cả loại tài khoản</option>
        <option value="member">Thành viên</option>
        <option value="admin">Quản trị viên</option>
      </select>
      <select class="admin-form-control" name="status" aria-label="Lọc trạng thái">
        <option value="">Tất cả trạng thái</option>
        <option value="active">Đang hoạt động</option>
        <option value="locked">Bị khóa</option>
      </select>
      <div class="admin-filter-bar__actions">
        <button class="admin-btn admin-btn--filter admin-btn--sm">Lọc</button>
        <button class="admin-btn admin-btn--ghost admin-btn--sm" type="reset">Đặt lại</button>
      </div>
    </form>
  `;
}

function memberSummary() {
  const rows = state.filtered.filter((row) => accountGroup(row) === "members");
  const active = rows.filter((row) => row.is_active).length;
  const recent = rows.filter((row) => isRecent(row.created_at, 30)).length;
  return `
    <section class="admin-member-summary" aria-label="Tổng quan tài khoản member">
      <article>
        <span>Tổng member</span>
        <strong>${rows.length}</strong>
      </article>
      <article>
        <span>Đang hoạt động</span>
        <strong>${active}</strong>
      </article>
      <article>
        <span>Mới 30 ngày</span>
        <strong>${recent}</strong>
      </article>
    </section>
  `;
}

function memberCommandCenter() {
  const members = state.accounts.filter((row) => accountGroup(row) === "members");
  const admins = state.accounts.filter((row) => accountGroup(row) === "admins");
  const activeMembers = members.filter((row) => row.is_active).length;
  const lockedMembers = members.filter((row) => !row.is_active).length;
  const pendingRequests = state.requests.filter((row) => row.status === "pending").length;

  return `
    <section class="admin-member-command" aria-label="Trung tâm quản lý thành viên">
      <div class="admin-member-command__copy">
        <span class="admin-member-command__eyebrow">Trung tâm member</span>
        <h2>Quản lý tài khoản member</h2>
        <p>Theo dõi trạng thái khóa và phân quyền từ cùng một màn hình để chăm sóc khách hàng nhanh hơn.</p>
      </div>
      <div class="admin-member-command__metrics">
        <article>
          <span>Member hoạt động</span>
          <strong>${activeMembers}</strong>
          <small>${members.length} tổng member</small>
        </article>
        <article>
          <span>Cần chú ý</span>
          <strong>${lockedMembers + pendingRequests}</strong>
          <small>${lockedMembers} khóa, ${pendingRequests} chờ duyệt</small>
        </article>
      </div>
      <div class="admin-member-command__chips" aria-label="Tổng quan nhóm tài khoản">
        <span>${members.length} member</span>
        <span>${admins.length} quản trị viên</span>
        <span>${pendingRequests} yêu cầu nâng quyền</span>
      </div>
    </section>
  `;
}

function accountTable() {
  const rows = getTabRows();
  const totalPages = Math.ceil(rows.length / state.itemsPerPage) || 1;
  state.currentPage = Math.min(Math.max(state.currentPage, 1), totalPages);

  const start = (state.currentPage - 1) * state.itemsPerPage;
  const pagedRows = rows.slice(start, start + state.itemsPerPage);

  if (!pagedRows.length) {
    return `
      <div class="admin-empty-state">
        <strong>Không có tài khoản phù hợp</strong>
        <p>Dữ liệu được tải trực tiếp từ Supabase.</p>
      </div>
    `;
  }

  return `
    <div class="admin-table-wrap">
      <table class="admin-table admin-data-table admin-member-table">
        <thead>
          <tr>
            <th>Tài khoản</th>
            <th>Nhóm</th>
            <th>Trạng thái</th>
            <th>Đăng nhập gần nhất</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${pagedRows.map((row) => `
            <tr>
              <td>
                <div class="admin-person">
                  <span class="admin-avatar">${escapeHtml(initials(row))}</span>
                  <span>
                    <strong>${escapeHtml(row.full_name || "Chưa cập nhật")}</strong>
                    <small>${escapeHtml(row.email || row.phone || "-")}</small>
                  </span>
                </div>
              </td>
              <td>
                ${badge(row.role === "admin" ? "admin" : "member")}
                <small class="admin-member-role">${escapeHtml(accountRoleText(row))}</small>
              </td>
              <td>${badge(status(row))}</td>
              <td>${escapeHtml(date(row.last_login_at))}</td>
              <td>
                <div class="admin-table-actions">
                  <button class="admin-icon-button admin-icon-button--sm" data-account-detail="${escapeHtml(row.user_id)}" title="Xem chi tiết">${icon("eye")}</button>
                  <button class="admin-icon-button admin-icon-button--sm" data-account-action="${row.is_active ? "lock" : "unlock"}:${escapeHtml(row.user_id)}" title="${row.is_active ? "Khóa" : "Mở khóa"} tài khoản">${icon(row.is_active ? "lock" : "unlock")}</button>
                  <button class="admin-icon-button admin-icon-button--sm" data-account-action="role:${escapeHtml(row.user_id)}" title="Thay đổi vai trò">${icon("edit")}</button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function requestTable() {
  if (!state.requests.length) return '<div class="admin-empty-state"><strong>Không có yêu cầu nâng quyền</strong></div>';
  return `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Yêu cầu</th>
            <th>Tài khoản</th>
            <th>Vai trò</th>
            <th>Hết hạn</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${state.requests.map((row) => `
            <tr>
              <td>${escapeHtml(row.request_id)}</td>
              <td>${escapeHtml(row.target_user_id)}</td>
              <td>${escapeHtml(row.requested_role)}</td>
              <td>${date(row.expires_at)}</td>
              <td>${badge(row.status)}</td>
              <td>
                <div class="admin-table-actions">
                  ${row.status === "pending"
                    ? `<button class="admin-btn admin-btn--secondary admin-btn--sm" data-request="approve:${escapeHtml(row.request_id)}">Duyệt</button>
                       <button class="admin-btn admin-btn--danger admin-btn--sm" data-request="reject:${escapeHtml(row.request_id)}">Từ chối</button>`
                    : "-"
                  }
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderLogsPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (totalPages <= 1) return "";

  let buttons = "";
  buttons += `<button type="button" data-account-logs-page="${state.logsPage - 1}" ${state.logsPage === 1 ? "disabled" : ""} aria-label="Trang trước">&lt;</button>`;

  for (let page = 1; page <= totalPages; page += 1) {
    if (totalPages > 6 && page !== 1 && page !== totalPages && Math.abs(state.logsPage - page) > 1) {
      if (page === 2 && state.logsPage > 3) buttons += `<span class="pagination-ellipsis">...</span>`;
      if (page === totalPages - 1 && state.logsPage < totalPages - 2) buttons += `<span class="pagination-ellipsis">...</span>`;
      continue;
    }
    buttons += `<button type="button" class="${state.logsPage === page ? "is-active" : ""}" data-account-logs-page="${page}">${page}</button>`;
  }

  buttons += `<button type="button" data-account-logs-page="${state.logsPage + 1}" ${state.logsPage === totalPages ? "disabled" : ""} aria-label="Trang sau">&gt;</button>`;
  return `<nav class="admin-pagination">${buttons}</nav>`;
}

function logTable() {
  if (!state.logs.length) return '<div class="admin-empty-state"><strong>Chưa có nhật ký tài khoản</strong></div>';

  const totalItems = state.logs.length;
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (state.logsPage > totalPages) state.logsPage = totalPages;
  if (state.logsPage < 1) state.logsPage = 1;

  const start = (state.logsPage - 1) * state.itemsPerPage;
  const pagedLogs = state.logs.slice(start, start + state.itemsPerPage);

  const tableRows = pagedLogs.map((row) => `
    <tr>
      <td>${date(row.timestamp)}</td>
      <td>${escapeHtml(row.actor_id || "system")}</td>
      <td>${escapeHtml(row.action)}</td>
      <td>${escapeHtml(row.target_id)}</td>
      <td><div class="admin-log-json">${escapeHtml(JSON.stringify(row.old_value || {}))}</div></td>
      <td><div class="admin-log-json">${escapeHtml(JSON.stringify(row.new_value || {}))}</div></td>
    </tr>
  `).join("");

  const end = Math.min(start + state.itemsPerPage, totalItems);
  const showStart = totalItems === 0 ? 0 : start + 1;

  return `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Người thực hiện</th>
            <th>Hành động</th>
            <th>Đối tượng</th>
            <th>Dữ liệu cũ</th>
            <th>Dữ liệu mới</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
    <div class="admin-card__footer" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
      <p class="admin-table-note">Hiển thị ${showStart} - ${end} / ${totalItems} nhật ký</p>
      ${renderLogsPagination(totalItems)}
    </div>
  `;
}

function skeletalTable() {
  return `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Tài khoản</th>
            <th>Nhóm</th>
            <th>Xác thực</th>
            <th>Trạng thái</th>
            <th>Đăng nhập gần nhất</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${Array(5).fill(0).map(() => `
            <tr class="admin-table-row-skeleton">
              <td>
                <div class="admin-person-skeleton">
                  <div class="admin-avatar-skeleton skeleton-pulse"></div>
                  <div class="admin-person-copy-skeleton">
                    <div class="skeleton-line skeleton-line--name skeleton-pulse"></div>
                    <div class="skeleton-line skeleton-line--email skeleton-pulse"></div>
                  </div>
                </div>
              </td>
              <td><div class="skeleton-line skeleton-line--role skeleton-pulse"></div></td>
              <td><div class="skeleton-line skeleton-line--badge skeleton-pulse"></div></td>
              <td><div class="skeleton-line skeleton-line--badge skeleton-pulse"></div></td>
              <td><div class="skeleton-line skeleton-line--date skeleton-pulse"></div></td>
              <td>
                <div class="admin-actions-skeleton">
                  <div class="admin-btn-skeleton skeleton-pulse"></div>
                  <div class="admin-btn-skeleton skeleton-pulse"></div>
                  <div class="admin-btn-skeleton skeleton-pulse"></div>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function render() {
  if (!panel) return;
  if (state.tab === "promotions") {
    panel.innerHTML = requestTable();
    updateKpis();
    return;
  }
  if (state.tab === "logs") {
    panel.innerHTML = logTable();
    updateKpis();
    return;
  }

  const rows = getTabRows();
  const totalItems = rows.length;
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const end = Math.min(start + state.itemsPerPage, totalItems);
  const showStart = totalItems === 0 ? 0 : start + 1;
  const shouldShowMemberSummary = state.tab === "all" || state.tab === "members";

  panel.innerHTML = `
    ${filterBar()}
    ${accountTable()}
    <div class="admin-card__footer">
      <p class="admin-table-note">Hiển thị ${showStart} - ${end} / ${totalItems} tài khoản</p>
      ${renderPagination(totalItems)}
    </div>
  `;
  updateKpis();
}

function dataRow(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "-")}</dd></div>`;
}

function detail(id) {
  const row = state.accounts.find((item) => item.user_id === id);
  if (!row) return;
  overlay.innerHTML = `
    <div class="admin-drawer-backdrop" data-account-close></div>
    <aside class="admin-drawer admin-drawer--wide admin-member-drawer">
      <header class="admin-drawer__header">
        <div class="admin-member-profile">
          <span class="admin-avatar admin-avatar--lg">${escapeHtml(initials(row))}</span>
          <div>
            <p class="admin-product-code">${escapeHtml(row.user_id)}</p>
            <h2>${escapeHtml(row.full_name || row.email || "Tài khoản member")}</h2>
            <div class="admin-status-group">
              ${badge(row.role === "admin" ? "admin" : "member")}
              ${badge(row.is_verified ? "verified" : "unverified")}
              ${badge(status(row))}
            </div>
          </div>
        </div>
        <button class="admin-icon-button" data-account-close aria-label="Đóng">×</button>
      </header>
      <div class="admin-drawer__body">
        <section class="admin-member-stats">
          <article><span>Nhóm</span><strong>${escapeHtml(accountRoleText(row))}</strong></article>
          <article><span>Tạo lúc</span><strong>${escapeHtml(date(row.created_at))}</strong></article>
          <article><span>Đăng nhập cuối</span><strong>${escapeHtml(date(row.last_login_at))}</strong></article>
        </section>

        <h3 class="admin-drawer__section">Thông tin liên hệ</h3>
        <dl class="admin-data-list">
          ${dataRow("Họ tên", row.full_name)}
          ${dataRow("Email", row.email)}
          ${dataRow("Số điện thoại", row.phone)}
          ${dataRow("Ngày sinh", row.date_of_birth)}
          ${dataRow("Giới tính", row.gender)}
        </dl>

        <h3 class="admin-drawer__section">Bảo mật và trạng thái</h3>
        <dl class="admin-data-list">
          ${dataRow("Vai trò tài khoản", row.role)}
          ${dataRow("Vai trò quản trị", row.admin_role || "member")}
          ${dataRow("Trạng thái", row.is_active ? "Đang hoạt động" : "Bị khóa")}
          ${dataRow("Loại khóa", row.lock_type)}
          ${dataRow("Lý do khóa", row.lock_reason)}
          ${dataRow("Mở khóa gần nhất", row.unlock_reason)}
          ${dataRow("Phiên bản dữ liệu", row.version)}
        </dl>
      </div>
    </aside>
  `;
}

function updateLockTypeFields(form) {
  const lockType = form.elements.lockType.value;
  let expiryGroup = form.querySelector("#lock-until-group");
  if (lockType === "temporary") {
    if (!expiryGroup) {
      const group = document.createElement("div");
      group.className = "admin-form-group";
      group.id = "lock-until-group";
      group.innerHTML = `
        <span class="admin-form-label">Thời hạn khóa</span>
        <input type="datetime-local" class="admin-form-control" name="lockedUntil" required>
      `;
      form.elements.lockType.closest(".admin-form-group").after(group);
    }
  } else if (expiryGroup) {
    expiryGroup.remove();
  }
}

function accountModal(action, id) {
  const row = state.accounts.find((item) => item.user_id === id);
  if (!row) return;

  let roleFields = "";
  if (action === "role") {
    roleFields = `
      <label class="admin-form-group">
        <span class="admin-form-label">Loại tài khoản</span>
        <select class="admin-form-control" name="role">
          <option value="member">Thành viên</option>
          <option value="admin" ${row.role === "admin" ? "selected" : ""}>Quản trị viên</option>
        </select>
      </label>
      <label class="admin-form-group" id="admin-role-group" ${row.role !== "admin" ? "hidden" : ""}>
        <span class="admin-form-label">Vai trò quản trị</span>
        <select class="admin-form-control" name="adminRole">
          <option value="">Không có</option>
          ${roles.map((role) => `<option value="${role}" ${row.admin_role === role ? "selected" : ""}>${escapeHtml(roleLabels[role] || role)}</option>`).join("")}
        </select>
      </label>
    `;
  } else if (action === "lock") {
    roleFields = `
      <label class="admin-form-group">
        <span class="admin-form-label">Loại khóa</span>
        <select class="admin-form-control" name="lockType">
          <option value="temporary">Tạm thời</option>
          <option value="permanent">Vĩnh viễn</option>
        </select>
      </label>
      <div class="admin-form-group" id="lock-until-group">
        <span class="admin-form-label">Thời hạn khóa</span>
        <input type="datetime-local" class="admin-form-control" name="lockedUntil" required>
      </div>
    `;
  }

  const reasonField = action !== "role"
    ? `
      <label class="admin-form-group">
        <span class="admin-form-label">Lý do, tối thiểu 11 từ</span>
        <textarea class="admin-form-control admin-form-textarea" name="reason" placeholder="Nhập lý do chi tiết để khóa hoặc mở khóa tài khoản..." required></textarea>
        <span class="admin-form-helper" data-word-counter>Số từ: 0 / tối thiểu 11 từ</span>
      </label>
    `
    : "";

  overlay.innerHTML = `
    <div class="admin-modal-overlay">
      <section class="admin-modal">
        <form data-account-form data-action="${action}" data-id="${escapeHtml(id)}">
          <header class="admin-modal__header">
            <h2>${action === "role" ? "Thay đổi vai trò" : action === "lock" ? "Khóa tài khoản" : "Mở khóa tài khoản"}</h2>
            <button class="admin-icon-button" type="button" data-account-close aria-label="Đóng">×</button>
          </header>
          <div class="admin-modal__body">
            ${roleFields}
            ${reasonField}
            <div class="admin-form-error" data-error-field hidden></div>
          </div>
          <footer class="admin-modal__footer">
            <button class="admin-btn admin-btn--ghost" type="button" data-account-close>Hủy</button>
            <button class="admin-btn admin-btn--secondary">Xác nhận</button>
          </footer>
        </form>
      </section>
    </div>
  `;
}

function requestModal(decision, id) {
  const row = state.requests.find((item) => item.request_id === id);
  if (!row) return;

  const noteLabel = decision === "reject" ? "Lý do từ chối, tối thiểu 11 từ" : "Ghi chú phê duyệt";
  const notePlaceholder = decision === "reject" ? "Nhập lý do từ chối cụ thể..." : "Nhập ghi chú hoặc hướng dẫn...";
  const counterText = decision === "reject" ? '<span class="admin-form-helper" data-word-counter>Số từ: 0 / tối thiểu 11 từ</span>' : "";

  overlay.innerHTML = `
    <div class="admin-modal-overlay">
      <section class="admin-modal">
        <form data-request-form data-decision="${decision}" data-id="${escapeHtml(id)}">
          <header class="admin-modal__header">
            <h2>${decision === "approve" ? "Duyệt" : "Từ chối"} yêu cầu</h2>
            <button class="admin-icon-button" type="button" data-account-close aria-label="Đóng">×</button>
          </header>
          <div class="admin-modal__body">
            <label class="admin-form-group">
              <span class="admin-form-label">${noteLabel}</span>
              <textarea class="admin-form-control admin-form-textarea" name="note" placeholder="${notePlaceholder}" ${decision === "reject" ? "required" : ""}></textarea>
              ${counterText}
            </label>
            <div class="admin-form-error" data-error-field hidden></div>
          </div>
          <footer class="admin-modal__footer">
            <button class="admin-btn admin-btn--ghost" type="button" data-account-close>Hủy</button>
            <button class="admin-btn admin-btn--secondary">Xác nhận</button>
          </footer>
        </form>
      </section>
    </div>
  `;
}

async function load() {
  if (!panel) return;
  panel.innerHTML = skeletalTable();
  try {
    const [accounts, requests, logs] = await Promise.all([
      accountApi.list({ limit: 100 }),
      accountApi.listRoleRequests({ limit: 100 }),
      accountApi.listAuditLogs({ limit: 100 })
    ]);
    state.accounts = accounts.rows || [];
    state.filtered = [...state.accounts];
    state.requests = requests.rows || [];
    state.logs = logs.rows || [];
    render();
  } catch (error) {
    panel.innerHTML = `<div class="admin-empty-state"><strong>${escapeHtml(error.message || "Không thể tải dữ liệu")}</strong></div>`;
  }
}

document.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-tab]");
  if (tab) {
    state.tab = tab.dataset.tab;
    state.currentPage = 1;
    state.logsPage = 1;
    document.querySelectorAll(".admin-tab").forEach((node) => {
      node.classList.toggle("admin-tab--active", node.dataset.tab === state.tab);
    });
    render();
  }

  const logsPageBtn = event.target.closest("[data-account-logs-page]");
  if (logsPageBtn) {
    const page = Number(logsPageBtn.dataset.accountLogsPage);
    if (!Number.isNaN(page) && page > 0) {
      state.logsPage = page;
      render();
    }
    return;
  }

  const pageBtn = event.target.closest("[data-account-page]");
  if (pageBtn) {
    const page = Number(pageBtn.dataset.accountPage);
    if (!Number.isNaN(page) && page > 0) {
      state.currentPage = page;
      render();
    }
    return;
  }

  const detailButton = event.target.closest("[data-account-detail]");
  if (detailButton) detail(detailButton.dataset.accountDetail);

  const actionButton = event.target.closest("[data-account-action]");
  if (actionButton) accountModal(...actionButton.dataset.accountAction.split(":"));

  const requestButton = event.target.closest("[data-request]");
  if (requestButton) requestModal(...requestButton.dataset.request.split(":"));

  if (event.target.closest("[data-account-close]")) overlay.innerHTML = "";

  if (event.target.closest("[data-export]")) {
    const rows = getTabRows();
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "velura-accounts.json" });
    link.click();
    URL.revokeObjectURL(link.href);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-account-form] select[name='role']")) {
    const form = event.target.closest("form");
    const adminRoleGroup = form.querySelector("#admin-role-group");
    if (adminRoleGroup) adminRoleGroup.hidden = event.target.value !== "admin";
  }
  if (event.target.matches("[data-account-form] select[name='lockType']")) {
    updateLockTypeFields(event.target.closest("form"));
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches(".admin-form-textarea[name='reason']") || event.target.matches(".admin-form-textarea[name='note']")) {
    const form = event.target.closest("form");
    const count = countWords(event.target.value);
    const counter = form.querySelector("[data-word-counter]");
    if (counter) {
      counter.textContent = `Số từ: ${count} / tối thiểu 11 từ`;
      counter.style.color = count > 10 ? "var(--terracotta)" : "var(--error)";
    }
  }
});

document.addEventListener("submit", async (event) => {
  if (event.target.matches("[data-account-filter]")) {
    event.preventDefault();
    const data = new FormData(event.target);
    const q = String(data.get("q") || "").toLowerCase();
    const role = String(data.get("role") || "");
    const filterStatus = String(data.get("status") || "");
    const verified = String(data.get("verified") || "");

    state.filtered = state.accounts.filter((row) =>
      (!role || row.role === role) &&
      (!filterStatus || (filterStatus === "active" ? row.is_active : !row.is_active)) &&
      (!verified || String(Boolean(row.is_verified)) === verified) &&
      (!q || `${row.full_name || ""} ${row.email || ""} ${row.phone || ""}`.toLowerCase().includes(q))
    );
    state.currentPage = 1;
    render();
    return;
  }

  if (event.target.matches("[data-account-form]")) {
    event.preventDefault();
    const form = event.target;
    const row = state.accounts.find((item) => item.user_id === form.dataset.id);
    const errorNode = form.querySelector("[data-error-field]");
    if (errorNode) {
      errorNode.hidden = true;
      errorNode.textContent = "";
    }

    if (form.dataset.action !== "role") {
      const reason = form.elements.reason.value.trim();
      const wordCount = countWords(reason);
      if (wordCount <= 10) {
        if (errorNode) {
          errorNode.textContent = `Lý do quá ngắn, hiện tại ${wordCount} từ, yêu cầu tối thiểu 11 từ.`;
          errorNode.hidden = false;
        }
        return;
      }
    }

    try {
      if (form.dataset.action === "lock") {
        const lockType = form.elements.lockType.value;
        const lockedUntil = lockType === "temporary" ? new Date(form.elements.lockedUntil.value).toISOString() : null;
        await accountApi.lock(row.user_id, {
          lockType,
          reason: form.elements.reason.value.trim(),
          expectedVersion: row.version,
          lockedUntil
        });
      }
      if (form.dataset.action === "unlock") {
        await accountApi.unlock(row.user_id, {
          reason: form.elements.reason.value.trim(),
          expectedVersion: row.version
        });
      }
      if (form.dataset.action === "role") {
        const isTargetAdmin = form.elements.role.value === "admin";
        await accountApi.changeRole(row.user_id, {
          role: form.elements.role.value,
          adminRole: isTargetAdmin ? form.elements.adminRole.value : null,
          expectedVersion: row.version
        });
      }
      overlay.innerHTML = "";
      await load();
    } catch (error) {
      if (errorNode) {
        errorNode.textContent = error.message;
        errorNode.hidden = false;
      } else {
        window.alert(error.message);
      }
    }
    return;
  }

  if (event.target.matches("[data-request-form]")) {
    event.preventDefault();
    const form = event.target;
    const row = state.requests.find((item) => item.request_id === form.dataset.id);
    const errorNode = form.querySelector("[data-error-field]");
    if (errorNode) {
      errorNode.hidden = true;
      errorNode.textContent = "";
    }

    if (form.dataset.decision === "reject") {
      const note = form.elements.note.value.trim();
      const wordCount = countWords(note);
      if (wordCount <= 10) {
        if (errorNode) {
          errorNode.textContent = `Ghi chú từ chối quá ngắn, hiện tại ${wordCount} từ, yêu cầu tối thiểu 11 từ.`;
          errorNode.hidden = false;
        }
        return;
      }
    }

    try {
      await accountApi.reviewRoleRequest(row.request_id, form.dataset.decision, {
        expectedVersion: row.version,
        note: form.elements.note.value.trim()
      });
      overlay.innerHTML = "";
      await load();
    } catch (error) {
      if (errorNode) {
        errorNode.textContent = error.message;
        errorNode.hidden = false;
      } else {
        window.alert(error.message);
      }
    }
  }
});

document.addEventListener("reset", (event) => {
  if (event.target.matches("[data-account-filter]")) {
    setTimeout(() => {
      state.filtered = [...state.accounts];
      state.currentPage = 1;
      render();
    });
  }
});

load();
