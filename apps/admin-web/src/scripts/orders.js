import adminIconsUrl from "../assets/icons/admin-icons.svg?url";
import { orderApi } from "./order-api.js";

const state = { orders: [], count: 0, active: "all", selected: null, logs: [], currentPage: 1, itemsPerPage: 10, logsPage: 1 };
const panel = document.querySelector("#order-panel");
const overlay = document.querySelector("#order-overlay");

const orderLabels = {
  pending: "Chờ xác nhận", confirmed: "Đã xác nhận", preparing: "Đang chuẩn bị",
  shipping: "Đang giao", delivered: "Đã giao", failed_delivery: "Giao thất bại",
  cancelled: "Đã hủy", completed: "Hoàn thành"
};
const paymentLabels = {
  paid: "Đã thanh toán", failed: "Thanh toán thất bại", pending: "Chờ xử lý",
  refunded: "Đã hoàn tiền", refund_pending: "Chờ hoàn tiền", discrepancy: "Cần đối soát"
};
const transitions = {
  pending: ["confirmed"], confirmed: ["preparing"], preparing: ["shipping"],
  shipping: ["delivered", "failed_delivery"], failed_delivery: ["shipping"], delivered: ["completed"]
};
const cancellable = ["pending", "confirmed", "preparing", "failed_delivery"];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function icon(name) {
  return `<svg class="admin-line-icon"><use href="${adminIconsUrl}#${escapeHtml(name)}" /></svg>`;
}

function money(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function dateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

function badge(value, kind = "order") {
  const label = kind === "payment" ? paymentLabels[value] : orderLabels[value];
  return `<span class="admin-badge admin-badge--${kind}-${escapeHtml(value)}">${escapeHtml(label || value || "—")}</span>`;
}

function paymentOf(order) {
  return Array.isArray(order.payments) ? order.payments[0] : null;
}

function isPaymentError(order) {
  const payment = paymentOf(order);
  return payment?.payment_status === "failed" || payment?.payment_status === "discrepancy" || payment?.has_discrepancy === true;
}

function needsAttention(order) {
  return order.status === "pending" || order.status === "failed_delivery" || isPaymentError(order);
}

function filteredOrders() {
  if (state.active === "attention") return state.orders.filter(needsAttention);
  if (state.active === "payment") return state.orders.filter(isPaymentError);
  if (state.active === "cancelled") return state.orders.filter((order) => order.status === "cancelled");
  return state.orders;
}

function filterBar() {
  return `<form class="admin-filter-bar admin-order-filter-bar" data-order-filter>
    <label class="admin-search-field">${icon("search")}<input class="admin-form-control" name="q" type="search" placeholder="Tên khách, số điện thoại, mã vận đơn..." /></label>
    <label class="admin-form-group"><select class="admin-form-control" name="status" aria-label="Trạng thái">
      <option value="">Tất cả trạng thái</option>${Object.keys(transitions).concat(["cancelled", "completed"]).map((value) => `<option value="${value}">${orderLabels[value]}</option>`).join("")}
    </select></label>
    <label class="admin-form-group"><select class="admin-form-control" name="paymentMethod" aria-label="Thanh toán"><option value="">Tất cả thanh toán</option><option value="COD">COD</option><option value="ONLINE_PAYMENT">Online</option></select></label>
    <label class="admin-form-group"><input class="admin-form-control" name="from" type="date" aria-label="Từ ngày" /></label>
    <div class="admin-filter-bar__actions"><button class="admin-btn admin-btn--filter admin-btn--sm" type="submit">Lọc</button><button class="admin-btn admin-btn--ghost admin-btn--sm" type="reset">Đặt lại</button></div>
  </form>`;
}

function actionMenu(order) {
  const id = escapeHtml(order.order_id);
  const payment = paymentOf(order);
  return `<div class="admin-order-actions">
    <button class="admin-icon-button admin-icon-button--sm" type="button" title="Xem chi tiết" data-order-detail="${id}">${icon("eye")}</button>
    <button class="admin-icon-button admin-icon-button--sm" type="button" title="Thao tác" data-order-menu="${id}">${icon("edit")}</button>
    <div class="admin-dropdown admin-table-action-menu admin-order-action-menu" id="order-menu-${id}" hidden>
      <button data-order-detail="${id}">${icon("eye")}<span>Xem chi tiết</span></button>
      ${(transitions[order.status] || []).length ? `<button data-order-action="status" data-order-id="${id}">${icon("settings")}<span>Cập nhật trạng thái</span></button>` : ""}
      ${cancellable.includes(order.status) ? `<button class="admin-order-action-menu__danger" data-order-action="cancel" data-order-id="${id}">${icon("lock")}<span>Hủy đơn</span></button>` : ""}
      ${payment?.has_discrepancy || payment?.payment_status === "discrepancy" ? `<button data-order-action="payment" data-order-id="${id}">${icon("credit-card")}<span>Xử lý thanh toán</span></button>` : ""}
    </div>
  </div>`;
}

function renderPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (totalPages <= 1) return "";
  
  let buttons = "";
  buttons += `<button type="button" data-order-page="${state.currentPage - 1}" ${state.currentPage === 1 ? "disabled" : ""}>←</button>`;
  
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 6) {
      if (i !== 1 && i !== totalPages && Math.abs(state.currentPage - i) > 1) {
        if (i === 2 && state.currentPage > 3) {
          buttons += `<span class="pagination-ellipsis" style="padding: 0 4px; color: var(--muted);">...</span>`;
        } else if (i === totalPages - 1 && state.currentPage < totalPages - 2) {
          buttons += `<span class="pagination-ellipsis" style="padding: 0 4px; color: var(--muted);">...</span>`;
        }
        continue;
      }
    }
    buttons += `<button type="button" class="${state.currentPage === i ? "is-active" : ""}" data-order-page="${i}">${i}</button>`;
  }
  
  buttons += `<button type="button" data-order-page="${state.currentPage + 1}" ${state.currentPage === totalPages ? "disabled" : ""}>→</button>`;
  return `<nav class="admin-pagination">${buttons}</nav>`;
}

