import adminIconsUrl from "../assets/icons/admin-icons.svg?url";
import { returnApi } from "./return-api.js";
import { productApi } from "./product-api.js";
import { CONFIG } from "./config.js";
import { computeServiceKpis } from "./service-kpis.js";

const API_BASE = CONFIG.API_BASE_URL;

const state = { 
  returns: [], 
  tickets: [], 
  chatSessions: [],
  logs: [], 
  zone: "chat", 
  selected: null,
  returnsPage: 1,
  ticketsPage: 1,
  logsPage: 1,
  itemsPerPage: 10,
  chat: {
    selectedSessionId: null,
    messages: [],
    products: [],
    loading: false,
    refreshTimer: null
  }
};
const layer = document.querySelector("#service-layer");
const labels = {
  pending: "Chờ xử lý", approved: "Đã duyệt", shipping_back: "Đang gửi về",
  received: "Đã nhận", completed: "Hoàn tất", rejected: "Từ chối",
  open: "Mới", processing: "Đang xử lý", resolved: "Đã giải quyết", closed: "Đã đóng"
};

export function escapeServiceHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);
}

function getEvidenceImageUrl(img) {
  if (!img) return "";
  if (img.startsWith("http://") || img.startsWith("https://")) {
    return img;
  }
  return API_BASE + (img.startsWith("/") ? img : "/" + img);
}

function icon(name) { return `<svg class="admin-line-icon"><use href="${adminIconsUrl}#${escapeServiceHtml(name)}"></use></svg>`; }
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}
function badge(value) { return `<span class="admin-badge admin-badge--${["completed", "resolved", "closed"].includes(value) ? "success" : value === "rejected" ? "danger" : "pending"}">${escapeServiceHtml(labels[value] || value || "-")}</span>`; }
function empty(message) { return `<tr><td colspan="8"><div class="admin-order-empty"><strong>${escapeServiceHtml(message)}</strong></div></td></tr>`; }

const chatStatusMeta = {
  requested: { label: "Chờ tiếp nhận", shortLabel: "Chờ", badgeClass: "admin-badge--pending", tone: "pending" },
  assigned: { label: "Đang xử lý", shortLabel: "Đang xử lý", badgeClass: "admin-badge--success", tone: "assigned" },
  closed: { label: "Đã đóng", shortLabel: "Đã đóng", badgeClass: "admin-badge--neutral", tone: "closed" },
  ai: { label: "AI tự động", shortLabel: "AI", badgeClass: "admin-badge--neutral", tone: "ai" }
};

function getChatStatusMeta(status) {
  return chatStatusMeta[status] || chatStatusMeta.ai;
}

