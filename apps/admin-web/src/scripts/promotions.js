import adminIconsUrl from "../assets/icons/admin-icons.svg?url";
import { pricingApi } from "./pricing-api.js";
import { productApi } from "./product-api.js";

const state = { view: "campaigns", promotions: [], vouchers: [], bundles: [], logs: [], stats: null, comboPage: 1, comboPerPage: 10, comboItems: {}, allProducts: [], categories: [], logsPage: 1, logsPerPage: 10 };
const panel = document.querySelector("#promo-panel");
const overlay = document.querySelector("#promo-overlay");
const toast = document.querySelector("#promo-toast");

export function escapePromotionHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}
function icon(name) { return `<svg class="admin-line-icon"><use href="${adminIconsUrl}#${escapePromotionHtml(name)}"></use></svg>`; }
function money(value) { return Number(value || 0).toLocaleString("vi-VN") + "đ"; }
function date(value) { if (!value) return "-"; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "-" : new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }).format(parsed); }
function badge(active) { return `<span class="admin-badge admin-badge--${active ? "success" : "warning"}">${active ? "Đang hoạt động" : "Tạm dừng"}</span>`; }
function progressBar(used, total) {
  const pct = total > 0 ? Math.min(Math.round(used * 100 / total), 100) : 0;
  return `<div class="admin-progress admin-progress--wide"><span style="width:${pct}%;background:${pct > 80 ? "var(--error)" : pct > 50 ? "var(--warning,#e67e22)" : "var(--terracotta)"}"></span></div><small class="admin-order-subtext">${pct}% đã sử dụng</small>`;
}

function showToast(message, type = "success") {
  if (!toast) return;
  toast.textContent = message;
  toast.className = `admin-toast admin-toast--${type}`;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { toast.hidden = true; }, 3000);
}

function renderPagination(totalItems, currentPage, perPage, dataAttr) {
  const totalPages = Math.ceil(totalItems / perPage) || 1;
  if (totalPages <= 1) return "";
  let buttons = "";
  buttons += `<button type="button" data-${dataAttr}="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}>←</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 6) {
      if (i !== 1 && i !== totalPages && Math.abs(currentPage - i) > 1) {
        if (i === 2 && currentPage > 3) buttons += `<span style="padding:0 4px;color:var(--muted)">...</span>`;
        else if (i === totalPages - 1 && currentPage < totalPages - 2) buttons += `<span style="padding:0 4px;color:var(--muted)">...</span>`;
        continue;
      }
    }
    buttons += `<button type="button" class="${currentPage === i ? "is-active" : ""}" data-${dataAttr}="${i}">${i}</button>`;
  }
  buttons += `<button type="button" data-${dataAttr}="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""}>→</button>`;
  return `<nav class="admin-pagination">${buttons}</nav>`;
}

function updateKpis() {
  const activePromotions = state.promotions.filter((row) => row.is_active).length;
  const activeVouchers = state.vouchers.filter((row) => row.is_active).length;
  const issued = state.promotions.reduce((sum, row) => sum + Number(row.total_discount_issued || 0), 0);
  const budget = state.promotions.reduce((sum, row) => sum + Number(row.budget_limit || 0), 0);
  const values = [["Chiến dịch đang chạy", activePromotions], ["Voucher hoạt động", activeVouchers], ["Giảm giá đã phát hành", money(issued)], ["Tổng ngân sách", money(budget)], ["Cần xử lý", state.promotions.length - activePromotions]];
  document.querySelector("#promo-kpis").innerHTML = values.map(([label, value]) => `<article class="admin-kpi-card"><div class="admin-kpi-card__head"><p class="admin-kpi-card__label">${label}</p><span class="admin-kpi-card__icon">${icon("tag")}</span></div><strong class="admin-kpi-card__value">${value}</strong></article>`).join("");
  document.querySelectorAll("[data-promo-view] span").forEach((node) => { const view = node.parentElement.dataset.promoView; node.textContent = String(view === "campaigns" ? state.promotions.length : view === "vouchers" ? state.vouchers.length : view === "bundles" ? state.bundles.length : view === "stats" ? "📊" : state.logs.length); });
}

function campaignRows() {
  return state.promotions.map((row) => {
    const budgetUsed = Number(row.total_discount_issued || 0);
    const budgetTotal = Number(row.budget_limit || 0);
    return `<tr><td><strong>${escapePromotionHtml(row.promo_name)}</strong><small class="admin-order-subtext">${escapePromotionHtml(row.promo_id)}</small></td><td>${escapePromotionHtml(row.promo_type === "flash_sale" ? "Flash Sale" : row.promo_type === "combo_discount" ? "Giảm giá Combo" : row.promo_type === "product_discount" ? "Giảm giá sản phẩm" : row.promo_type === "seasonal_sale" ? "Giảm giá theo mùa" : row.promo_type)}</td><td>${date(row.start_date)} - ${date(row.end_date)}</td><td><div>${money(budgetUsed)} / ${money(budgetTotal)}</div>${budgetTotal > 0 ? progressBar(budgetUsed, budgetTotal) : ""}</td><td>${badge(row.is_active)}</td><td><div class="admin-table-actions"><button class="admin-icon-button admin-icon-button--sm" data-promo-detail="promotion:${escapePromotionHtml(row.promo_id)}" title="Chi tiết">${icon("eye")}</button><button class="admin-icon-button admin-icon-button--sm" data-promo-edit="promotion:${escapePromotionHtml(row.promo_id)}" title="Chỉnh sửa">${icon("edit")}</button><button class="admin-icon-button admin-icon-button--sm" data-promo-toggle="${escapePromotionHtml(row.promo_id)}" title="Đổi trạng thái">${icon("refresh")}</button></div></td></tr>`;
  }).join("");
}

