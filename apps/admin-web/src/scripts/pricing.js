import adminIconsUrl from "../assets/icons/admin-icons.svg?url";
import { productApi } from "./product-api.js";
import { pricingApi } from "./pricing-api.js";

const state = { products: [], history: [], filtered: [], currentPage: 1, itemsPerPage: 10, filters: { q: "", category: "", status: "" } };
const panel = document.querySelector("#pricing-panel");
const overlay = document.querySelector("#pricing-overlay");
const toast = document.querySelector("#pricing-toast");

export function escapePricingHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}
function icon(name) { return `<svg class="admin-line-icon"><use href="${adminIconsUrl}#${escapePricingHtml(name)}"></use></svg>`; }
function money(value) { return Number(value || 0).toLocaleString("vi-VN") + "đ"; }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(date); }
function discount(row) { const base = Number(row.base_price || 0); const sale = Number(row.sale_price ?? base); return base > sale && base > 0 ? Math.round((base - sale) * 100 / base) : 0; }
function discountFromPrices(basePrice, salePrice) { return basePrice > salePrice && basePrice > 0 ? Math.round((basePrice - salePrice) * 100 / basePrice) : 0; }
function pricePreviewMarkup(basePrice, salePrice) {
  const pct = discountFromPrices(basePrice, salePrice);
  const baseLabel = pct > 0 ? `<s class="admin-price-old">${money(basePrice)}</s>` : `<b class="admin-price-current">${money(basePrice)}</b>`;
  const warning = salePrice > basePrice ? '<span class="admin-price-warning">Giá bán không được cao hơn giá gốc.</span>' : "";
  return `<strong>Xem trước</strong><span>Giá gốc: ${baseLabel}</span><span>Giá bán: <b class="admin-price-current">${money(salePrice)}</b></span><span>Giảm: <b class="admin-price-discount">${pct > 0 ? `-${pct}%` : "0%"}</b></span>${warning}`;
}

function showToast(message, type = "success") {
  if (!toast) return;
  toast.textContent = message;
  toast.className = `admin-toast admin-toast--${type}`;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { toast.hidden = true; }, 3000);
}