function showToast(message, tone = "info") {
  const toast = document.querySelector("#service-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

function setButtonBusy(button, isBusy, busyText) {
  if (!button) return;
  if (isBusy) {
    button.dataset.originalText = button.dataset.originalText || button.textContent;
    button.textContent = busyText || "Đang xử lý...";
    button.disabled = true;
    return;
  }
  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

function renderPaginationMarkup(totalItems, currentPage, type) {
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (totalPages <= 1) return "";

  let buttons = "";
  buttons += `<button type="button" data-service-page="${currentPage - 1}" data-service-type="${type}" ${currentPage === 1 ? "disabled" : ""}>←</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 6) {
      if (i !== 1 && i !== totalPages && Math.abs(currentPage - i) > 1) {
        if (i === 2 && currentPage > 3) {
          buttons += `<span class="pagination-ellipsis" style="padding: 0 4px; color: var(--muted);">...</span>`;
        } else if (i === totalPages - 1 && currentPage < totalPages - 2) {
          buttons += `<span class="pagination-ellipsis" style="padding: 0 4px; color: var(--muted);">...</span>`;
        }
        continue;
      }
    }
    buttons += `<button type="button" class="${currentPage === i ? "active" : ""}" data-service-page="${i}" data-service-type="${type}">${i}</button>`;
  }

  buttons += `<button type="button" data-service-page="${currentPage + 1}" data-service-type="${type}" ${currentPage === totalPages ? "disabled" : ""}>→</button>`;
  return `<div class="admin-pagination">${buttons}</div>`;
}

function renderReturns(rows = state.returns) {
  const query = (document.querySelector("[data-table-search='returns']")?.value || "").toLowerCase();
  const typeFilter = document.querySelector("#return-type-filter")?.value || "";
  const statusFilter = document.querySelector("#return-status-filter")?.value || "";

  const filtered = rows.filter((row) => {
    if (query) {
      const matchString = JSON.stringify(row).toLowerCase();
      if (!matchString.includes(query)) return false;
    }
    if (typeFilter && row.return_type !== typeFilter) {
      return false;
    }
    if (statusFilter && row.status !== statusFilter) {
      return false;
    }
    // Rule: Hide pending tickets older than 48 hours
    if (row.status === "pending") {
      const ageInHours = (new Date() - new Date(row.created_at)) / (60 * 60 * 1000);
      if (ageInHours > 48) return false;
    }
    return true;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (state.returnsPage > totalPages) state.returnsPage = totalPages;
  if (state.returnsPage < 1) state.returnsPage = 1;

  const start = (state.returnsPage - 1) * state.itemsPerPage;
  const end = Math.min(start + state.itemsPerPage, totalItems);
  const pagedRows = filtered.slice(start, end);

  const body = document.querySelector("#returns-body");
  body.innerHTML = pagedRows.length ? pagedRows.map((row) => {
    const ageInHours = (new Date() - new Date(row.created_at)) / (60 * 60 * 1000);
    const hoursLeft = Math.max(0, 48 - ageInHours);
    let timeText = "";
    if (row.status === "pending") {
      timeText = hoursLeft <= 0 ? "Quá hạn (48h)" : `${Math.floor(hoursLeft)} giờ còn lại`;
    } else {
      timeText = "—";
    }

    return `<tr>
      <td><strong>${escapeServiceHtml(row.return_id)}</strong><small class="admin-order-subtext">${escapeServiceHtml(row.order_id)} · ${escapeServiceHtml(formatDate(row.created_at))}</small></td>
      <td>${escapeServiceHtml(row.return_type === "refund" ? "Trả hàng hoàn tiền" : "Đổi hàng")}</td>
      <td><span class="${row.status === 'pending' && hoursLeft < 6 ? 'admin-text-danger' : ''}">${escapeServiceHtml(timeText)}</span></td>
      <td>${badge(row.status)}</td>
      <td>${escapeServiceHtml(row.description || row.admin_note || "-")}</td>
      <td><div class="admin-table-actions">
        ${["completed", "rejected"].includes(row.status) ? `
          <button class="admin-icon-button admin-icon-button--sm" data-menu data-service-detail="return:${escapeServiceHtml(row.return_id)}" title="Chi tiết">${icon("eye")}</button>
        ` : `
          <button class="admin-icon-button admin-icon-button--sm" data-menu data-service-action="process-return:${escapeServiceHtml(row.return_id)}" title="Xử lý nghiệp vụ">${icon("edit")}</button>
        `}
      </div></td>
    </tr>`;
  }).join("") : empty("Không có yêu cầu đổi trả phù hợp");

  const footer = document.querySelector("#returns-panel .admin-card__footer");
  if (footer) {
    const showStart = totalItems === 0 ? 0 : start + 1;
    footer.innerHTML = `
      <p class="admin-table-note">Hiển thị ${showStart} - ${end} / ${totalItems} phiếu đổi/trả hợp lệ</p>
      ${renderPaginationMarkup(totalItems, state.returnsPage, "returns")}
    `;
  }
}

function renderTickets(rows = state.tickets) {
  const query = (document.querySelector("[data-table-search='support']")?.value || "").toLowerCase();
  const statusFilter = document.querySelector("#ticket-status-filter")?.value || "";
  const priorityFilter = document.querySelector("#ticket-priority-filter")?.value || "";

  const filtered = rows.filter((row) => {
    if (query) {
      const matchString = JSON.stringify(row).toLowerCase();
      if (!matchString.includes(query)) return false;
    }
    if (statusFilter && row.status !== statusFilter) {
      return false;
    }
    if (priorityFilter && row.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (state.ticketsPage > totalPages) state.ticketsPage = totalPages;
  if (state.ticketsPage < 1) state.ticketsPage = 1;

  const start = (state.ticketsPage - 1) * state.itemsPerPage;
  const end = Math.min(start + state.itemsPerPage, totalItems);
  const pagedRows = filtered.slice(start, end);

  const body = document.querySelector("#support-body");
  body.innerHTML = pagedRows.length ? pagedRows.map((row) => `<tr>
    <td><strong>${escapeServiceHtml(row.ticket_id)}</strong><small class="admin-order-subtext">${escapeServiceHtml(formatDate(row.created_at))}</small></td>
    <td>${escapeServiceHtml(row.user_id || row.guest_email || row.guest_phone || "Khách")}</td>
    <td>${escapeServiceHtml(row.title)}</td>
    <td>${escapeServiceHtml(row.description)}</td>
    <td>${badge(row.status)}</td>
    <td><div class="admin-table-actions">
      ${row.status === 'closed' ? `
        <button class="admin-icon-button admin-icon-button--sm" data-menu data-service-detail="ticket:${escapeServiceHtml(row.ticket_id)}" title="Chi tiết">${icon("eye")}</button>
      ` : `
        <button class="admin-icon-button admin-icon-button--sm" data-menu data-service-action="process-ticket:${escapeServiceHtml(row.ticket_id)}" title="Xử lý ticket">${icon("edit")}</button>
      `}
    </div></td>
  </tr>`).join("") : empty("Không có phiếu hỗ trợ phù hợp");

  const footer = document.querySelector("#support-panel .admin-card__footer");
  if (footer) {
    const showStart = totalItems === 0 ? 0 : start + 1;
    footer.innerHTML = `
      <p class="admin-table-note">Hiển thị ${showStart} - ${end} / ${totalItems} phiếu hỗ trợ</p>
      ${renderPaginationMarkup(totalItems, state.ticketsPage, "tickets")}
    `;
  }
}

function detail(type, id) {
  const row = type === "return" ? state.returns.find((item) => item.return_id === id) : state.tickets.find((item) => item.ticket_id === id);
  if (!row) return;
  state.selected = row;

  let bodyContent = "";

  if (type === "return") {
    const ageInHours = (new Date() - new Date(row.created_at)) / (60 * 60 * 1000);
    const hoursLeft = Math.max(0, 48 - ageInHours);
    let timeHtml = "";
    if (row.status === "pending") {
      timeHtml = `
        <div class="admin-note" style="border-left: 4px solid ${hoursLeft < 6 ? 'var(--error)' : 'var(--terracotta)'};">
          <strong>Thời hạn xét duyệt còn lại:</strong> ${Math.floor(hoursLeft)} giờ ${Math.floor((hoursLeft % 1) * 60)} phút (Quy tắc 48h)
        </div>
      `;
    }

    bodyContent = `
      ${timeHtml}
      <div>
        <h3 class="admin-drawer__section">Thông tin đổi trả</h3>
        <dl class="admin-data-list">
          <div><dt>Mã đơn hàng gốc</dt><dd><strong>${escapeServiceHtml(row.order_id)}</strong></dd></div>
          <div><dt>Loại yêu cầu</dt><dd>${escapeServiceHtml(row.return_type === "refund" ? "Trả hàng hoàn tiền" : "Đổi hàng")}</dd></div>
          <div><dt>Trạng thái</dt><dd>${badge(row.status)}</dd></div>
          <div><dt>Khách hàng (User ID)</dt><dd>${escapeServiceHtml(row.user_id)}</dd></div>
          <div><dt>Ngày yêu cầu</dt><dd>${escapeServiceHtml(formatDate(row.created_at))}</dd></div>
          ${row.refund_amount ? `<div><dt>Số tiền hoàn dự kiến</dt><dd>${escapeServiceHtml(Number(row.refund_amount).toLocaleString("vi-VN"))} ₫</dd></div>` : ""}
          ${row.tracking_return_code ? `<div><dt>Mã vận đơn ngược</dt><dd><code>${escapeServiceHtml(row.tracking_return_code)}</code></dd></div>` : ""}
          ${row.exchange_order_id ? `<div><dt>Mã đơn đổi mới</dt><dd><code>${escapeServiceHtml(row.exchange_order_id)}</code></dd></div>` : ""}
        </dl>
      </div>

      <div>
        <h3 class="admin-drawer__section">Lý do yêu cầu</h3>
        <p class="admin-drawer__description-block">
          ${escapeServiceHtml(row.description || "Không có mô tả chi tiết.")}
        </p>
      </div>

      <div>
        <h3 class="admin-drawer__section">Minh chứng từ khách hàng</h3>
        <div class="admin-proof-images admin-proof-images-list">
          ${(row.evidence_images && row.evidence_images.length) ? row.evidence_images.map(img => `
            <a href="${escapeServiceHtml(getEvidenceImageUrl(img))}" target="_blank" title="Xem ảnh lớn">
              <img src="${escapeServiceHtml(getEvidenceImageUrl(img))}" alt="Minh chứng đổi trả" class="admin-proof-img" style="cursor: pointer; max-height: 240px; border-radius: var(--radius-md); border: 1px solid var(--line);">
            </a>
          `).join("") : row.image_proof_url ? `
            <a href="${escapeServiceHtml(getEvidenceImageUrl(row.image_proof_url))}" target="_blank" title="Xem ảnh lớn">
              <img src="${escapeServiceHtml(getEvidenceImageUrl(row.image_proof_url))}" alt="Minh chứng đổi trả" class="admin-proof-img" style="cursor: pointer; max-height: 240px; border-radius: var(--radius-md); border: 1px solid var(--line);">
            </a>
          ` : `
            <div class="admin-proof-empty">
              Không có hình ảnh minh chứng đính kèm
            </div>
          `}
        </div>
      </div>
    `;
  } else {
    bodyContent = `
      <div>
        <h3 class="admin-drawer__section">Thông tin hỗ trợ</h3>
        <dl class="admin-data-list">
          <div><dt>Tiêu đề</dt><dd><strong>${escapeServiceHtml(row.title)}</strong></dd></div>
          <div><dt>Khách hàng</dt><dd>${escapeServiceHtml(row.user_id || row.guest_email || row.guest_phone || "Khách")}</dd></div>
          <div><dt>Độ ưu tiên</dt><dd><span class="admin-badge admin-badge--priority-${row.priority}">${escapeServiceHtml(row.priority === "high" ? "Cao" : row.priority === "normal" ? "Trung bình" : "Thấp")}</span></dd></div>
          <div><dt>Trạng thái</dt><dd>${badge(row.status)}</dd></div>
          <div><dt>Ngày tạo</dt><dd>${escapeServiceHtml(formatDate(row.created_at))}</dd></div>
        </dl>
      </div>

      <div>
        <h3 class="admin-drawer__section">Nội dung yêu cầu</h3>
        <p style="background: var(--field-bg); padding: 12px; border-radius: var(--radius-sm); font-style: italic; color: var(--muted); margin: 0; font-size: 0.8125rem; line-height: 1.5;">
          ${escapeServiceHtml(row.description)}
        </p>
      </div>
    `;
  }

  const drawer = document.querySelector("#service-drawer-container");
  drawer.innerHTML = `
    <div class="admin-drawer-backdrop" data-service-close></div>
    <aside class="admin-drawer">
      <header class="admin-drawer__header">
        <div>
          <h2 class="admin-topbar__title">${type === "return" ? "Chi tiết phiếu đổi trả" : "Chi tiết Ticket hỗ trợ"}</h2>
        </div>
        <button class="admin-icon-button" data-service-close>×</button>
      </header>
      <div class="admin-drawer__body">
        ${bodyContent}
      </div>
    </aside>
  `;
}

function getInfoSection(type, row) {
  if (type === "return") {
    const ageInHours = (new Date() - new Date(row.created_at)) / (60 * 60 * 1000);
    const hoursLeft = Math.max(0, 48 - ageInHours);
    let timeHtml = "";
    if (row.status === "pending") {
      timeHtml = `
        <div class="admin-note" style="border-left: 4px solid ${hoursLeft < 6 ? 'var(--error)' : 'var(--terracotta)'}; margin-bottom: 12px; padding: 10px;">
          <strong>Thời hạn xét duyệt:</strong> ${Math.floor(hoursLeft)} giờ ${Math.floor((hoursLeft % 1) * 60)} phút còn lại (Quy tắc 48h)
        </div>
      `;
    }
    return `
      ${timeHtml}
      <div class="admin-details-card">
        <div class="admin-details-row">
          <span>Đơn hàng gốc:</span>
          <strong>${escapeServiceHtml(row.order_id)}</strong>
        </div>
        <div class="admin-details-row">
          <span>Loại yêu cầu:</span>
          <strong>${escapeServiceHtml(row.return_type === "refund" ? "Trả hàng hoàn tiền" : "Đổi hàng")}</strong>
        </div>
        <div class="admin-details-row">
          <span>Trạng thái hiện tại:</span>
          <strong>${escapeServiceHtml(row.status === "pending" ? "Chờ xử lý" : row.status === "approved" ? "Đã duyệt" : row.status === "shipping_back" ? "Đang vận chuyển ngược" : row.status === "received" ? "Đã nhận hàng hoàn trả" : row.status)}</strong>
        </div>
        <div class="admin-details-row">
          <span>Khách hàng:</span>
          <strong>${escapeServiceHtml(row.user_id)}</strong>
        </div>
        <div class="admin-details-block">
          <span>Lý do yêu cầu:</span>
          <p>${escapeServiceHtml(row.description || "Không có mô tả.")}</p>
        </div>
        ${(row.evidence_images && row.evidence_images.length) ? `
        <div class="admin-details-block">
          <span>Minh chứng:</span>
          <div class="admin-details-evidence-list">
            ${row.evidence_images.map(img => `
              <a href="${escapeServiceHtml(getEvidenceImageUrl(img))}" target="_blank" title="Xem ảnh lớn">
                <img src="${escapeServiceHtml(getEvidenceImageUrl(img))}" class="admin-proof-img-thumb" style="cursor: pointer; max-height: 80px; width: auto; border-radius: var(--radius-sm); border: 1px solid var(--line);">
              </a>
            `).join("")}
          </div>
        </div>` : row.image_proof_url ? `
        <div class="admin-details-block">
          <span>Minh chứng:</span>
          <div class="admin-details-evidence-list">
            <a href="${escapeServiceHtml(getEvidenceImageUrl(row.image_proof_url))}" target="_blank" title="Xem ảnh lớn">
              <img src="${escapeServiceHtml(getEvidenceImageUrl(row.image_proof_url))}" class="admin-proof-img-thumb" style="cursor: pointer; max-height: 80px; width: auto; border-radius: var(--radius-sm); border: 1px solid var(--line);">
            </a>
          </div>
        </div>` : ""}
      </div>
    `;
  } else {
    return `
      <div class="admin-details-card">
        <div class="admin-details-row">
          <span>Tiêu đề:</span>
          <strong>${escapeServiceHtml(row.title)}</strong>
        </div>
        <div class="admin-details-row">
          <span>Khách hàng:</span>
          <strong>${escapeServiceHtml(row.user_id || row.guest_email || row.guest_phone || "Khách")}</strong>
        </div>
        <div class="admin-details-row">
          <span>Độ ưu tiên:</span>
          <span class="admin-badge admin-badge--priority-${row.priority}">${escapeServiceHtml(row.priority === "high" ? "Cao" : row.priority === "normal" ? "Trung bình" : "Thấp")}</span>
        </div>
        <div class="admin-details-row">
          <span>Trạng thái hiện tại:</span>
          <strong>${escapeServiceHtml(row.status === "open" ? "Mở" : row.status === "processing" ? "Đang xử lý" : row.status === "resolved" ? "Đã giải quyết" : row.status)}</strong>
        </div>
        <div class="admin-details-block">
          <span>Nội dung yêu cầu:</span>
          <p>${escapeServiceHtml(row.description)}</p>
        </div>
      </div>
    `;
  }
}

function actionModal(action, id) {
  const isReturn = ["refund", "exchange", "reject", "process-return"].includes(action);
  const row = isReturn ? state.returns.find((item) => item.return_id === id) : state.tickets.find((item) => item.ticket_id === id);
  if (!row) return;

  const infoSection = isReturn ? getInfoSection("return", row) : getInfoSection("ticket", row);
  let bodyContent = "";

  if (action === "process-return") {
    let optionsHtml = "";
    if (row.status === "pending") {
      optionsHtml = `
        <option value="pending-refund">Duyệt trả hàng hoàn tiền</option>
        <option value="pending-exchange">Duyệt đổi hàng</option>
        <option value="reject">Từ chối yêu cầu</option>
      `;
    } else if (row.status === "approved") {
      optionsHtml = `
        <option value="shipping_back">Đang vận chuyển ngược</option>
        <option value="received">Đã nhận hàng hoàn trả</option>
      `;
    } else if (row.status === "shipping_back") {
      optionsHtml = `
        <option value="received">Đã nhận hàng hoàn trả</option>
      `;
    } else if (row.status === "received") {
      optionsHtml = `
        <option value="received-refund">Đạt điều kiện - Trả hàng hoàn tiền</option>
        <option value="received-exchange">Đạt điều kiện - Đổi hàng</option>
        <option value="reject">Không đạt điều kiện - Từ chối</option>
      `;
    }

    bodyContent = `
      <label class="admin-form-group">
        <span class="admin-form-label">Chọn hình thức xử lý</span>
        <select class="admin-form-control" name="returnAction" id="return-action-select" required>
          ${optionsHtml}
        </select>
      </label>
      
      <div id="dynamic-return-inputs"></div>
      
      <label class="admin-form-group">
        <span class="admin-form-label" id="return-note-label">Nội dung xử lý</span>
        <textarea class="admin-form-control admin-form-textarea" name="note" id="return-note-textarea" minlength="10" required></textarea>
      </label>
    `;
  } else if (action === "process-ticket") {
    bodyContent = `
      <label class="admin-form-group">
        <span class="admin-form-label">Chọn tác vụ</span>
        <select class="admin-form-control" name="ticketAction" id="ticket-action-select" required>
          <option value="reply">Phản hồi khách hàng</option>
          <option value="close">Đóng Ticket hỗ trợ</option>
        </select>
      </label>
      
      <label class="admin-form-group">
        <span class="admin-form-label">Nội dung phản hồi / Lý do đóng</span>
        <textarea class="admin-form-control admin-form-textarea" name="note" minlength="10" required></textarea>
      </label>
    `;
  } else {
    // Keep fallback code just in case
    let inputs = "";
    if (action === "refund") {
      inputs += `<label class="admin-form-group"><span class="admin-form-label">Số tiền hoàn</span><input class="admin-form-control" name="amount" type="number" min="1" required></label>`;
    }
    inputs += `<label class="admin-form-group"><span class="admin-form-label">${action === 'reject' ? 'Lý do từ chối chi tiết' : 'Nội dung xử lý'}</span><textarea class="admin-form-control admin-form-textarea" name="note" minlength="10" required></textarea></label>`;
    if (action === "reject") {
      inputs += `
        <label class="admin-form-group">
          <span class="admin-form-label">Ảnh minh chứng từ chối (Bắt buộc)</span>
          <input class="admin-form-control" name="imageProof" type="file" accept="image/*" required>
        </label>
      `;
    }
    bodyContent = inputs;
  }

  layer.innerHTML = `
    <div class="admin-modal-overlay">
      <section class="admin-modal">
        <form data-service-form data-action="${action}" data-id="${escapeServiceHtml(id)}">
          <header class="admin-modal__header">
            <h2>Xử lý phiếu ${escapeServiceHtml(id)}</h2>
            <button class="admin-icon-button" type="button" data-service-close>×</button>
          </header>
          <div class="admin-modal__body" style="max-height: 70vh; overflow-y: auto;">${infoSection}${bodyContent}</div>
          <footer class="admin-modal__footer">
            <button class="admin-btn admin-btn--ghost" type="button" data-service-close>Hủy</button>
            <button class="admin-btn admin-btn--secondary" type="submit">Xác nhận</button>
          </footer>
        </form>
      </section>
    </div>
  `;

  if (action === "process-return") {
    const select = document.getElementById("return-action-select");
    const container = document.getElementById("dynamic-return-inputs");
    const noteLabel = document.getElementById("return-note-label");
    const noteTextarea = document.getElementById("return-note-textarea");

    const updateInputs = () => {
      const val = select.value;
      if (val === "pending-refund" || val === "received-refund") {
        container.innerHTML = `
          <label class="admin-form-group">
            <span class="admin-form-label">Số tiền hoàn (₫)</span>
            <input class="admin-form-control" name="amount" type="number" min="1" value="${row.refund_amount || ''}" required>
          </label>
        `;
        noteLabel.textContent = "Ghi chú xử lý hoàn tiền";
        noteTextarea.placeholder = "Nhập ghi chú hoàn tiền cho kế toán/khách hàng...";
      } else if (val === "pending-exchange" || val === "received-exchange") {
        container.innerHTML = `
          <label class="admin-form-group">
            <span class="admin-form-label">Sản phẩm thay thế <b style="color:var(--error)">*</b></span>
            <select class="admin-form-control" name="replacementProduct" id="replacement-product-select" required>
              <option value="">Đang tải danh sách sản phẩm...</option>
            </select>
          </label>
        `;
        noteLabel.textContent = "Ghi chú xử lý đổi hàng";
        noteTextarea.placeholder = "Nhập ghi chú chi tiết về sản phẩm thay thế và thỏa thuận chênh lệch giá...";

        productApi.list({ limit: 100 }).then((res) => {
          const selectEl = document.getElementById("replacement-product-select");
          if (!selectEl) return;
          const pRows = res.rows || [];
          if (!pRows.length) {
            selectEl.innerHTML = '<option value="">(Không có sản phẩm nào)</option>';
            return;
          }
          selectEl.innerHTML = pRows.map(p => `
            <option value="${escapeServiceHtml(p.product_id)}:${escapeServiceHtml(p.name)}:${escapeServiceHtml(p.sku)}">
              ${escapeServiceHtml(p.name)} (${escapeServiceHtml(p.sku)}) - ${Number(p.sale_price || p.base_price).toLocaleString("vi-VN")} ₫
            </option>
          `).join("");
        }).catch((err) => {
          const selectEl = document.getElementById("replacement-product-select");
          if (selectEl) selectEl.innerHTML = `<option value="">Lỗi tải sản phẩm: ${escapeServiceHtml(err.message)}</option>`;
        });
      } else if (val === "reject") {
        container.innerHTML = `
          <label class="admin-form-group">
            <span class="admin-form-label">Ảnh minh chứng từ chối (Bắt buộc)</span>
            <input class="admin-form-control" name="imageProof" type="file" accept="image/*" required>
          </label>
        `;
        noteLabel.textContent = "Lý do từ chối chi tiết";
        noteTextarea.placeholder = "Nhập lý do chi tiết từ chối yêu cầu đổi trả (bắt buộc tối thiểu 10 ký tự)...";
      } else {
        container.innerHTML = "";
        noteLabel.textContent = "Ghi chú xử lý";
        noteTextarea.placeholder = "Nhập ghi chú chi tiết về trạng thái xử lý...";
      }
    };

    select.addEventListener("change", updateInputs);
    updateInputs();
  }
}

async function submitAction(form) {
  const { action, id } = form.dataset;
  const note = form.elements.note.value.trim();
  const ret = state.returns.find((item) => item.return_id === id);
  const ticket = state.tickets.find((item) => item.ticket_id === id);

  if (action === "process-ticket") {
    const act = form.elements.ticketAction.value;
    if (act === "reply") {
      await returnApi.respondTicket(id, { response: note, expectedVersion: ticket.version });
    } else if (act === "close") {
      await returnApi.closeTicket(id, { reason: note, expectedVersion: ticket.version });
    }
  } else if (action === "process-return") {
    const act = form.elements.returnAction.value;
    if (ret.status === "pending") {
      if (act === "pending-refund") {
        const amount = Number(form.elements.amount.value);
        await returnApi.approveRefund(id, { refundAmount: amount, adminNote: note, expectedVersion: ret.version });
      } else if (act === "pending-exchange") {
        const replacement = form.elements.replacementProduct?.value;
        const finalNote = note + (replacement ? `\n[Sản phẩm thay thế: ${replacement.split(":")[1]} (${replacement.split(":")[2]})]` : "");
        await returnApi.approveExchange(id, { adminNote: finalNote, expectedVersion: ret.version });
      } else if (act === "reject") {
        const fileInput = form.elements.imageProof;
        let proofUrl = "https://placehold.co/600x400/png?text=Evidence";
        if (fileInput?.files?.[0]) {
          const uploadRes = await returnApi.uploadEvidence(fileInput.files[0]);
          proofUrl = uploadRes.url;
        }
        await returnApi.reject(id, { reason: note, imageProof: proofUrl, expectedVersion: ret.version });
      }
    } else {
      // Current status is approved, shipping_back, received
      if (act === "received-refund") {
        const amount = Number(form.elements.amount.value);
        await returnApi.updateStatus(id, { 
          status: "completed", 
          conditionCheckResult: "passed", 
          refundAmount: amount, 
          adminNote: note, 
          expectedVersion: ret.version 
        });
      } else if (act === "received-exchange") {
        const replacement = form.elements.replacementProduct?.value;
        const finalNote = note + (replacement ? `\n[Sản phẩm thay thế: ${replacement.split(":")[1]} (${replacement.split(":")[2]})]` : "");
        await returnApi.updateStatus(id, { 
          status: "completed", 
          conditionCheckResult: "passed", 
          adminNote: finalNote, 
          expectedVersion: ret.version 
        });
      } else if (act === "reject") {
        const fileInput = form.elements.imageProof;
        let proofUrl = "https://placehold.co/600x400/png?text=Evidence";
        if (fileInput?.files?.[0]) {
          const uploadRes = await returnApi.uploadEvidence(fileInput.files[0]);
          proofUrl = uploadRes.url;
        }
        await returnApi.updateStatus(id, { 
          status: "rejected", 
          conditionCheckResult: "major_damage", 
          reason: note, 
          imageProof: proofUrl, 
          expectedVersion: ret.version 
        });
      } else {
        // shipping_back, received
        await returnApi.updateStatus(id, { status: act, adminNote: note, expectedVersion: ret.version });
      }
    }
  } else {
    // Keep fallback code just in case
    if (action === "refund") await returnApi.approveRefund(id, { refundAmount: Number(form.elements.amount.value), adminNote: note, expectedVersion: ret.version });
    if (action === "exchange") {
      const replacement = form.elements.replacementProduct?.value;
      const finalNote = note + (replacement ? `\n[Sản phẩm thay thế: ${replacement.split(":")[1]} (${replacement.split(":")[2]})]` : "");
      await returnApi.approveExchange(id, { adminNote: finalNote, expectedVersion: ret.version });
    }
    if (action === "reject") await returnApi.reject(id, { reason: note, imageProof: form.elements.imageProof?.value || "", expectedVersion: ret.version });
    if (action === "reply") await returnApi.respondTicket(id, { response: note, expectedVersion: ticket.version });
    if (action === "close") await returnApi.closeTicket(id, { reason: note, expectedVersion: ticket.version });
  }

  layer.innerHTML = "";
  await loadAll();
}

function updateKpis() {
  const kpis = document.querySelectorAll(".admin-kpi-card__value");
  const summary = computeServiceKpis({ returns: state.returns, tickets: state.tickets });
  if (kpis.length >= 4) {
    kpis[0].textContent = String(summary.returnsInProgress);
    kpis[1].textContent = String(summary.ticketsInProgress);
    kpis[2].textContent = String(summary.highPriorityTickets);
    kpis[3].textContent = String(summary.completedToday);
  }

  // Also update tab badges
  const returnsTabBadge = document.querySelector('[data-zone="returns"] span');
  if (returnsTabBadge) {
    returnsTabBadge.textContent = String(summary.returnsInProgress);
  }

  const supportTabBadge = document.querySelector('[data-zone="support"] span');
  if (supportTabBadge) {
    supportTabBadge.textContent = String(summary.ticketsInProgress);
  }
}

function renderLogs(rows = state.logs) {
  const query = (document.querySelector("[data-table-search='logs']")?.value || "").toLowerCase();
  const filtered = rows.filter((row) => {
    if (query) {
      const matchString = JSON.stringify(row).toLowerCase();
      if (!matchString.includes(query)) return false;
    }
    return true;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (state.logsPage > totalPages) state.logsPage = totalPages;
  if (state.logsPage < 1) state.logsPage = 1;

  const start = (state.logsPage - 1) * state.itemsPerPage;
  const end = Math.min(start + state.itemsPerPage, totalItems);
  const pagedRows = filtered.slice(start, end);

  const body = document.querySelector("#logs-body");
  if (!body) return;
  body.innerHTML = pagedRows.length ? pagedRows.map((row) => {
    const oldValue = row.old_value || {};
    const newValue = row.new_value || {};
    const statusText = (oldValue.status || newValue.status) 
      ? `${escapeServiceHtml(oldValue.status || "—")} → ${escapeServiceHtml(newValue.status || "—")}`
      : "—";

    return `<tr>
      <td>${escapeServiceHtml(formatDate(row.timestamp))}</td>
      <td>${escapeServiceHtml(row.module || "CSKH")}</td>
      <td><strong>${escapeServiceHtml(row.target_id || "—")}</strong></td>
      <td>${escapeServiceHtml(row.actor_id || "Hệ thống")}<br><small>${escapeServiceHtml(row.actor_role || "")}</small></td>
      <td>${escapeServiceHtml(row.action || "—")}</td>
      <td>${statusText}</td>
      <td><span class="admin-badge admin-badge--success">Thành công</span></td>
    </tr>`;
  }).join("") : `<tr><td colspan="7"><div class="admin-empty-state">Không có nhật ký phù hợp</div></td></tr>`;

  const footer = document.querySelector("#logs-footer");
  if (footer) {
    const showStart = totalItems === 0 ? 0 : start + 1;
    footer.innerHTML = `
      <p class="admin-table-note">Hiển thị ${showStart} - ${end} / ${totalItems} nhật ký</p>
      ${renderPaginationMarkup(totalItems, state.logsPage, "logs")}
    `;
  }
}

async function loadAll() {
  try {
    const [returnsResult, ticketsResult, logsResult, chatResult] = await Promise.all([
      returnApi.listReturns({ limit: 1000 }), 
      returnApi.listTickets({ limit: 1000 }), 
      returnApi.auditLogs({ limit: 1000 }),
      loadChatSessions()
    ]);
    state.returns = returnsResult.rows || []; 
    state.tickets = ticketsResult.rows || []; 
    state.logs = logsResult.rows || [];
    renderReturns(); 
    renderTickets(); 
    renderLogs(); 
    updateKpis();
    renderChatSessionList();
  } catch (error) {
    document.querySelector("#returns-body").innerHTML = empty(error.message || "Không thể tải dữ liệu Supabase");
    document.querySelector("#support-body").innerHTML = empty(error.message || "Không thể tải dữ liệu Supabase");
  }
}

/* ============================================================
   CHAT PANEL FUNCTIONS
   ============================================================ */

async function loadChatSessions() {
  try {
    const data = await returnApi.listChatSessions({ limit: 1000, handoffOnly: false });
    state.chatSessions = (data.rows || []).filter((session) => session.is_active !== false);
    renderChatSessionList();
    if (state.chat.selectedSessionId) {
      updateChatControls(state.chatSessions.find((s) => s.session_id === state.chat.selectedSessionId));
    }
    return data;
  } catch (error) {
    console.error("Chat sessions load error:", error);
    return { rows: [] };
  }
}

function renderChatSessionList() {
  const container = document.querySelector("#chat-session-list");
  if (!container) return;

  const filter = document.querySelector("#chat-filter-status")?.value || "all";
  let sessions = state.chatSessions;
  if (filter !== "all") {
    sessions = sessions.filter((s) => (s.handoff_status || "ai") === filter);
  }

  const badge = document.querySelector("#chat-count-badge");
  if (badge) {
    const pendingCount = state.chatSessions.filter((s) => s.handoff_status === "requested").length;
    badge.textContent = String(pendingCount);
  }

  if (!sessions.length) {
    container.innerHTML = '<p class="admin-note" style="text-align:center;padding:24px;">Không có phiên chat nào</p>';
    return;
  }

  container.innerHTML = sessions.map((session) => {
    const isActive = session.session_id === state.chat.selectedSessionId;
    const statusMeta = getChatStatusMeta(session.handoff_status);
    const customerName = session.metadata?.guest_email || session.guest_id?.slice(0, 8) || "Khách";
    const preview = session.last_message_preview || session.title || "Chat";

    return `
      <div class="admin-chat-session-item ${isActive ? "is-active" : ""}" data-session-id="${escapeServiceHtml(session.session_id)}">
        <div class="admin-chat-session-item__header">
          <span class="admin-chat-session-item__name">${escapeServiceHtml(customerName)}</span>
          <span class="admin-chat-session-item__status admin-chat-session-item__status--${escapeServiceHtml(statusMeta.tone)}">${escapeServiceHtml(statusMeta.shortLabel)}</span>
        </div>
        <p class="admin-chat-session-item__preview">${escapeServiceHtml(preview)}</p>
        <small class="admin-chat-session-item__time">${escapeServiceHtml(formatDate(session.last_message_at || session.created_at))}</small>
      </div>
    `;
  }).join("");
}

async function loadChatMessages(sessionId) {
  try {
    const data = await returnApi.getChatMessages(sessionId, { limit: 150 });
    state.chat.messages = data.messages || [];
    state.chat.products = data.products || [];
    renderChatMessages();
    return data;
  } catch (error) {
    console.error("Chat messages load error:", error);
    return { messages: [], products: [] };
  }
}

function renderChatMessages() {
  const container = document.querySelector("#admin-chat-messages");
  if (!container) return;

  const productsMap = new Map();
  state.chat.products.forEach((p) => productsMap.set(p.product_id, p));

  if (!state.chat.messages.length) {
    container.innerHTML = '<p class="admin-note" style="text-align:center;padding:24px;">Chưa có tin nhắn</p>';
    return;
  }

  container.innerHTML = state.chat.messages.map((msg) => {
    const isUser = msg.sender === "user";
    const isAgent = msg.sender === "agent";
    const isBot = msg.sender === "bot";
    let senderClass = "admin-chat-msg--bot";
    let senderLabel = "AI";
    if (isUser) { senderClass = "admin-chat-msg--user"; senderLabel = "KH"; }
    if (isAgent) { senderClass = "admin-chat-msg--agent"; senderLabel = "CSKH"; }

    const productIds = Array.from(new Set([
      ...(Array.isArray(msg.product_ids) ? msg.product_ids : []),
      ...(Array.isArray(msg.metadata?.product_ids) ? msg.metadata.product_ids : [])
    ]));
    const productCards = productIds
      .map((id) => productsMap.get(id))
      .filter(Boolean)
      .map((p) => {
        const price = Number(p.sale_price || p.base_price || 0).toLocaleString("vi-VN");
        return `
          <div class="admin-chat-product-card">
            <img src="${escapeServiceHtml(p.image_url || '')}" alt="${escapeServiceHtml(p.name)}" />
            <div>
              <strong>${escapeServiceHtml(p.name)}</strong>
              <span>${price}₫</span>
            </div>
          </div>
        `;
      }).join("");

    return `
      <div class="admin-chat-msg ${senderClass}">
        <span class="admin-chat-msg__sender">${escapeServiceHtml(senderLabel)}</span>
        <div class="admin-chat-msg__text">${escapeServiceHtml(msg.text)}</div>
        ${productCards ? `<div class="admin-chat-msg__products">${productCards}</div>` : ""}
        <span class="admin-chat-msg__time">${escapeServiceHtml(formatDate(msg.created_at))}</span>
      </div>
    `;
  }).join("");

  container.scrollTop = container.scrollHeight;
}

function upsertChatSession(session) {
  if (!session?.session_id) return;
  const index = state.chatSessions.findIndex((item) => item.session_id === session.session_id);
  if (index >= 0) {
    state.chatSessions[index] = { ...state.chatSessions[index], ...session };
  } else {
    state.chatSessions.unshift(session);
  }
}

function updateChatControls(session) {
  const status = session?.handoff_status || "ai";
  const statusMeta = getChatStatusMeta(status);
  const statusBadge = document.querySelector("#chat-status-badge");
  const assignBtn = document.querySelector("#chat-assign-btn");
  const closeBtn = document.querySelector("#chat-close-btn");
  const input = document.querySelector("#admin-chat-input");
  const form = document.querySelector("#admin-chat-form");
  const sendBtn = form?.querySelector("button[type='submit']");
  const isAi = status === "ai";
  const isRequested = status === "requested";
  const isAssigned = status === "assigned";
  const isClosed = status === "closed";
  const canJoin = isAi || isRequested;
  const canReply = isAssigned;

  if (statusBadge) {
    statusBadge.textContent = statusMeta.label;
    statusBadge.className = `admin-badge ${statusMeta.badgeClass}`;
  }

  if (assignBtn) {
    assignBtn.style.display = canJoin ? "inline-flex" : "none";
    assignBtn.disabled = !canJoin;
    assignBtn.textContent = isAi ? "Tham gia" : "Tiếp nhận";
  }

  if (closeBtn) {
    closeBtn.style.display = session ? "inline-flex" : "none";
    closeBtn.disabled = isClosed || !session;
    closeBtn.textContent = isClosed ? "Đã đóng" : "Đóng";
  }

  if (input) {
    input.disabled = !canReply;
    input.placeholder = isClosed
      ? "Phiên chat đã đóng"
      : canReply
        ? "Nhập tin nhắn phản hồi..."
        : isAi
          ? "Nhấn 'Tham gia' để bắt đầu hỗ trợ khách..."
          : "Tiếp nhận phiên trước khi phản hồi...";
  }

  if (sendBtn) sendBtn.disabled = !canReply;
  if (form) form.classList.toggle("is-disabled", !canReply);
}

async function sendAgentReply(sessionId, message) {
  if (!sessionId || !message.trim()) return;
  try {
    const data = await returnApi.sendAgentReply(sessionId, message);
    upsertChatSession(data.session);
    if (data.message) state.chat.messages.push(data.message);
    renderChatMessages();
    await loadChatSessions();
    updateChatControls(state.chatSessions.find((s) => s.session_id === sessionId));
    return data;
  } catch (error) {
    console.error("Agent reply error:", error);
    throw error;
  }
}

async function assignChatSession(sessionId) {
  const button = document.querySelector("#chat-assign-btn");
  try {
    setButtonBusy(button, true, "Đang nhận...");
    const data = await returnApi.assignChatSession(sessionId, "assigned");
    upsertChatSession(data.session);
    await loadChatSessions();
    selectChatSession(sessionId);
    showToast("Đã tiếp nhận phiên chat. Bạn có thể phản hồi khách hàng.", "success");
  } catch (error) {
    console.error("Assign session error:", error);
    throw error;
  } finally {
    setButtonBusy(button, false);
    updateChatControls(state.chatSessions.find((s) => s.session_id === sessionId));
  }
}

async function closeChatSession(sessionId) {
  const button = document.querySelector("#chat-close-btn");
  try {
    setButtonBusy(button, true, "Đang đóng...");
    const data = await returnApi.assignChatSession(sessionId, "closed");
    upsertChatSession(data.session);
    await loadChatSessions();
    if (state.chat.selectedSessionId === sessionId) {
      selectChatSession(sessionId);
    }
    showToast("Đã đóng phiên chat.", "success");
  } catch (error) {
    console.error("Close session error:", error);
    throw error;
  } finally {
    setButtonBusy(button, false);
    updateChatControls(state.chatSessions.find((s) => s.session_id === sessionId));
  }
}

function selectChatSession(sessionId) {
  state.chat.selectedSessionId = sessionId;
  const session = state.chatSessions.find((s) => s.session_id === sessionId);

  document.querySelector("#admin-chat-empty").style.display = "none";
  const activeEl = document.querySelector("#admin-chat-active");
  activeEl.removeAttribute("hidden");
  activeEl.style.display = "flex";

  if (session) {
    const customerName = session.metadata?.guest_email || session.guest_id?.slice(0, 8) || "Khách hàng";
    document.querySelector("#chat-customer-name").textContent = customerName;
    document.querySelector("#chat-customer-id").textContent = `Session: ${sessionId.slice(0, 12)}...`;
    document.querySelector("#chat-avatar").textContent = customerName.charAt(0).toUpperCase();

    updateChatControls(session);
  } else {
    updateChatControls(null);
  }

  loadChatMessages(sessionId);
  renderChatSessionList();
}

function startChatAutoRefresh() {
  if (state.chat.refreshTimer) clearInterval(state.chat.refreshTimer);
  state.chat.refreshTimer = setInterval(async () => {
    if (state.zone !== "chat") return;
    await loadChatSessions();
    if (state.chat.selectedSessionId) {
      await loadChatMessages(state.chat.selectedSessionId);
    }
  }, 5000);
}

function stopChatAutoRefresh() {
  if (state.chat.refreshTimer) {
    clearInterval(state.chat.refreshTimer);
    state.chat.refreshTimer = null;
  }
}

// Chat panel event listeners
document.querySelector("#chat-filter-status")?.addEventListener("change", () => {
  renderChatSessionList();
});

document.querySelector("#chat-refresh-btn")?.addEventListener("click", async () => {
  await loadChatSessions();
  if (state.chat.selectedSessionId) {
    await loadChatMessages(state.chat.selectedSessionId);
  }
});

document.querySelector("#chat-session-list")?.addEventListener("click", (event) => {
  const item = event.target.closest(".admin-chat-session-item");
  if (item?.dataset.sessionId) {
    selectChatSession(item.dataset.sessionId);
  }
});

document.querySelector("#chat-assign-btn")?.addEventListener("click", async () => {
  if (state.chat.selectedSessionId) {
    try {
      await assignChatSession(state.chat.selectedSessionId);
    } catch (error) {
      showToast(error.message || "Không thể tiếp nhận phiên chat", "error");
    }
  }
});

document.querySelector("#chat-close-btn")?.addEventListener("click", async () => {
  if (state.chat.selectedSessionId && confirm("Đóng phiên chat này?")) {
    try {
      await closeChatSession(state.chat.selectedSessionId);
    } catch (error) {
      showToast(error.message || "Không thể đóng phiên chat", "error");
    }
  }
});

document.querySelector("#admin-chat-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#admin-chat-input");
  const sendBtn = event.currentTarget.querySelector("button[type='submit']");
  const text = input?.value.trim();
  if (!text || !state.chat.selectedSessionId) return;
  const session = state.chatSessions.find((s) => s.session_id === state.chat.selectedSessionId);
  if (session?.handoff_status !== "assigned") {
    showToast("Vui lòng tiếp nhận phiên chat trước khi phản hồi.", "warning");
    return;
  }
  input.value = "";
  try {
    setButtonBusy(sendBtn, true, "Đang gửi...");
    await sendAgentReply(state.chat.selectedSessionId, text);
    showToast("Đã gửi phản hồi cho khách hàng.", "success");
  } catch (error) {
    input.value = text;
    showToast("Không thể gửi tin nhắn: " + (error.message || "Lỗi không xác định"), "error");
  } finally {
    setButtonBusy(sendBtn, false);
    updateChatControls(state.chatSessions.find((s) => s.session_id === state.chat.selectedSessionId));
  }
});

document.addEventListener("click", (event) => {
  const pageBtn = event.target.closest("[data-service-page]");
  if (pageBtn) {
    const page = Number(pageBtn.dataset.servicePage);
    const type = pageBtn.dataset.serviceType;
    if (!Number.isNaN(page) && page > 0) {
      if (type === "returns") {
        state.returnsPage = page;
        renderReturns();
      } else if (type === "logs") {
        state.logsPage = page;
        renderLogs();
      } else {
        state.ticketsPage = page;
        renderTickets();
      }
    }
    return;
  }

  const zone = event.target.closest("[data-zone]");
  if (zone) {
    state.zone = zone.dataset.zone;
    state.returnsPage = 1;
    state.ticketsPage = 1;
    state.logsPage = 1;
    document.querySelectorAll("[data-zone]").forEach((node) => node.classList.toggle("admin-tab--active", node === zone));
    ["chat", "returns", "support", "logs"].forEach((name) => { 
      const panel = document.querySelector(`#${name}-panel`);
      if (panel) panel.hidden = name !== state.zone;
    });
    if (state.zone === "chat") {
      startChatAutoRefresh();
    } else {
      stopChatAutoRefresh();
    }
  }

  const resetBtn = event.target.closest("[data-reset]");
  if (resetBtn) {
    const type = resetBtn.dataset.reset;
    if (type === "returns" || !type) {
      const input = document.querySelector("[data-table-search='returns']");
      if (input) input.value = "";
      const typeSel = document.querySelector("#return-type-filter");
      if (typeSel) typeSel.value = "";
      const statusSel = document.querySelector("#return-status-filter");
      if (statusSel) statusSel.value = "";
      state.returnsPage = 1;
      renderReturns();
    }
    if (type === "support" || !type) {
      const input = document.querySelector("[data-table-search='support']");
      if (input) input.value = "";
      const statusSel = document.querySelector("#ticket-status-filter");
      if (statusSel) statusSel.value = "";
      const prioritySel = document.querySelector("#ticket-priority-filter");
      if (prioritySel) prioritySel.value = "";
      state.ticketsPage = 1;
      renderTickets();
    }
  }

  const detailButton = event.target.closest("[data-service-detail]");
  if (detailButton) detail(...detailButton.dataset.serviceDetail.split(":"));
  const action = event.target.closest("[data-service-action]");
  if (action) actionModal(...action.dataset.serviceAction.split(":"));
  if (event.target.closest("[data-service-close]")) {
    layer.innerHTML = "";
    document.querySelector("#service-drawer-container").innerHTML = "";
  }
  if (event.target.closest("[data-show-log]")) document.querySelector('[data-zone="logs"]').click();
  if (event.target.closest("[data-sidebar-toggle]")) {
    document.querySelector(".admin-layout").classList.toggle("admin-layout--sidebar-collapsed");
  }
});