function voucherRows() {
  return state.vouchers.map((row) => {
    const promo = row.promo_id ? state.promotions.find(p => p.promo_id === row.promo_id) : null;
    const isPromoActive = promo ? promo.is_active : true;
    const isActive = row.is_active && isPromoActive;
    const statusBadge = isActive 
      ? `<span class="admin-badge admin-badge--success">Đang hoạt động</span>`
      : `<span class="admin-badge admin-badge--warning">${!row.is_active ? "Tạm dừng" : "Tạm dừng (Theo chiến dịch)"}</span>`;
    return `<tr><td><strong>${escapePromotionHtml(row.code)}</strong><small class="admin-order-subtext">${escapePromotionHtml(row.name)}</small></td><td>${escapePromotionHtml(row.discount_type === "percentage" ? "Theo phần trăm" : row.discount_type === "fixed_amount" ? "Số tiền cố định" : row.discount_type === "free_shipping" ? "Miễn phí vận chuyển" : row.discount_type)}</td><td>${row.discount_type === "percentage" ? row.discount_value + "%" : money(row.discount_value)}</td><td>${money(row.min_order_value)}</td><td>${escapePromotionHtml(row.used_count || 0)} / ${escapePromotionHtml(row.usage_limit_total || "∞")}</td><td>${date(row.end_date)}</td><td>${statusBadge}</td><td><div class="admin-table-actions"><button class="admin-icon-button admin-icon-button--sm" data-promo-detail="voucher:${escapePromotionHtml(row.voucher_id)}" title="Chi tiết">${icon("eye")}</button><button class="admin-icon-button admin-icon-button--sm" data-voucher-toggle="${escapePromotionHtml(row.voucher_id)}" title="${row.is_active ? "Tạm dừng" : "Kích hoạt"}">${icon("refresh")}</button></div></td></tr>`;
  }).join("");
}

function bundleRows() {
  const total = state.bundles.length;
  const start = (state.comboPage - 1) * state.comboPerPage;
  const paged = state.bundles.slice(start, start + state.comboPerPage);
  const items = state.comboItems || {};
  return { rows: paged.map((row) => {
    const comboItems = items[row.product_id] || [];
    const itemCount = comboItems.length;
    const saving = itemCount > 0 ? calcSaving(row, comboItems) : null;
    const savingHtml = saving && saving > 0 ? `<small class="admin-order-subtext" style="color:var(--success)">-${Math.round(saving)}%</small>` : "";
    return `<tr>
      <td><strong>${escapePromotionHtml(row.name)}</strong><small class="admin-order-subtext">${escapePromotionHtml(row.sku)}</small></td>
      <td>${money(row.base_price)}</td>
      <td>${money(row.sale_price ?? row.base_price)}${savingHtml}</td>
      <td>${itemCount} sản phẩm</td>
      <td>${badge(row.status === "on_sale")}</td>
      <td><div class="admin-table-actions">
        <button class="admin-icon-button admin-icon-button--sm" data-promo-detail="bundle:${escapePromotionHtml(row.product_id)}" title="Chi tiết & Quản lý thành phần">${icon("edit")}</button>
      </div></td>
    </tr>`;
  }).join(""), total, start, end: Math.min(start + state.comboPerPage, total) };
}

function calcSaving(combo, comboItems) {
  const totalItemValue = comboItems.reduce((sum, item) => {
    const product = (state.allProducts || []).find(p => p.product_id === item.component_product_id);
    return sum + (product ? (product.sale_price ?? product.base_price) * (item.quantity || 1) : 0);
  }, 0);
  const comboPrice = combo.sale_price ?? combo.base_price;
  return totalItemValue > 0 ? ((totalItemValue - comboPrice) / totalItemValue) * 100 : 0;
}

function logRows() { return state.logs.map((row) => `<tr><td>${date(row.timestamp)}</td><td>${escapePromotionHtml(row.actor_id || "system")}</td><td>${escapePromotionHtml(row.module)}</td><td>${escapePromotionHtml(row.target_id)}</td><td>${escapePromotionHtml(row.action)}</td><td>${escapePromotionHtml(JSON.stringify(row.new_value || {}))}</td></tr>`).join(""); }

function statsView() {
  const s = state.stats;
  if (!s) { panel.innerHTML = '<div class="admin-order-empty"><strong>Đang tải thống kê...</strong></div>'; return; }
  const p = s.promotions;
  const v = s.vouchers;
  panel.innerHTML = `
    <div class="admin-promo-console">
      <div class="admin-promo-detail-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        <article><span>Tổng chiến dịch</span><strong>${p.total}</strong></article>
        <article><span>Đang hoạt động</span><strong style="color:var(--success,#27ae60)">${p.active}</strong></article>
        <article><span>Tạm dừng</span><strong style="color:var(--warning,#e67e22)">${p.paused}</strong></article>
        <article><span>Tổng ngân sách</span><strong>${money(p.totalBudget)}</strong></article>
      </div>
      <div class="admin-promo-overview-grid">
        <section class="admin-card">
          <div class="admin-card__header"><h3>Ngân sách khuyến mãi</h3></div>
          <div class="admin-card__body">
            <dl class="admin-data-list">
              <div><dt>Đã phát hành</dt><dd><b>${money(p.totalIssued)}</b></dd></div>
              <div><dt>Còn lại</dt><dd><b>${money(p.budgetRemaining)}</b></dd></div>
              <div><dt>Tỷ lệ sử dụng</dt><dd>${p.budgetUsagePercent}%</dd></div>
            </dl>
            <div style="margin-top:12px">${progressBar(p.totalIssued, p.totalBudget)}</div>
          </div>
        </section>
        <section class="admin-card">
          <div class="admin-card__header"><h3>Voucher</h3></div>
          <div class="admin-card__body">
            <dl class="admin-data-list">
              <div><dt>Tổng voucher</dt><dd><b>${v.total}</b></dd></div>
              <div><dt>Đang hoạt động</dt><dd><b>${v.active}</b></dd></div>
              <div><dt>Hết hạn / Tạm dừng</dt><dd><b>${v.expired}</b></dd></div>
              <div><dt>Lượt sử dụng</dt><dd>${v.totalUsed} / ${v.totalLimit || "∞"}</dd></div>
              <div><dt>Tỷ lệ sử dụng</dt><dd>${v.usagePercent}%</dd></div>
            </dl>
            <div style="margin-top:12px">${progressBar(v.totalUsed, v.totalLimit)}</div>
          </div>
        </section>
      </div>
    </div>`;
}