function renderTable() {
  const activeOrders = filteredOrders();
  const totalItems = activeOrders.length;
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (state.currentPage > totalPages) {
    state.currentPage = totalPages;
  }
  if (state.currentPage < 1) {
    state.currentPage = 1;
  }

  const start = (state.currentPage - 1) * state.itemsPerPage;
  const end = start + state.itemsPerPage;
  const pagedRows = activeOrders.slice(start, end);

  if (!pagedRows.length) return `<div class="admin-order-empty">${icon("cart")}<strong>Không có đơn hàng phù hợp</strong><span>Điều chỉnh bộ lọc hoặc tải lại dữ liệu.</span></div>`;
  return `<div class="admin-table-wrap"><table class="admin-table admin-data-table"><thead><tr>
    <th>Mã đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thanh toán</th><th>Cần xử lý</th><th>Thao tác</th>
  </tr></thead><tbody>${pagedRows.map((order) => {
    const payment = paymentOf(order);
    return `<tr><td><span class="admin-order-code">${escapeHtml(order.order_id)}</span><small class="admin-order-subtext">${escapeHtml(dateTime(order.order_date))}</small></td>
      <td><div class="admin-order-customer"><strong>${escapeHtml(order.shipping_name)}</strong><small>${escapeHtml(order.shipping_phone)}</small></div></td>
      <td class="admin-order-amount">${money(order.total_amount)}</td><td>${badge(order.status)}</td>
      <td>${badge(payment?.payment_status || "pending", "payment")}</td>
      <td>${needsAttention(order) ? `<span class="admin-order-attention admin-order-attention--alert">${icon("alert")}Cần xử lý</span>` : "—"}</td>
      <td>${actionMenu(order)}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function updateCounters() {
  const counts = [state.count, state.orders.filter((o) => o.status === "pending").length, state.orders.filter(isPaymentError).length, state.orders.filter(needsAttention).length];
  document.querySelectorAll(".admin-order-kpis .admin-kpi-card__value").forEach((node, index) => { node.textContent = String(counts[index] || 0); });
  document.querySelectorAll("[data-order-tab] span").forEach((node) => {
    const tab = node.parentElement.dataset.orderTab;
    node.textContent = String(tab === "all" ? state.count : tab === "attention" ? counts[3] : tab === "payment" ? counts[2] : state.orders.filter((o) => o.status === "cancelled").length);
  });
}

function render() {
  if (state.active === "logs") return renderLogs();
  const activeOrders = filteredOrders();
  const totalItems = activeOrders.length;
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const end = Math.min(start + state.itemsPerPage, totalItems);
  const showStart = totalItems === 0 ? 0 : start + 1;

  panel.innerHTML = `${filterBar()}${renderTable()}<div class="admin-card__footer"><p class="admin-table-note">Hiển thị ${showStart} - ${end} / ${totalItems} đơn hàng</p>${renderPagination(totalItems)}</div>`;
  updateCounters();
}

async function loadOrders(params = {}) {
  panel.innerHTML = `<div class="admin-order-empty"><strong>Đang tải dữ liệu đơn hàng...</strong></div>`;
  try {
    const result = await orderApi.list({ ...params, limit: 1000 });
    state.orders = result.rows || [];
    state.count = result.count ?? state.orders.length;
    render();
  } catch (error) {
    panel.innerHTML = `<div class="admin-order-empty">${icon("alert")}<strong>Không thể tải đơn hàng</strong><span>${escapeHtml(error.message)}</span><button class="admin-btn admin-btn--secondary admin-btn--sm" data-order-retry>Thử lại</button></div>`;
  }
}

async function openDetail(orderId) {
  overlay.innerHTML = `<div class="admin-drawer-backdrop" data-order-close></div><aside class="admin-drawer admin-drawer--wide"><div class="admin-drawer__body">Đang tải...</div></aside>`;
  try {
    const order = await orderApi.get(orderId);
    state.selected = order;
    const payment = paymentOf(order);
    overlay.innerHTML = `<div class="admin-drawer-backdrop" data-order-close></div><aside class="admin-drawer admin-drawer--wide">
      <header class="admin-drawer__header"><div><p class="admin-product-code">${escapeHtml(order.order_id)}</p><h2 class="admin-section__title">${escapeHtml(order.shipping_name)}</h2><div class="admin-status-group">${badge(order.status)}${badge(payment?.payment_status || "pending", "payment")}</div></div><button class="admin-icon-button" data-order-close aria-label="Đóng">×</button></header>
      <div class="admin-drawer__body"><h3 class="admin-drawer__section">Thông tin giao hàng</h3><dl class="admin-data-list">
        <div><dt>Điện thoại</dt><dd>${escapeHtml(order.shipping_phone)}</dd></div><div><dt>Địa chỉ</dt><dd>${escapeHtml(order.shipping_address)}</dd></div><div><dt>Mã vận đơn</dt><dd>${escapeHtml(order.tracking_code || "—")}</dd></div><div><dt>Tổng thanh toán</dt><dd>${money(order.total_amount)}</dd></div>
      </dl><h3 class="admin-drawer__section">Sản phẩm</h3><div class="admin-order-product-list">${(order.items || []).map((item) => `<article class="admin-order-product"><div><strong>${escapeHtml(item.product_name)}</strong><small>SL: ${Number(item.quantity)}</small></div><div class="admin-order-product__price">${money(Number(item.unit_price) * Number(item.quantity))}</div></article>`).join("") || "—"}</div>
      <h3 class="admin-drawer__section">Lịch sử trạng thái</h3><div class="admin-timeline">${(order.history || []).sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at)).map((entry) => `<div class="admin-timeline__item"><strong>${escapeHtml(orderLabels[entry.new_status] || entry.new_status)}</strong><span>${escapeHtml(dateTime(entry.changed_at))} · ${escapeHtml(entry.note || entry.trigger_type)}</span></div>`).join("") || "—"}</div></div>
    </aside>`;
  } catch (error) { showToast(error.message, true); overlay.innerHTML = ""; }
}

function openAction(type, orderId) {
  const order = state.orders.find((item) => item.order_id === orderId);
  if (!order) return;
  const payment = paymentOf(order);
  let fields = "";
  let title = "";
  if (type === "status") {
    title = "Cập nhật trạng thái";
    const nextStatuses = transitions[order.status] || [];
    const allowedOptions = ["pending", "confirmed", "preparing", "shipping", "delivered", "failed_delivery", "completed"];
    
    let optionsHtml = `<option value="" disabled selected>-- Chọn trạng thái mới --</option>`;
    allowedOptions.forEach((statusVal) => {
      const isCurrent = statusVal === order.status;
      const isValidTransition = nextStatuses.includes(statusVal);
      const label = orderLabels[statusVal] || statusVal;
      
      const attrs = [];
      if (isCurrent) {
        optionsHtml += `<option value="${statusVal}" disabled selected>${label} (Hiện tại)</option>`;
      } else {
        if (!isValidTransition) attrs.push("disabled");
        optionsHtml += `<option value="${statusVal}" ${attrs.join(" ")}>${label}</option>`;
      }
    });

    fields = `
      <label class="admin-form-group">
        <span class="admin-form-label">Trạng thái mới</span>
        <select class="admin-form-control" name="status" required>
          ${optionsHtml}
        </select>
      </label>
      <label class="admin-form-group" data-tracking style="display: none;">
        <span class="admin-form-label">Mã vận đơn</span>
        <input class="admin-form-control" name="trackingCode" value="${escapeHtml(order.order_id)}" readonly maxlength="100">
      </label>
    `;
  } else if (type === "cancel") title = "Hủy đơn hàng";
  else {
    title = "Xử lý lệch thanh toán";
    fields = `<label class="admin-form-group"><span class="admin-form-label">Kết quả đối soát</span><select class="admin-form-control" name="decision" required><option value="mark_paid">Xác nhận đã thanh toán</option><option value="mark_failed">Xác nhận thất bại</option></select></label>`;
  }
  overlay.innerHTML = `<div class="admin-modal-overlay"><section class="admin-modal"><form data-order-action-form data-type="${type}" data-order-id="${escapeHtml(orderId)}" data-payment-id="${escapeHtml(payment?.payment_id || "")}">
    <header class="admin-modal__header"><h2>${title}</h2><button class="admin-icon-button" type="button" data-order-close>×</button></header><div class="admin-modal__body">${fields}<label class="admin-form-group"><span class="admin-form-label">Lý do <b>*</b></span><textarea class="admin-form-control admin-form-textarea" name="reason" minlength="10" maxlength="500" required></textarea></label></div>
    <footer class="admin-modal__footer"><button class="admin-btn admin-btn--ghost" type="button" data-order-close>Đóng</button><button class="admin-btn ${type === "cancel" ? "admin-btn--danger" : "admin-btn--secondary"}" type="submit">Xác nhận</button></footer>
  </form></section></div>`;
}

async function submitAction(form) {
  const order = state.orders.find((item) => item.order_id === form.dataset.orderId);
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    if (form.dataset.type === "status") await orderApi.changeStatus(order.order_id, { status: form.status.value, trackingCode: form.trackingCode?.value || null, reason: form.reason.value, expectedVersion: order.version });
    else if (form.dataset.type === "cancel") await orderApi.cancel(order.order_id, { reason: form.reason.value, expectedVersion: order.version });
    else await orderApi.resolvePayment(order.order_id, form.dataset.paymentId, { decision: form.decision.value, reason: form.reason.value, expectedOrderVersion: order.version, expectedPaymentVersion: paymentOf(order).version });
    overlay.innerHTML = "";
    showToast("Thao tác đã được ghi nhận trên hệ thống.");
    await loadOrders();
  } catch (error) { showToast(error.code?.includes("VERSION") ? "Dữ liệu đã thay đổi. Hãy tải lại và thử lại." : error.message, true); }
  finally { submit.disabled = false; }
}