document.addEventListener("submit", async (event) => {
  if (!event.target.matches("[data-service-form]")) return;
  event.preventDefault();
  try { 
    await submitAction(event.target); 
  } catch (error) {
    const msg = error.code === "VERSION_CONFLICT"
      ? "Dữ liệu đã được cập nhật bởi người khác. Vui lòng tải lại."
      : error.code === "RETURN_NOT_PENDING"
        ? "Yêu cầu đổi trả không ở trạng thái chờ xử lý."
        : error.code === "RETURN_NOT_FOUND"
          ? "Không tìm thấy yêu cầu đổi trả."
          : error.code === "RBAC_DENIED"
            ? "Bạn không có quyền thực hiện thao tác này."
            : error.message || "Không thể xử lý yêu cầu";
    showToast(msg, "error");
  }
});

document.querySelectorAll("[data-table-search]").forEach((input) => input.addEventListener("input", () => {
  if (input.dataset.tableSearch === "returns") {
    state.returnsPage = 1;
    renderReturns();
  }
  if (input.dataset.tableSearch === "support") {
    state.ticketsPage = 1;
    renderTickets();
  }
  if (input.dataset.tableSearch === "logs") {
    renderLogs();
  }
}));

document.querySelectorAll("#return-type-filter, #return-status-filter").forEach((sel) => sel.addEventListener("change", () => {
  state.returnsPage = 1;
  renderReturns();
}));