function updateKpis() {
  const values = [state.products.length, state.products.filter((p) => p.sale_price == null).length, state.products.filter((p) => discount(p) > 0).length, state.products.filter((p) => Number(p.sale_price) > Number(p.base_price)).length];
  document.querySelector("#pricing-kpis").innerHTML = values.map((value, index) => `<article class="admin-kpi-card"><div class="admin-kpi-card__head"><p class="admin-kpi-card__label">${["Sản phẩm", "Thiếu giá bán", "Đang giảm giá", "Cần kiểm tra"][index]}</p><span class="admin-kpi-card__icon">${icon(index > 1 ? "alert" : "tag")}</span></div><strong class="admin-kpi-card__value">${value}</strong></article>`).join("");
}
function filters() {
  const categories = [...new Set(state.products.map((p) => p.category?.name).filter(Boolean))];
  const q = state.filters.q || "";
  const cat = state.filters.category || "";
  const stat = state.filters.status || "";
  return `<form class="admin-filter-bar admin-order-filter-bar" data-pricing-filter><label class="admin-search-field">${icon("search")}<input class="admin-form-control" name="q" value="${escapePricingHtml(q)}" placeholder="Tìm SKU hoặc tên sản phẩm"></label><select class="admin-form-control" name="category"><option value="">Tất cả danh mục</option>${categories.map((value) => `<option ${value === cat ? "selected" : ""}>${escapePricingHtml(value)}</option>`).join("")}</select><select class="admin-form-control" name="status"><option value="">Tất cả trạng thái giá</option><option value="discount" ${stat === "discount" ? "selected" : ""}>Đang giảm giá</option><option value="invalid" ${stat === "invalid" ? "selected" : ""}>Cần kiểm tra</option><option value="missing" ${stat === "missing" ? "selected" : ""}>Thiếu giá bán</option></select><div class="admin-filter-bar__actions"><button class="admin-btn admin-btn--filter admin-btn--sm" type="submit">Lọc</button><button class="admin-btn admin-btn--ghost admin-btn--sm" type="reset">Đặt lại</button></div></form>`;
}
function pagination() {
  const totalItems = state.filtered.length;
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (totalPages <= 1) return "";
  let buttons = "";
  buttons += `<button type="button" data-price-page="${state.currentPage - 1}" ${state.currentPage === 1 ? "disabled" : ""}>&lt;</button>`;
  for (let i = 1; i <= totalPages; i++) {
    buttons += `<button type="button" class="${state.currentPage === i ? "is-active" : ""}" data-price-page="${i}">${i}</button>`;
  }
  buttons += `<button type="button" data-price-page="${state.currentPage + 1}" ${state.currentPage === totalPages ? "disabled" : ""}>&gt;</button>`;
  return `<div class="admin-pagination">${buttons}</div>`;
}
function table() {
  if (!state.filtered.length) return '<div class="admin-order-empty"><strong>Không có sản phẩm phù hợp</strong><span>Dữ liệu được tải trực tiếp từ Supabase.</span></div>';
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const end = start + state.itemsPerPage;
  const pagedRows = state.filtered.slice(start, end);
  return `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá gốc</th><th>Giá bán</th><th>Giảm</th><th>Trạng thái</th><th>Cập nhật</th><th>Thao tác</th></tr></thead><tbody>${pagedRows.map((row) => { const d = discount(row); const isInvalid = Number(row.sale_price) > Number(row.base_price); return `<tr><td><strong>${escapePricingHtml(row.name)}</strong><small class="admin-order-subtext">${escapePricingHtml(row.sku)}</small></td><td>${escapePricingHtml(row.category?.name || "-")}</td><td>${money(row.base_price)}</td><td class="${isInvalid ? "admin-price-discount" : ""}">${money(row.sale_price ?? row.base_price)}${isInvalid ? ' <small title="Giá bán > Giá gốc">⚠</small>' : ""}</td><td>${d > 0 ? `<span class="admin-badge admin-badge--info">-${d}%</span>` : d === 0 && row.sale_price != null ? "0%" : "-"}</td><td><span class="admin-badge admin-badge--${row.status === "on_sale" ? "success" : "warning"}">${escapePricingHtml(row.status === "on_sale" ? "Đang bán" : "Tạm ẩn")}</span></td><td>${escapePricingHtml(formatDate(row.updated_at))}</td><td><div class="admin-table-actions"><button class="admin-icon-button admin-icon-button--sm" data-price-detail="${escapePricingHtml(row.product_id)}" title="Chi tiết">${icon("eye")}</button><button class="admin-icon-button admin-icon-button--sm" data-price-change="${escapePricingHtml(row.product_id)}" title="Cập nhật giá">${icon("edit")}</button></div></td></tr>`; }).join("")}</tbody></table></div><div class="admin-card__footer" style="display:flex; justify-content:space-between; align-items:center; width:100%;"><p class="admin-table-note">Hiển thị ${start + 1} - ${Math.min(end, state.filtered.length)} / ${state.filtered.length} sản phẩm</p>${pagination()}</div>`;
}
function render() { panel.innerHTML = `${filters()}${table()}`; }
function historyView() {
  panel.innerHTML = `<div class="admin-filter-bar"><button class="admin-btn admin-btn--outline admin-btn--sm" data-price-back>Quay lại</button></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Thời gian</th><th>Sản phẩm</th><th>Giá gốc cũ</th><th>Giá gốc mới</th><th>Giá bán cũ</th><th>Giá bán mới</th><th>Lý do</th><th>Người sửa</th></tr></thead><tbody>${state.history.length ? state.history.map((row) => `<tr><td>${escapePricingHtml(formatDate(row.changed_at))}</td><td>${escapePricingHtml(row.product_id)}</td><td>${money(row.old_base_price)}</td><td>${money(row.new_base_price)}</td><td>${money(row.old_sale_price)}</td><td>${money(row.new_sale_price)}</td><td>${escapePricingHtml(row.reason)}</td><td>${escapePricingHtml(row.changed_by)}</td></tr>`).join("") : '<tr><td colspan="8">Chưa có lịch sử thay đổi giá</td></tr>'}</tbody></table></div>`;
}
function detail(id) {
  const row = state.products.find((p) => p.product_id === id); if (!row) return;
  const d = discount(row);
  overlay.innerHTML = `<div class="admin-drawer-backdrop" data-price-close></div><aside class="admin-drawer admin-drawer--wide"><header class="admin-drawer__header"><div><p class="admin-product-code">${escapePricingHtml(row.sku)}</p><h2>${escapePricingHtml(row.name)}</h2></div><button class="admin-icon-button" data-price-close>×</button></header><div class="admin-drawer__body"><dl class="admin-data-list"><div><dt>Giá gốc</dt><dd>${money(row.base_price)}</dd></div><div><dt>Giá bán</dt><dd>${money(row.sale_price ?? row.base_price)}</dd></div><div><dt>Phần trăm giảm</dt><dd>${d > 0 ? `<span class="admin-badge admin-badge--info">-${d}%</span>` : "0%"}</dd></div><div><dt>Số biến thể</dt><dd>${row.variants?.length || 0}</dd></div><div><dt>Phiên bản</dt><dd>${escapePricingHtml(row.version)}</dd></div><div><dt>Trạng thái</dt><dd><span class="admin-badge admin-badge--${row.status === "on_sale" ? "success" : "warning"}">${row.status === "on_sale" ? "Đang bán" : "Tạm ẩn"}</span></dd></div></dl>${Number(row.sale_price) > Number(row.base_price) ? '<div class="admin-note admin-note--warning" style="margin-top:16px;">⚠ Giá bán đang cao hơn giá gốc. Vui lòng kiểm tra lại.</div>' : ""}</div></aside>`;
}
function changeModal(id) {
  const row = state.products.find((p) => p.product_id === id); if (!row) return;
  const basePrice = Number(row.base_price || 0);
  const currentSale = Number(row.sale_price ?? row.base_price);
  overlay.innerHTML = `<div class="admin-modal-overlay"><section class="admin-modal admin-price-modal"><form data-price-form data-id="${escapePricingHtml(id)}"><header class="admin-modal__header"><h2>Cập nhật giá - ${escapePricingHtml(row.sku)}</h2><button class="admin-icon-button" type="button" data-price-close>×</button></header><div class="admin-modal__body"><div class="admin-price-form-grid"><label class="admin-form-group"><span class="admin-form-label">Giá gốc hiện tại</span><input class="admin-form-control" value="${money(basePrice)}" disabled></label><label class="admin-form-group"><span class="admin-form-label">Giá bán hiện tại</span><input class="admin-form-control" value="${money(currentSale)}" disabled></label><label class="admin-form-group"><span class="admin-form-label">Giá gốc mới <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="basePrice" type="number" min="0" value="${escapePricingHtml(basePrice)}" required data-base-price-input></label><label class="admin-form-group"><span class="admin-form-label">Giá bán mới <b style="color:var(--error)">*</b></span><input class="admin-form-control" name="salePrice" type="number" min="0" value="${escapePricingHtml(currentSale)}" required data-sale-price-input></label><div class="admin-price-preview admin-price-field--full" id="price-preview">${pricePreviewMarkup(basePrice, currentSale)}</div><label class="admin-form-group admin-price-field--full"><span class="admin-form-label">Lý do <b style="color:var(--error)">*</b></span><textarea class="admin-form-control admin-form-textarea" name="reason" minlength="10" required placeholder="Nhập lý do thay đổi giá (tối thiểu 10 ký tự)"></textarea></label></div></div><footer class="admin-modal__footer"><button class="admin-btn admin-btn--ghost" type="button" data-price-close>Hủy</button><button class="admin-btn admin-btn--secondary">Xác nhận</button></footer></form></section></div>`;
  const baseInput = overlay.querySelector("[data-base-price-input]");
  const saleInput = overlay.querySelector("[data-sale-price-input]");
  const updatePreview = () => {
    const nextBasePrice = Number(baseInput?.value || 0);
    const nextSalePrice = Number(saleInput?.value || 0);
    const preview = overlay.querySelector("#price-preview");
    if (preview) preview.innerHTML = pricePreviewMarkup(nextBasePrice, nextSalePrice);
  };
  baseInput?.addEventListener("input", updatePreview);
  saleInput?.addEventListener("input", updatePreview);
}
async function load() {
  panel.innerHTML = '<div class="admin-order-empty"><strong>Đang tải giá từ Supabase...</strong></div>';
  try {
    const [productsResult, historyResult] = await Promise.all([productApi.list({ limit: 100 }), pricingApi.listPriceHistory({ limit: 100 })]);
    state.products = productsResult.rows || []; state.filtered = [...state.products]; state.history = historyResult.rows || [];
    state.currentPage = 1;
    updateKpis(); render();
  } catch (error) { panel.innerHTML = `<div class="admin-order-empty"><strong>${escapePricingHtml(error.message || "Không thể tải dữ liệu")}</strong></div>`; }
}
document.addEventListener("click", (event) => {
  const detailButton = event.target.closest("[data-price-detail]"); if (detailButton) detail(detailButton.dataset.priceDetail);
  const changeButton = event.target.closest("[data-price-change]"); if (changeButton) changeModal(changeButton.dataset.priceChange);
  if (event.target.closest("[data-price-close]")) overlay.innerHTML = "";
  if (event.target.closest("[data-pricing-open-logs]")) historyView();
  if (event.target.closest("[data-price-back]")) render();
  if (event.target.closest("[data-pricing-refresh]")) load();
  
  const pageButton = event.target.closest("[data-price-page]");
  if (pageButton) {
    const pageNum = Number(pageButton.dataset.pricePage);
    if (!Number.isNaN(pageNum) && pageNum >= 1) {
      state.currentPage = pageNum;
      render();
    }
  }
});
document.addEventListener("submit", async (event) => {
  if (event.target.matches("[data-pricing-filter]")) {
    event.preventDefault();
    const data = new FormData(event.target);
    const q = String(data.get("q") || "").trim();
    const category = String(data.get("category") || "");
    const status = String(data.get("status") || "");
    state.filters = { q, category, status };
    
    const qLower = q.toLowerCase();
    state.filtered = state.products.filter((row) => 
      (!qLower || `${row.name} ${row.sku}`.toLowerCase().includes(qLower)) && 
      (!category || row.category?.name === category) && 
      (!status || 
        (status === "discount" && discount(row) > 0) || 
        (status === "invalid" && Number(row.sale_price) > Number(row.base_price)) || 
        (status === "missing" && row.sale_price == null)
      )
    );
    state.currentPage = 1;
    render();
    
    const input = panel.querySelector("input[name='q']");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
    return;
  }
  if (!event.target.matches("[data-price-form]")) return;
  event.preventDefault(); const row = state.products.find((p) => p.product_id === event.target.dataset.id);
  const submitBtn = event.target.querySelector("button[class*='secondary']");
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Đang xử lý..."; }
  try {
    const newBasePrice = Number(event.target.elements.basePrice.value);
    const newSalePrice = Number(event.target.elements.salePrice.value);
    if (!Number.isFinite(newBasePrice) || !Number.isFinite(newSalePrice) || newBasePrice < 0 || newSalePrice < 0) {
      throw new Error("Giá gốc và giá bán phải là số không âm");
    }
    if (newSalePrice > newBasePrice) {
      throw new Error("Giá bán không được cao hơn giá gốc");
    }
    await pricingApi.changePrice(row.product_id, { newBasePrice, newSalePrice, reason: event.target.elements.reason.value.trim(), expectedVersion: row.version });
    overlay.innerHTML = "";
    showToast("Cập nhật giá thành công!", "success");
    await load();
  } catch (error) {
    showToast(error.message || "Không thể cập nhật giá", "error");
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Xác nhận"; }
  }
});
document.addEventListener("reset", (event) => { if (event.target.matches("[data-pricing-filter]")) { state.filters = { q: "", category: "", status: "" }; setTimeout(() => { state.filtered = [...state.products]; state.currentPage = 1; render(); }); } });
document.querySelector("[data-pricing-export]")?.addEventListener("click", () => { const blob = new Blob([JSON.stringify(state.filtered, null, 2)], { type: "application/json" }); const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "velura-pricing.json" }); link.click(); URL.revokeObjectURL(link.href); });

load();