function tableWrap(headers, rows, emptyText, footer) { return `<div class="admin-table-wrap"><table class="admin-table admin-data-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}">${emptyText}</td></tr>`}</tbody></table></div>${footer || ""}`; }

function render() {
  if (state.view === "stats") return statsView();
  if (state.view === "vouchers") panel.innerHTML = tableWrap(["Mã", "Loại", "Giá trị", "Đơn tối thiểu", "Lượt dùng", "Hết hạn", "Trạng thái", "Thao tác"], voucherRows(), "Chưa có voucher");
  else if (state.view === "bundles") {
    const b = bundleRows();
    const footer = `<div class="admin-card__footer"><p class="admin-table-note">Hiển thị ${b.start + 1} - ${b.end} / ${b.total} combo</p>${renderPagination(b.total, state.comboPage, state.comboPerPage, "combo-page")}</div>`;
    panel.innerHTML = `<div class="admin-section__header"><h3 class="admin-section__title" style="margin:0;font-size:1.125rem;font-weight:500;">Danh sách Combo</h3><button class="admin-btn admin-btn--secondary admin-btn--sm" data-promo-modal="combo">${icon("plus")} Tạo Combo mới</button></div>` + tableWrap(["Combo", "Giá gốc", "Giá bán", "Thành phần", "Trạng thái", "Thao tác"], b.rows, "Chưa có combo trong danh sách sản phẩm", footer);
  }
  else if (state.view === "logs") {
    const total = state.logs.length;
    const start = (state.logsPage - 1) * state.logsPerPage;
    const paged = state.logs.slice(start, start + state.logsPerPage);
    const rowsHtml = paged.map((row) => `<tr><td>${date(row.timestamp)}</td><td>${escapePromotionHtml(row.actor_id || "system")}</td><td>${escapePromotionHtml(row.module)}</td><td>${escapePromotionHtml(row.target_id)}</td><td>${escapePromotionHtml(row.action)}</td><td>${escapePromotionHtml(JSON.stringify(row.new_value || {}))}</td></tr>`).join("");
    const footer = `<div class="admin-card__footer"><p class="admin-table-note">Hiển thị ${total === 0 ? 0 : start + 1} - ${Math.min(start + state.logsPerPage, total)} / ${total} nhật ký</p>${renderPagination(total, state.logsPage, state.logsPerPage, "promo-logs-page")}</div>`;
    panel.innerHTML = tableWrap(["Thời gian", "Người thực hiện", "Nhóm", "Đối tượng", "Hành động", "Dữ liệu mới"], rowsHtml, "Chưa có nhật ký", footer);
  }
  else panel.innerHTML = tableWrap(["Chiến dịch", "Loại", "Thời gian", "Ngân sách", "Trạng thái", "Thao tác"], campaignRows(), "Chưa có chiến dịch");
}

function detail(type, id) {
  const row = type === "promotion" ? state.promotions.find((item) => item.promo_id === id) : type === "voucher" ? state.vouchers.find((item) => item.voucher_id === id) : state.bundles.find((item) => item.product_id === id);
  if (!row) return;
  let bodyHtml = "";
  if (type === "promotion") {
    const budgetUsed = Number(row.total_discount_issued || 0);
    const budgetTotal = Number(row.budget_limit || 0);
    const linkedVouchers = state.vouchers.filter((v) => v.promo_id === id);
    const totalVoucherUses = linkedVouchers.reduce((sum, v) => sum + (v.used_count || 0), 0);
    
    let vouchersHtml = "";
    if (linkedVouchers.length > 0) {
      vouchersHtml = `
        <h3 class="admin-drawer__section" style="margin-top:20px;font-family:'Playfair Display',Georgia,serif;font-size:1.125rem;font-weight:500;">Mã giảm giá liên kết (${linkedVouchers.length})</h3>
        <table class="admin-table admin-data-table" style="font-size:0.8125rem;margin-top:8px;">
          <thead><tr><th>Mã Voucher</th><th>Loại giảm</th><th>Giá trị</th><th>Lượt dùng</th><th>Trạng thái</th></tr></thead>
          <tbody>
            ${linkedVouchers.map(v => `
              <tr>
                <td><strong>${escapePromotionHtml(v.code)}</strong><br><small style="color:var(--muted)">${escapePromotionHtml(v.name)}</small></td>
                <td>${escapePromotionHtml(v.discount_type === "percentage" ? "Theo phần trăm" : v.discount_type === "fixed_amount" ? "Số tiền cố định" : "Miễn phí vận chuyển")}</td>
                <td>${v.discount_type === "percentage" ? v.discount_value + "%" : money(v.discount_value)}</td>
                <td>${v.used_count || 0} / ${v.usage_limit_total || "∞"}</td>
                <td>${v.is_active && row.is_active ? badge(true) : `<span class="admin-badge admin-badge--warning">${!v.is_active ? "Tạm dừng" : "Tạm dừng (Theo chiến dịch)"}</span>`}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else {
      vouchersHtml = `
        <h3 class="admin-drawer__section" style="margin-top:20px;font-family:'Playfair Display',Georgia,serif;font-size:1.125rem;font-weight:500;">Mã giảm giá liên kết</h3>
        <div style="font-style:italic;color:var(--muted);padding:8px 0;font-size:0.8125rem;">Chiến dịch này chưa được liên kết với mã giảm giá nào.</div>
      `;
    }

    bodyHtml = `
      <dl class="admin-data-list">
        <div><dt>Tên chiến dịch</dt><dd>${escapePromotionHtml(row.promo_name)}</dd></div>
        <div><dt>Loại</dt><dd>${escapePromotionHtml(row.promo_type)}</dd></div>
        <div><dt>Trạng thái</dt><dd>${badge(row.is_active)}</dd></div>
        <div><dt>Thời gian</dt><dd>${date(row.start_date)} - ${date(row.end_date)}</dd></div>
        <div><dt>Ngân sách</dt><dd>${money(budgetTotal)}</dd></div>
        <div><dt>Đã phát hành</dt><dd>${money(budgetUsed)}</dd></div>
        <div><dt>Tiến trình</dt><dd>${budgetTotal > 0 ? progressBar(budgetUsed, budgetTotal) : "Không giới hạn"}</dd></div>
        <div><dt>Tổng lượt dùng mã liên kết</dt><dd><b>${totalVoucherUses}</b> lượt</dd></div>
        <div><dt>Phiên bản</dt><dd>${escapePromotionHtml(row.version)}</dd></div>
      </dl>
      ${vouchersHtml}
    `;
  } else if (type === "voucher") {
    const promo = row.promo_id ? state.promotions.find(p => p.promo_id === row.promo_id) : null;
    const promoName = promo ? promo.promo_name : "Không thuộc chiến dịch";
    const isPromoActive = promo ? promo.is_active : true;
    const isVoucherActive = row.is_active && isPromoActive;
    const finalBadge = isVoucherActive 
      ? badge(true) 
      : `<span class="admin-badge admin-badge--warning">${!row.is_active ? "Tạm dừng" : "Tạm dừng (Theo chiến dịch)"}</span>`;
    bodyHtml = `<dl class="admin-data-list">
      <div><dt>Mã</dt><dd><strong>${escapePromotionHtml(row.code)}</strong></dd></div>
      <div><dt>Tên</dt><dd>${escapePromotionHtml(row.name)}</dd></div>
      <div><dt>Chiến dịch áp dụng</dt><dd><strong>${escapePromotionHtml(promoName)}</strong></dd></div>
      <div><dt>Loại giảm</dt><dd>${escapePromotionHtml(row.discount_type === "percentage" ? "Theo phần trăm" : row.discount_type === "fixed_amount" ? "Số tiền cố định" : "Miễn phí vận chuyển")}</dd></div>
      <div><dt>Giá trị</dt><dd>${row.discount_type === "percentage" ? row.discount_value + "%" : money(row.discount_value)}</dd></div>
      <div><dt>Giảm tối đa</dt><dd>${row.max_discount_amount ? money(row.max_discount_amount) : "Không giới hạn"}</dd></div>
      <div><dt>Đơn tối thiểu</dt><dd>${money(row.min_order_value)}</dd></div>
      <div><dt>Lượt dùng</dt><dd>${row.used_count || 0} / ${row.usage_limit_total || "∞"}</dd></div>
      <div><dt>Giới hạn/user</dt><dd>${row.usage_limit_per_user}</dd></div>
      <div><dt>Danh mục áp dụng</dt><dd>${row.applicable_categories ? escapePromotionHtml(row.applicable_categories) : "Tất cả danh mục"}</dd></div>
      <div><dt>Nhóm khách hàng</dt><dd>${row.applicable_user_group === "all_users" ? "Tất cả khách hàng" : row.applicable_user_group === "new_users" ? "Khách hàng mới" : row.applicable_user_group === "vip_members" ? "Thành viên VIP" : escapePromotionHtml(row.applicable_user_group || "Tất cả khách hàng")}</dd></div>
      <div><dt>Thời hạn</dt><dd>${date(row.start_date)} - ${date(row.end_date)}</dd></div>
      <div><dt>Trạng thái</dt><dd>${finalBadge}</dd></div>
    </dl>`;
  } else {
    const comboId = escapePromotionHtml(row.product_id);
    const cachedItems = state.comboItems[row.product_id] || [];
    const totalItemValue = cachedItems.reduce((sum, item) => {
      const product = (state.allProducts || []).find(p => p.product_id === item.component_product_id);
      return sum + (product ? (product.sale_price ?? product.base_price) * (item.quantity || 1) : 0);
    }, 0);
    const savings = totalItemValue - (row.sale_price ?? row.base_price);
    bodyHtml = `
      <dl class="admin-data-list">
        <div><dt>Tên Combo</dt><dd><strong>${escapePromotionHtml(row.name)}</strong></dd></div>
        <div><dt>SKU</dt><dd><code>${escapePromotionHtml(row.sku)}</code></dd></div>
        <div><dt>Giá gốc (từng sản phẩm)</dt><dd>${money(totalItemValue)}</dd></div>
        <div><dt>Giá bán combo</dt><dd><strong style="color:var(--terracotta)">${money(row.sale_price ?? row.base_price)}</strong></dd></div>
        ${savings > 0 ? `<div><dt>Tiết kiệm</dt><dd style="color:var(--success)">${money(savings)} (-${Math.round(savings / totalItemValue * 100)}%)</dd></div>` : ""}
        <div>
          <dt>Trạng thái</dt>
          <dd style="display:flex;align-items:center;gap:12px;">
            ${badge(row.status === "on_sale")}
            <button class="admin-btn admin-btn--ghost admin-btn--sm" data-bundle-toggle="${comboId}" style="padding: 2px 8px; font-size: 0.75rem;">
              ${row.status === "on_sale" ? "Tạm dừng hoạt động" : "Kích hoạt hoạt động"}
            </button>
          </dd>
        </div>
        <div><dt>Số thành phần</dt><dd>${cachedItems.length} sản phẩm</dd></div>
      </dl>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:20px;">
        <h3 class="admin-drawer__section" style="margin:0;">Thành phần combo (${cachedItems.length})</h3>
        <button class="admin-btn admin-btn--secondary admin-btn--sm" data-combo-add-item="${comboId}">${icon("plus")} Thêm thành phần</button>
      </div>
      <div id="combo-items-list" style="margin-top:10px;">${cachedItems.length ? "" : "Đang tải thông tin thành phần..."}</div>
    `;
  }
  overlay.innerHTML = `<div class="admin-drawer-backdrop" data-promo-close></div><aside class="admin-drawer admin-drawer--wide"><header class="admin-drawer__header"><h2>Chi tiết ${escapePromotionHtml(type === "promotion" ? "chiến dịch" : type === "voucher" ? "voucher" : "combo")}</h2><button class="admin-icon-button" data-promo-close>×</button></header><div class="admin-drawer__body">${bodyHtml}</div></aside>`;
  if (type === "bundle") {
    loadComboItems(row.product_id);
  }
}

async function loadComboItems(productId) {
  const listEl = document.getElementById("combo-items-list");
  if (!listEl) return;
  try {
    const res = await productApi.comboItems(productId);
    const items = res.data?.rows || res.data || [];
    state.comboItems[productId] = items;
    if (!items.length) {
      listEl.innerHTML = '<div style="font-style:italic;color:var(--muted);padding:12px 0">Chưa có thành phần nào. Nhấn "Thêm thành phần" để bắt đầu.</div>';
      return;
    }
    listEl.innerHTML = `
      <table class="admin-table admin-data-table" style="font-size:0.8125rem;">
        <thead><tr><th>Sản phẩm</th><th>Biến thể</th><th>SL</th><th>Đơn giá</th><th>Thao tác</th></tr></thead>
        <tbody>
          ${items.map(item => {
            const product = (state.allProducts || []).find(p => p.product_id === item.component_product_id);
            const variant = product?.variants?.find(v => v.variant_id === item.component_variant_id);
            const productName = product ? product.name : item.component_product_id;
            const variantInfo = variant ? `${variant.color || ""} ${variant.size || ""}`.trim() || "—" : "—";
            const itemPrice = product ? (product.sale_price ?? product.base_price) * (item.quantity || 1) : 0;
            return `<tr>
              <td><strong style="font-size:0.8125rem">${escapePromotionHtml(productName)}</strong><br><small style="color:var(--muted)">${escapePromotionHtml(product?.sku || "")}</small></td>
              <td>${escapePromotionHtml(variantInfo)}</td>
              <td>
                <input type="number" class="admin-form-control" style="width:60px;height:32px;font-size:0.75rem;padding:0 6px;" value="${escapePromotionHtml(item.quantity)}" min="1" data-combo-update-qty="${escapePromotionHtml(productId)}" data-item-id="${escapePromotionHtml(item.combo_item_id)}">
              </td>
              <td>${money(itemPrice)}</td>
              <td>
                <button class="admin-icon-button admin-icon-button--sm" data-combo-remove-item="${escapePromotionHtml(productId)}" data-item-id="${escapePromotionHtml(item.combo_item_id)}" title="Xóa thành phần">${icon("trash")}</button>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      <div style="margin-top:12px;padding:12px;background:var(--field-bg);border-radius:var(--radius-md);display:flex;justify-content:space-between;">
        <span style="color:var(--muted);font-size:0.8125rem;">Tổng cộng:</span>
        <strong style="font-size:0.875rem;">${items.reduce((sum, item) => {
          const product = (state.allProducts || []).find(p => p.product_id === item.component_product_id);
          return sum + (product ? (product.sale_price ?? product.base_price) * (item.quantity || 1) : 0);
        }, 0).toLocaleString("vi-VN")}đ</strong>
      </div>
    `;
  } catch (err) {
    listEl.innerHTML = `<div style="color:var(--error)">Lỗi tải thành phần: ${escapePromotionHtml(err.message)}</div>`;
  }
}

function editPromotionModal(id) {
  const row = state.promotions.find((item) => item.promo_id === id);
  if (!row) return;
  overlay.innerHTML = `<div class="admin-modal-overlay"><section class="admin-modal admin-modal--lg"><form data-promo-edit-form data-id="${escapePromotionHtml(id)}"><header class="admin-modal__header"><h2>Chỉnh sửa chiến dịch</h2><button class="admin-icon-button" type="button" data-promo-close>×</button></header><div class="admin-modal__body"><label class="admin-form-group"><span class="admin-form-label">Tên chiến dịch <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="name" value="${escapePromotionHtml(row.promo_name)}" required></label><label class="admin-form-group"><span class="admin-form-label">Mô tả</span><textarea class="admin-form-control admin-form-textarea" name="description">${escapePromotionHtml(row.description || "")}</textarea></label><label class="admin-form-group"><span class="admin-form-label">Ngân sách</span><input class="admin-form-control" name="budgetLimit" type="number" min="0" value="${escapePromotionHtml(row.budget_limit || 0)}"></label><input type="hidden" name="expectedVersion" value="${escapePromotionHtml(row.version)}"></div><footer class="admin-modal__footer"><button class="admin-btn admin-btn--ghost" type="button" data-promo-close>Hủy</button><button class="admin-btn admin-btn--secondary">Lưu thay đổi</button></footer></form></section></div>`;
}

function createModal(type) {
  const combo = type === "combo";
  const voucher = type === "vouchers";
  const categories = state.categories || [];
  if (combo) {
    overlay.innerHTML = `<div class="admin-modal-overlay"><section class="admin-modal admin-modal--lg"><form data-combo-create-form><header class="admin-modal__header"><h2>Tạo Combo mới</h2><button class="admin-icon-button" type="button" data-promo-close>×</button></header><div class="admin-modal__body"><label class="admin-form-group"><span class="admin-form-label">Tên combo <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="name" required placeholder="VD: Set Đầm Dạ Hội Rose" minlength="2" maxlength="255"></label><label class="admin-form-group"><span class="admin-form-label">Mã SKU <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="sku" required placeholder="VD: VLR-SD-001" pattern="[A-Z]{2,6}-[A-Z0-9]{2,20}(-[A-Z0-9]{1,10})*" title="VD: VLR-SD-001 (2-6 chữ cái HOA - 2-20 chữ số/chữ cái)"></label><label class="admin-form-group"><span class="admin-form-label">Danh mục <b style="color:var(--error)">*</b></span><select class="admin-form-control" name="categoryId" required><option value="">-- Chọn danh mục --</option>${categories.map(c => `<option value="${escapePromotionHtml(c.category_id)}"${c.slug === "set-do" ? " selected" : ""}>${escapePromotionHtml(c.name)}</option>`).join("")}</select></label><label class="admin-form-group"><span class="admin-form-label">Giá gốc (VNĐ) <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="basePrice" type="number" min="0" required></label><label class="admin-form-group"><span class="admin-form-label">Giá bán combo (VNĐ)</span><input class="admin-form-control" name="salePrice" type="number" min="0" placeholder="Để trống = giá gốc"></label><label class="admin-form-group"><span class="admin-form-label">Mô tả</span><textarea class="admin-form-control admin-form-textarea" name="description" placeholder="Mô tả combo..." maxlength="5000"></textarea></label><label class="admin-form-group"><span class="admin-form-label">Ảnh (URL)</span><input class="admin-form-control" name="images" placeholder="URL ảnh đại diện combo"></label><div style="padding:12px;background:var(--field-bg);border-radius:var(--radius-md);font-size:0.8125rem;color:var(--muted);margin-top:8px;"><strong>Lưu ý:</strong> Sau khi tạo combo, nhấn vào nút bút chì (✏️) để xem chi tiết và quản lý thành phần combo.</div></div><footer class="admin-modal__footer"><button class="admin-btn admin-btn--ghost" type="button" data-promo-close>Hủy</button><button class="admin-btn admin-btn--secondary">Tạo combo</button></footer></form></section></div>`;
    return;
  }
  overlay.innerHTML = `<div class="admin-modal-overlay"><section class="admin-modal admin-modal--lg"><form data-promo-form data-type="${voucher ? "voucher" : "promotion"}"><header class="admin-modal__header"><h2>${voucher ? "Tạo voucher" : "Tạo chiến dịch"}</h2><button class="admin-icon-button" type="button" data-promo-close>×</button></header><div class="admin-modal__body">${voucher ? `<label class="admin-form-group"><span class="admin-form-label">Mã code <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="primary" required placeholder="VD: SALE50"></label><label class="admin-form-group"><span class="admin-form-label">Tên voucher <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="name" required></label><label class="admin-form-group"><span class="admin-form-label">Chiến dịch áp dụng</span><select class="admin-form-control" name="promoId"><option value="">-- Không thuộc chiến dịch --</option>${state.promotions.map(p => `<option value="${escapePromotionHtml(p.promo_id)}">${escapePromotionHtml(p.promo_name)}</option>`).join("")}</select></label><label class="admin-form-group"><span class="admin-form-label">Loại giảm giá</span><select class="admin-form-control" name="kind"><option value="percentage">Theo phần trăm</option><option value="fixed_amount">Số tiền cố định</option><option value="free_shipping">Miễn phí vận chuyển</option></select></label><label class="admin-form-group"><span class="admin-form-label">Giá trị <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="value" type="number" min="0" required></label><label class="admin-form-group"><span class="admin-form-label">Giảm tối đa (VNĐ)</span><input class="admin-form-control" name="maxDiscount" type="number" min="0" placeholder="Để trống = không giới hạn"></label><label class="admin-form-group"><span class="admin-form-label">Đơn tối thiểu</span><input class="admin-form-control" name="minOrder" type="number" min="0" value="0"></label><label class="admin-form-group"><span class="admin-form-label">Giới hạn tổng lượt dùng</span><input class="admin-form-control" name="maxUses" type="number" min="0" placeholder="Để trống = không giới hạn"></label><label class="admin-form-group"><span class="admin-form-label">Giới hạn/người</span><input class="admin-form-control" name="maxPerUser" type="number" min="1" value="1"></label><label class="admin-form-group"><span class="admin-form-label">Danh mục áp dụng</span><select class="admin-form-control" name="applicableCategories"><option value="">-- Tất cả danh mục --</option>${state.categories.map(c => `<option value="${escapePromotionHtml(c.slug)}">${escapePromotionHtml(c.name)}</option>`).join("")}</select></label><label class="admin-form-group"><span class="admin-form-label">Nhóm khách hàng áp dụng</span><select class="admin-form-control" name="applicableUserGroup"><option value="all_users">Tất cả khách hàng</option><option value="new_users">Khách hàng mới</option><option value="vip_members">Thành viên VIP</option></select></label><label class="admin-form-group"><span class="admin-form-label">Ngày bắt đầu <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="start" type="datetime-local" required></label><label class="admin-form-group"><span class="admin-form-label">Ngày kết thúc <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="end" type="datetime-local" required></label>` : `<label class="admin-form-group"><span class="admin-form-label">Tên chiến dịch <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="primary" required></label><label class="admin-form-group"><span class="admin-form-label">Loại</span><select class="admin-form-control" name="kind"><option value="product_discount">Giảm giá sản phẩm</option><option value="combo_discount">Giảm giá Combo</option><option value="flash_sale">Flash Sale</option><option value="seasonal_sale">Giảm giá theo mùa</option></select></label><label class="admin-form-group"><span class="admin-form-label">Ngày bắt đầu <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="start" type="datetime-local" required></label><label class="admin-form-group"><span class="admin-form-label">Ngày kết thúc <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="end" type="datetime-local" required></label><label class="admin-form-group"><span class="admin-form-label">Ngân sách (VNĐ)</span><input class="admin-form-control" name="budget" type="number" min="0" value="0"></label>`}</div><footer class="admin-modal__footer"><button class="admin-btn admin-btn--ghost" type="button" data-promo-close>Hủy</button><button class="admin-btn admin-btn--secondary">Tạo mới</button></footer></form></section></div>`;
}

function addComboItemModal(productId) {
  const allProducts = state.allProducts || [];
  overlay.innerHTML = `<div class="admin-modal-overlay"><section class="admin-modal admin-modal--lg"><form data-combo-add-form data-product-id="${escapePromotionHtml(productId)}"><header class="admin-modal__header"><h2>Thêm thành phần combo</h2><button class="admin-icon-button" type="button" data-promo-close>×</button></header><div class="admin-modal__body"><label class="admin-form-group"><span class="admin-form-label">Chọn sản phẩm <b style="color:var(--error)">*</b></span><select class="admin-form-control" name="componentProductId" required><option value="">-- Chọn sản phẩm --</option>${allProducts.filter(p => !p.is_combo).map(p => `<option value="${escapePromotionHtml(p.product_id)}">${escapePromotionHtml(p.name)} (${escapePromotionHtml(p.sku)})</option>`).join("")}</select></label><label class="admin-form-group"><span class="admin-form-label">Chọn biến thể (nếu có)</span><select class="admin-form-control" name="componentVariantId"><option value="">-- Không chọn biến thể --</option></select></label><label class="admin-form-group"><span class="admin-form-label">Số lượng <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="quantity" type="number" min="1" value="1" required></label><div id="combo-add-preview" style="margin-top:12px;padding:12px;background:var(--field-bg);border-radius:var(--radius-md);display:none;"><strong>Xem trước:</strong> <span id="combo-add-preview-text"></span></div></div><footer class="admin-modal__footer"><button class="admin-btn admin-btn--ghost" type="button" data-promo-close>Hủy</button><button class="admin-btn admin-btn--secondary">Thêm vào combo</button></footer></form></section></div>`;
  const productSelect = overlay.querySelector("[name=componentProductId]");
  const variantSelect = overlay.querySelector("[name=componentVariantId]");
  const preview = overlay.querySelector("#combo-add-preview");
  const previewText = overlay.querySelector("#combo-add-preview-text");
  if (productSelect) {
    productSelect.addEventListener("change", async () => {
      const pid = productSelect.value;
      variantSelect.innerHTML = '<option value="">-- Không chọn biến thể --</option>';
      if (!pid) { preview.style.display = "none"; return; }
      const product = allProducts.find(p => p.product_id === pid);
      if (product) {
        preview.style.display = "block";
        previewText.textContent = `${product.name} - ${money(product.sale_price ?? product.base_price)}`;
        if (product.variants && product.variants.length) {
          product.variants.forEach(v => {
            variantSelect.innerHTML += `<option value="${escapePromotionHtml(v.variant_id)}">${escapePromotionHtml(v.color || "")} ${escapePromotionHtml(v.size || "")} (Tồn: ${v.stock_quantity || 0})</option>`;
          });
        }
      }
    });
  }
}

async function load() {
  panel.innerHTML = '<div class="admin-order-empty"><strong>Đang tải dữ liệu Supabase...</strong></div>';
  try {
    const [promotions, vouchers, bundles, logs, stats, allProducts, categories] = await Promise.all([
      pricingApi.listPromotions({ limit: 100 }),
      pricingApi.listVouchers({ limit: 100 }),
      productApi.list({ isCombo: true, limit: 100 }),
      pricingApi.auditLogs({ limit: 100 }),
      pricingApi.getStatistics().catch(() => null),
      productApi.list({ limit: 500 }).catch(() => ({ rows: [] })),
      productApi.categories().catch(() => [])
    ]);
    state.promotions = promotions.rows || [];
    state.vouchers = vouchers.rows || [];
    state.bundles = (bundles.rows || []).filter((row) => row.is_combo);
    state.logs = logs.rows || [];
    state.stats = stats;
    state.allProducts = allProducts.rows || [];
    state.categories = categories?.data?.rows || categories?.data || categories?.rows || (Array.isArray(categories) ? categories : []);
    state.comboItems = {};
    // Load combo items individually — tolerate errors for missing combo_item table
    await Promise.all(state.bundles.map(async (bundle) => {
      try {
        const res = await productApi.comboItems(bundle.product_id);
        state.comboItems[bundle.product_id] = res.data?.rows || res.data || [];
      } catch { state.comboItems[bundle.product_id] = []; }
    }));
    updateKpis(); render();
  } catch (error) {
    // Still render with whatever data we have
    state.comboItems = state.comboItems || {};
    updateKpis(); render();
    showToast(error.message || "Một số dữ liệu không thể tải", "error");
  }
}

document.addEventListener("click", async (event) => {
  const view = event.target.closest("[data-promo-view]");
  if (view) {
    state.view = view.dataset.promoView;
    state.logsPage = 1;
    state.comboPage = 1;
    document.querySelectorAll("[data-promo-view]").forEach((node) => node.classList.toggle("admin-tab--active", node === view));
    render();
  }

  const promoLogsPage = event.target.closest("[data-promo-logs-page]");
  if (promoLogsPage) {
    const page = Number(promoLogsPage.dataset.promoLogsPage);
    if (!Number.isNaN(page) && page > 0) { state.logsPage = page; render(); }
    return;
  }

  const comboPage = event.target.closest("[data-combo-page]");
  if (comboPage) {
    const page = Number(comboPage.dataset.comboPage);
    if (!Number.isNaN(page) && page > 0) { state.comboPage = page; render(); }
    return;
  }

  const detailButton = event.target.closest("[data-promo-detail]");
  if (detailButton) detail(...detailButton.dataset.promoDetail.split(":"));

  const editButton = event.target.closest("[data-promo-edit]");
  if (editButton) {
    const [type, id] = editButton.dataset.promoEdit.split(":");
    if (type === "promotion") editPromotionModal(id);
  }

  const modalButton = event.target.closest("[data-promo-modal]");
  if (modalButton) createModal(modalButton.dataset.promoModal);
  if (event.target.closest("[data-promo-close]")) overlay.innerHTML = "";

  const bundleToggle = event.target.closest("[data-bundle-toggle]");
  if (bundleToggle) {
    const productId = bundleToggle.dataset.bundleToggle;
    const row = state.bundles.find((item) => item.product_id === productId);
    if (row) {
      const newStatus = row.status === "on_sale" ? "hidden" : "on_sale";
      try {
        await productApi.changeStatus(productId, {
          status: newStatus,
          reason: newStatus === "hidden" ? "Tạm dừng hoạt động combo từ trang quản trị" : "Kích hoạt hoạt động combo từ trang quản trị",
          expectedVersion: row.version || 0
        });
        showToast(newStatus === "on_sale" ? "Đã kích hoạt hoạt động combo" : "Đã tạm dừng hoạt động combo", "success");
        await load();
        detail("bundle", productId);
      } catch (error) {
        showToast(error.message || "Không thể thay đổi trạng thái combo", "error");
      }
    }
    return;
  }

  const comboAddItem = event.target.closest("[data-combo-add-item]");
  if (comboAddItem) addComboItemModal(comboAddItem.dataset.comboAddItem);

  const comboRemoveItem = event.target.closest("[data-combo-remove-item]");
  if (comboRemoveItem) {
    const productId = comboRemoveItem.dataset.comboRemoveItem;
    const itemId = comboRemoveItem.dataset.itemId;
    if (!confirm("Xác nhận xóa thành phần này khỏi combo?")) return;
    try {
      await productApi.removeComboItem(productId, itemId);
      showToast("Đã xóa thành phần khỏi combo", "success");
      loadComboItems(productId);
      await load();
    } catch (error) { showToast(error.message || "Lỗi xóa thành phần", "error"); }
  }


  const toggle = event.target.closest("[data-promo-toggle]");
  if (toggle) {
    const row = state.promotions.find((item) => item.promo_id === toggle.dataset.promoToggle);
    if (!row) return;
    try {
      await (row.is_active ? pricingApi.pausePromotion(row.promo_id, { expectedVersion: row.version }) : pricingApi.activatePromotion(row.promo_id, { expectedVersion: row.version }));
      showToast(row.is_active ? "Đã tạm dừng chiến dịch" : "Đã kích hoạt chiến dịch", "success");
      await load();
    } catch (error) { showToast(error.message || "Không thể đổi trạng thái", "error"); }
  }

  const voucherToggle = event.target.closest("[data-voucher-toggle]");
  if (voucherToggle) {
    const voucherId = voucherToggle.dataset.voucherToggle;
    try {
      await pricingApi.toggleVoucher(voucherId);
      showToast("Đã cập nhật trạng thái voucher", "success");
      await load();
    } catch (error) { showToast(error.message || "Không thể đổi trạng thái voucher", "error"); }
  }
});

document.addEventListener("change", async (event) => {
  if (event.target.matches("[data-combo-update-qty]")) {
    const input = event.target;
    const productId = input.dataset.comboUpdateQty;
    const itemId = input.dataset.itemId;
    const quantity = Number(input.value);
    if (!Number.isInteger(quantity) || quantity < 1) { showToast("Số lượng không hợp lệ", "error"); return; }
    try {
      await productApi.updateComboItem(productId, itemId, { quantity });
      showToast("Đã cập nhật số lượng", "success");
    } catch (error) { showToast(error.message || "Lỗi cập nhật", "error"); }
  }
});

document.addEventListener("submit", async (event) => {
  if (event.target.matches("[data-promo-form]")) {
    event.preventDefault(); const form = event.target;
    const submitBtn = form.querySelector("button[class*='secondary']");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Đang xử lý..."; }
    try {
      if (form.dataset.type === "promotion") {
        await pricingApi.createPromotion({
          name: form.elements.primary.value.trim(),
          type: form.elements.kind.value,
          startDate: new Date(form.elements.start.value).toISOString(),
          endDate: new Date(form.elements.end.value).toISOString(),
          budgetLimit: Number(form.elements.budget?.value || 0)
        });
        showToast("Tạo chiến dịch thành công!", "success");
      } else {
        await pricingApi.createVoucher({
          code: form.elements.primary.value.trim().toUpperCase(),
          name: form.elements.name.value.trim(),
          promoId: form.elements.promoId.value || null,
          type: form.elements.kind.value,
          value: Number(form.elements.value.value),
          maxDiscount: form.elements.maxDiscount?.value ? Number(form.elements.maxDiscount.value) : null,
          minOrderValue: Number(form.elements.minOrder?.value || 0),
          maxUses: Number(form.elements.maxUses?.value) || null,
          maxPerUser: Number(form.elements.maxPerUser?.value || 1),
          applicableCategories: form.elements.applicableCategories?.value || null,
          applicableUserGroup: form.elements.applicableUserGroup?.value || "all_users",
          startDate: new Date(form.elements.start.value).toISOString(),
          endDate: new Date(form.elements.end.value).toISOString()
        });
        showToast("Tạo voucher thành công!", "success");
      }
      overlay.innerHTML = ""; await load();
    } catch (error) {
      showToast(error.message || "Không thể tạo dữ liệu", "error");
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Tạo mới"; }
    }
    return;
  }

  if (event.target.matches("[data-combo-create-form]")) {
    event.preventDefault(); const form = event.target;
    const submitBtn = form.querySelector("button[class*='secondary']");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Đang tạo..."; }
    try {
      const name = form.elements.name.value.trim();
      const slug = name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const sku = form.elements.sku.value.trim().toUpperCase();
      const categoryId = form.elements.categoryId.value;
      const basePrice = Number(form.elements.basePrice.value);
      const salePrice = form.elements.salePrice.value ? Number(form.elements.salePrice.value) : basePrice;
      const images = form.elements.images.value.trim() ? [form.elements.images.value.trim()] : [];
      const description = form.elements.description.value.trim() || null;
      await productApi.create({
        sku,
        name,
        slug,
        description,
        categoryId,
        basePrice,
        salePrice,
        images,
        isCombo: true,
        status: "on_sale",
        expectedVersion: 0
      });
      overlay.innerHTML = "";
      showToast("Tạo combo thành công! Nhấn vào combo để thêm thành phần.", "success");
      await load();
    } catch (error) {
      showToast(error.message || "Không thể tạo combo", "error");
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Tạo combo"; }
    }
    return;
  }

  if (event.target.matches("[data-promo-edit-form]")) {
    event.preventDefault(); const form = event.target;
    const promoId = form.dataset.id;
    const submitBtn = form.querySelector("button[class*='secondary']");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Đang lưu..."; }
    try {
      await pricingApi.updatePromotion(promoId, {
        name: form.elements.name.value.trim(),
        description: form.elements.description.value.trim(),
        budgetLimit: Number(form.elements.budgetLimit.value || 0),
        expectedVersion: Number(form.elements.expectedVersion.value)
      });
      overlay.innerHTML = "";
      showToast("Cập nhật chiến dịch thành công!", "success");
      await load();
    } catch (error) {
      showToast(error.message || "Không thể cập nhật", "error");
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Lưu thay đổi"; }
    }
    return;
  }

  if (event.target.matches("[data-combo-add-form]")) {
    event.preventDefault(); const form = event.target;
    const productId = form.dataset.productId;
    const submitBtn = form.querySelector("button[class*='secondary']");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Đang thêm..."; }
    try {
      await productApi.addComboItem(productId, {
        componentProductId: form.elements.componentProductId.value.trim(),
        componentVariantId: form.elements.componentVariantId.value.trim() || null,
        quantity: Number(form.elements.quantity.value)
      });
      overlay.innerHTML = "";
      showToast("Đã thêm thành phần vào combo!", "success");
      loadComboItems(productId);
      await load();
    } catch (error) {
      showToast(error.message || "Không thể thêm thành phần", "error");
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Thêm"; }
    }
  }
});

document.querySelector("[data-promo-export]")?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ promotions: state.promotions, vouchers: state.vouchers, bundles: state.bundles, statistics: state.stats }, null, 2)], { type: "application/json" });
  const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "velura-promotions.json" });
  link.click(); URL.revokeObjectURL(link.href);
  showToast("Đã xuất báo cáo", "success");
});

load();