document.querySelectorAll("#ticket-status-filter, #ticket-priority-filter").forEach((sel) => sel.addEventListener("change", () => {
  state.ticketsPage = 1;
  renderTickets();
}));

document.querySelector("#btn-filter-returns")?.addEventListener("click", () => {
  state.returnsPage = 1;
  renderReturns();
});

document.querySelector("#btn-filter-tickets")?.addEventListener("click", () => {
  state.ticketsPage = 1;
  renderTickets();
});

document.querySelector("[data-export]")?.addEventListener("click", () => {
  const rows = state.zone === "support" ? state.tickets : state.returns;
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `velura-${state.zone}.json` });
  link.click(); URL.revokeObjectURL(link.href);
});

// Initial zone setup - parse URL hash or parameter
let initialZone = "chat";
if (location.hash === "#returns" || location.hash === "#returns-panel") {
  initialZone = "returns";
} else if (location.hash === "#support" || location.hash === "#support-panel") {
  initialZone = "support";
} else if (location.hash === "#logs" || location.hash === "#logs-panel") {
  initialZone = "logs";
} else {
  const params = new URLSearchParams(location.search);
  const zoneParam = params.get("zone");
  if (["chat", "returns", "support", "logs"].includes(zoneParam)) {
    initialZone = zoneParam;
  }
}