async function renderLogs() {
  if (!state.logs || state.logs.length === 0) {
    const targets = state.orders.slice(0, 20);
    panel.innerHTML = `<div class="admin-order-empty"><strong>Đang tải nhật ký...</strong></div>`;
    try {
      const results = await Promise.all(targets.map((order) => orderApi.auditLogs(order.order_id, { limit: 20 })));
      state.logs = results.flatMap((result) => result.rows || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      panel.innerHTML = `<div class="admin-order-empty"><strong>Không thể tải nhật ký</strong><span>${escapeHtml(error.message)}</span></div>`;
      return;
    }
  }

  const totalItems = state.logs.length;
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (state.logsPage > totalPages) state.logsPage = totalPages;
  if (state.logsPage < 1) state.logsPage = 1;

  const start = (state.logsPage - 1) * state.itemsPerPage;
  const end = start + state.itemsPerPage;
  const pagedLogs = state.logs.slice(start, end);

  let paginationButtons = "";
  if (totalPages > 1) {
    paginationButtons += `<button type="button" data-order-logs-page="${state.logsPage - 1}" ${state.logsPage === 1 ? "disabled" : ""}>←</button>`;
    for (let i = 1; i <= totalPages; i++) {
      paginationButtons += `<button type="button" class="${state.logsPage === i ? "is-active" : ""}" data-order-logs-page="${i}">${i}</button>`;
    }
    paginationButtons += `<button type="button" data-order-logs-page="${state.logsPage + 1}" ${state.logsPage === totalPages ? "disabled" : ""}>→</button>`;
  }
  const paginationHtml = totalPages > 1 ? `<nav class="admin-pagination">${paginationButtons}</nav>` : "";

  const tableRows = pagedLogs.map((log) => {
    return `<tr>
      <td>${escapeHtml(dateTime(log.timestamp))}</td>
      <td><span class="admin-order-code">${escapeHtml(log.target_id)}</span></td>
      <td>${escapeHtml(log.actor_role)}</td>
      <td>${escapeHtml(log.action)}</td>
      <td>${escapeHtml(JSON.stringify(log.new_value || {}))}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="5">Chưa có nhật ký</td></tr>`;

  panel.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table admin-data-table">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Mã đơn</th>
            <th>Vai trò</th>
            <th>Hành động</th>
            <th>Thay đổi</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
    <div class="admin-card__footer" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
      <p class="admin-table-note">Hiển thị ${totalItems === 0 ? 0 : start + 1} - ${Math.min(end, totalItems)} / ${totalItems} nhật ký</p>
      ${paginationHtml}
    </div>
  `;
}

function exportCsv() {
  const rows = [["order_id", "order_date", "status", "shipping_name", "shipping_phone", "total_amount"], ...filteredOrders().map((o) => [o.order_id, o.order_date, o.status, o.shipping_name, o.shipping_phone, o.total_amount])];
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  link.download = `velura-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function showToast(message, isError = false) {
  const toast = document.querySelector("#order-toast");
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 3500);
}

document.addEventListener("click", (event) => {
  const menuBtn = event.target.closest("[data-order-menu]");
  const menuContent = event.target.closest(".admin-order-action-menu");
  if (!menuBtn && !menuContent) {
    document.querySelectorAll(".admin-order-action-menu").forEach((menu) => {
      menu.hidden = true;
    });
  }

  const logsPageBtn = event.target.closest("[data-order-logs-page]");
  if (logsPageBtn) {
    const page = Number(logsPageBtn.dataset.orderLogsPage);
    if (!Number.isNaN(page) && page > 0) {
      state.logsPage = page;
      renderLogs();
    }
    return;
  }

  const pageBtn = event.target.closest("[data-order-page]");
  if (pageBtn) {
    const page = Number(pageBtn.dataset.orderPage);
    if (!Number.isNaN(page) && page > 0) {
      state.currentPage = page;
      render();
    }
    return;
  }

  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.orderTab) {
    state.active = button.dataset.orderTab;
    state.currentPage = 1;
    state.logsPage = 1;
    document.querySelectorAll("[data-order-tab]").forEach((tab) => tab.classList.toggle("admin-tab--active", tab === button));
    render();
  }
  if (button.dataset.orderOpenLogs !== undefined) {
    state.active = "logs";
    state.currentPage = 1;
    state.logsPage = 1;
    const logsTab = document.querySelector('[data-order-tab="logs"]');
    if (logsTab) {
      document.querySelectorAll("[data-order-tab]").forEach((tab) => tab.classList.toggle("admin-tab--active", tab === logsTab));
    }
    render();
  }
  if (button.dataset.orderSidebar !== undefined) document.querySelector(".admin-layout").classList.toggle("admin-layout--sidebar-collapsed");
  if (button.dataset.orderMenu) {
    const targetMenu = document.querySelector(`#order-menu-${CSS.escape(button.dataset.orderMenu)}`);
    const isCurrentlyHidden = targetMenu.hidden;
    document.querySelectorAll(".admin-order-action-menu").forEach((menu) => { menu.hidden = true; });
    targetMenu.hidden = !isCurrentlyHidden;
  }
  if (button.dataset.orderDetail) openDetail(button.dataset.orderDetail);
  if (button.dataset.orderAction) openAction(button.dataset.orderAction, button.dataset.orderId);
  if (button.dataset.orderClose !== undefined) overlay.innerHTML = "";
  if (button.dataset.orderRetry !== undefined) loadOrders();
  if (button.dataset.orderExport !== undefined) exportCsv();
});

panel.addEventListener("submit", (event) => {
  if (!event.target.matches("[data-order-filter]")) return;
  event.preventDefault();
  state.currentPage = 1;
  const data = new FormData(event.target);
  loadOrders(Object.fromEntries(data.entries()));
});
panel.addEventListener("reset", () => {
  state.currentPage = 1;
  setTimeout(() => loadOrders(), 0);
});
overlay.addEventListener("change", (event) => {
  if (event.target.name === "status") {
    const tracking = event.target.form.querySelector("[data-tracking]");
    const isShipping = event.target.value === "shipping";
    tracking.style.display = isShipping ? "" : "none";
    tracking.querySelector("input").required = isShipping;
  }
});
overlay.addEventListener("submit", (event) => {
  if (!event.target.matches("[data-order-action-form]")) return;
  event.preventDefault();
  submitAction(event.target);
});

loadOrders();