state.zone = initialZone;

document.querySelectorAll("[data-zone]").forEach((node) => node.classList.toggle("admin-tab--active", node.dataset.zone === initialZone));
["chat", "returns", "support", "logs"].forEach((name) => {
  const panel = document.querySelector(`#${name}-panel`);
  if (panel) panel.hidden = name !== initialZone;
});

window.addEventListener("hashchange", () => {
  let targetZone = "chat";
  if (location.hash === "#returns" || location.hash === "#returns-panel") {
    targetZone = "returns";
  } else if (location.hash === "#support" || location.hash === "#support-panel") {
    targetZone = "support";
  } else if (location.hash === "#logs" || location.hash === "#logs-panel") {
    targetZone = "logs";
  }
  
  state.zone = targetZone;
  state.returnsPage = 1;
  state.ticketsPage = 1;
  state.logsPage = 1;
  
  const tabButton = document.querySelector(`[data-zone="${targetZone}"]`);
  if (tabButton) {
    document.querySelectorAll("[data-zone]").forEach((node) => node.classList.toggle("admin-tab--active", node === tabButton));
  }
  ["chat", "returns", "support", "logs"].forEach((name) => {
    const panel = document.querySelector(`#${name}-panel`);
    if (panel) panel.hidden = name !== targetZone;
  });
  
  if (targetZone === "chat") {
    startChatAutoRefresh();
  } else {
    stopChatAutoRefresh();
  }
});

loadAll().then(() => {
  if (initialZone === "chat") {
    startChatAutoRefresh();
  }
});
