import { apiRequest } from "./api.js";
import { CONFIG } from "../config.js";

export function initReturnRequest() {
  const returnPage = document.querySelector(".return-request-page");
  if (!returnPage) return;

  const urlParams = new URLSearchParams(window.location.search);
  const orderIdFromUrl = urlParams.get("orderId");

  const orderSelectorArea = document.getElementById("js-order-selector-area");
  const productSelectionList = document.getElementById("js-product-selection-list");
  const hiddenOrderInput = document.getElementById("js-hidden-order-id");
  const orderDropdownArea = document.getElementById("js-order-dropdown-area");
  const orderLockedArea = document.getElementById("js-order-locked-area");
  const returnForm = document.getElementById("returnForm");
  const fileInput = document.getElementById("fileInput");
  const filePreviewList = document.getElementById("filePreviewList");
  const maxFiles = 5;
  let uploadedFiles = [];
  let currentOrder = null;
  let allOrdersList = [];

  // ──────────────────────────────────────────────────
  // 1. ORDER CONTEXT DETECTION & LOADING
  // ──────────────────────────────────────────────────

  if (orderIdFromUrl) {
    handleLockedOrder(orderIdFromUrl);
  } else {
    handleOrderSelection();
  }

  function handleLockedOrder(orderId) {
    if (orderDropdownArea) orderDropdownArea.style.display = "none";
    if (orderLockedArea) {
      orderLockedArea.style.display = "block";
      orderLockedArea.innerHTML = `<div style="padding: 16px 0; color: var(--soft);">Đang tải chi tiết đơn hàng...</div>`;
    }

    apiRequest(`/api/user/orders/${orderId}`)
      .then(order => {
        currentOrder = order;
        if (hiddenOrderInput) hiddenOrderInput.value = order.order_id;
        renderLockedOrder(order);
        renderProductsForOrder(order);
      })
      .catch(err => {
        if (orderLockedArea) {
          orderLockedArea.innerHTML = `
            <div class="return-notice return-notice--warning">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Không tìm thấy đơn hàng hoặc lỗi: <strong>${err.message}</strong></span>
            </div>
          `;
        }
      });
  }

  function renderLockedOrder(order) {
    if (!orderLockedArea) return;
    const trackingCode = order.tracking_code || order.order_id.slice(0, 8).toUpperCase();
    const dateObj = new Date(order.created_at);
    const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
    const statusLabels = {
      pending: "Chờ xác nhận",
      shipping: "Đang giao",
      delivered: "Hoàn thành",
      cancelled: "Đã hủy"
    };
    const statusLabel = statusLabels[order.status] || order.status;

    orderLockedArea.innerHTML = `
      <div class="return-order-locked">
        <div class="return-order-locked__info">
          <div class="return-order-locked__detail">
            <strong>Đơn hàng #${trackingCode}</strong>
            <span>Ngày đặt: ${formattedDate} • ${order.items?.length || 0} sản phẩm</span>
          </div>
          <span class="return-order-locked__badge return-order-locked__badge--${order.status}">${statusLabel}</span>
        </div>
        <div class="return-order-locked__lock-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
      </div>
    `;
  }

  function handleOrderSelection() {
    if (orderDropdownArea) orderDropdownArea.style.display = "block";
    if (orderLockedArea) orderLockedArea.style.display = "none";

    const orderList = document.getElementById("js-order-selection-list");
    if (!orderList) return;

    orderList.innerHTML = `<div style="padding: 16px 0; color: var(--soft);">Đang tải danh sách đơn hàng...</div>`;

    apiRequest("/api/user/orders")
      .then(data => {
        allOrdersList = data.orders || [];
        // Only allow returns on delivered/completed orders within 48 hours of delivery
        const deliverOrders = allOrdersList.filter(o => {
          if (o.status !== "delivered" && o.status !== "completed") return false;
          
          const deliveryDate = o.delivered_at ? new Date(o.delivered_at) : new Date(o.updated_at || o.created_at);
          const now = new Date();
          const diffMs = now - deliveryDate;
          const diffHours = diffMs / (1000 * 60 * 60);
          return diffHours <= 48;
        });

        if (deliverOrders.length === 0) {
          orderList.innerHTML = `
            <div style="padding: 24px 0; text-align: center; color: var(--soft);">
              Không có đơn hàng nào đủ điều kiện đổi trả (chỉ áp dụng cho đơn hàng Hoàn thành).
            </div>
          `;
          return;
        }

        orderList.innerHTML = "";
        deliverOrders.forEach((order, index) => {
          const trackingCode = order.tracking_code || order.order_id.slice(0, 8).toUpperCase();
          const dateObj = new Date(order.created_at);
          const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
          const count = (order.items || []).reduce((acc, cur) => acc + cur.quantity, 0);

          const card = document.createElement("div");
          card.className = "selection-card" + (index === 0 ? " is-selected" : "");
          card.setAttribute("data-type", "order");
          card.setAttribute("data-id", order.order_id);
          card.innerHTML = `
            <div class="selection-card__content">
              <strong>Đơn hàng #${trackingCode}</strong>
              <span>Ngày đặt: ${formattedDate} • ${count} sản phẩm</span>
            </div>
            <div class="radio-indicator">
              <div class="radio-indicator__inner"></div>
            </div>
            <input type="radio" name="order_select" value="${order.order_id}" ${index === 0 ? "checked" : ""} style="display:none;" />
          `;
          orderList.appendChild(card);
        });

        // Select first order by default
        if (deliverOrders.length > 0) {
          currentOrder = deliverOrders[0];
          if (hiddenOrderInput) hiddenOrderInput.value = currentOrder.order_id;
          renderProductsForOrder(currentOrder);
        }

        bindSelectionCards(orderList, "order");
      })
      .catch(err => {
        orderList.innerHTML = `<div style="padding: 16px 0; color: #d9534f;">Lỗi: ${err.message}</div>`;
      });
  }

  // ──────────────────────────────────────────────────
  // 2. PRODUCT SELECTION RENDERING & ELIGIBILITY CHECK (RET-01)
  // ──────────────────────────────────────────────────

  function checkReturnEligibility(order) {
    const errorNoticeId = "js-return-eligibility-error";
    const existingNotice = document.getElementById(errorNoticeId);
    if (existingNotice) existingNotice.remove();

    // Enable all form elements by default
    toggleFormElements(true);

    if (!order) return true;

    // Check RET-01: 2-day return policy
    const deliveryDate = order.delivered_at ? new Date(order.delivered_at) : new Date(order.updated_at);
    const now = new Date();
    const diffMs = now - deliveryDate;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours > 48) {
      // Create a warning notice banner
      const notice = document.createElement("div");
      notice.id = errorNoticeId;
      notice.className = "return-notice return-notice--warning";
      notice.style.cssText = "margin-bottom: 24px; padding: 16px; background-color: #fdf2f2; border: 1px solid #f8b4b4; border-radius: 6px; color: #9b1c1c; display: flex; align-items: center; gap: 12px; font-size: 0.9375rem;";
      notice.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span><strong>Không đủ điều kiện đổi trả:</strong> Đơn hàng này đã được giao hơn 2 ngày (vào lúc ${deliveryDate.toLocaleString("vi-VN")}). Theo chính sách của Velura, yêu cầu đổi/trả chỉ được chấp nhận trong vòng 2 ngày kể từ khi nhận hàng.</span>
      `;

      // Insert at the top of Section 2 or product selection area
      if (productSelectionList) {
        productSelectionList.parentNode.insertBefore(notice, productSelectionList);
      }

      // Disable all form elements
      toggleFormElements(false);
      return false;
    }

    return true;
  }

  function toggleFormElements(enabled) {
    if (!returnForm) return;
    const inputs = returnForm.querySelectorAll("input, select, textarea, button:not(.btn-cancel):not(#btn-back-orders)");
    inputs.forEach(el => {
      if (enabled) {
        el.removeAttribute("disabled");
      } else {
        el.setAttribute("disabled", "true");
      }
    });

    const submitBtn = returnForm.querySelector(".btn-submit");
    if (submitBtn) {
      if (enabled) {
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
      } else {
        submitBtn.style.opacity = "0.5";
        submitBtn.style.cursor = "not-allowed";
      }
    }
  }

  async function renderProductsForOrder(order) {
    if (!productSelectionList) return;
    productSelectionList.innerHTML = `<div style="padding: 16px 0; color: var(--soft);">Đang kiểm tra thông tin sản phẩm...</div>`;

    const isEligible = checkReturnEligibility(order);

    const items = order.items || [];
    if (items.length === 0) {
      productSelectionList.innerHTML = `<div style="padding: 16px 0; color: var(--soft);">Đơn hàng không có sản phẩm.</div>`;
      return;
    }

    // Fetch existing returns for this order to disable already returned items
    let existingReturns = [];
    try {
      const returnData = await apiRequest(`/api/user/returns?order_id=${order.order_id}`);
      if (returnData && returnData.returns) {
        existingReturns = returnData.returns.filter(r => r.status !== "rejected");
      }
    } catch (err) {
      console.warn("Could not fetch existing returns:", err);
    }

    productSelectionList.innerHTML = "";

    items.forEach((item, index) => {
      // Calculate how many have already been returned
      let returnedQty = 0;
      existingReturns.forEach(r => {
        const matchedItem = (r.items || []).find(ri => ri.order_item_id === item.item_id);
        if (matchedItem) {
          returnedQty += matchedItem.quantity;
        }
      });

      const remainingQty = item.quantity - returnedQty;
      const isAlreadyReturned = remainingQty <= 0;

      const priceFormatted = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(item.unit_price);
      const isRestricted = item.category_name === "Phụ kiện";
      
      const isDisabled = isRestricted || isAlreadyReturned || !isEligible;

      const card = document.createElement("div");
      card.className = "selection-card" + (index === 0 && !isDisabled ? " is-selected" : "");
      if (isDisabled) {
        card.className += " selection-card--disabled";
        card.style.opacity = "0.6";
        card.style.cursor = "not-allowed";
      }
      card.setAttribute("data-type", "product");
      card.innerHTML = `
        <div class="selection-card__product-info">
          <div class="product-img-wrapper">
            <img src="${item.product_image || '/src/assets/images/placeholder.jpg'}" alt="${item.product_name}" />
          </div>
          <div class="product-details">
            <strong>${item.product_name}</strong>
            ${isRestricted ? `<span style="color: #c92a2a; font-weight: bold; font-size: 0.8125rem; display: block; margin-top: 4px;">(Danh mục hạn chế đổi trả)</span>` : ""}
            ${isAlreadyReturned ? `<span style="color: #b56727; font-weight: bold; font-size: 0.8125rem; display: block; margin-top: 4px;">(Đang trong quá trình xử lý Đổi/Trả)</span>` : ""}
            <span>Số lượng có thể đổi/trả: ${remainingQty} / ${item.quantity}</span>
            <span class="product-price">${priceFormatted}</span>
          </div>
        </div>
        ${!isDisabled ? `
        <div class="checkbox-indicator">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <input type="checkbox" name="product_select" value="${item.item_id}" data-qty="${remainingQty}" ${index === 0 && !isDisabled ? "checked" : ""} style="display:none;" />
        ` : `
        <input type="checkbox" name="product_select" value="${item.item_id}" data-qty="0" disabled style="display:none;" />
        `}
      `;
      productSelectionList.appendChild(card);
    });

    bindSelectionCards(productSelectionList, "product");
  }

  // ──────────────────────────────────────────────────
  // 3. SELECTION CARD INTERACTION (Radio / Checkbox)
  // ──────────────────────────────────────────────────

  function bindSelectionCards(container, type) {
    const cards = container.querySelectorAll(".selection-card");
    cards.forEach(card => {
      card.addEventListener("click", () => {
        const input = card.querySelector("input");
        if (input && input.disabled) return; // Prevent interaction if disabled

        if (type === "order" || type === "method") {
          // Radio behavior
          const siblings = container.querySelectorAll(`[data-type="${type}"]`);
          siblings.forEach(c => {
            c.classList.remove("is-selected");
            const si = c.querySelector("input");
            if (si) si.checked = false;
          });
          card.classList.add("is-selected");
          if (input) input.checked = true;

          // If order changed, update products
          if (type === "order" && input) {
            const selectedOrder = allOrdersList.find(o => o.order_id === input.value);
            if (selectedOrder) {
              currentOrder = selectedOrder;
              if (hiddenOrderInput) hiddenOrderInput.value = selectedOrder.order_id;
              renderProductsForOrder(selectedOrder);
            }
          }
        } else if (type === "product") {
          // Checkbox behavior
          const isSelected = card.classList.toggle("is-selected");
          if (input) input.checked = isSelected;
        }
      });
    });
  }

  // Bind method selection cards (already in HTML)
  const methodList = document.querySelector(".method-selection-list");
  if (methodList) {
    bindSelectionCards(methodList, "method");
    
    // Add logic for exchange options
    const exchangeOptionsContainer = document.getElementById("exchange-options-container");
    if (exchangeOptionsContainer) {
      const methodCards = methodList.querySelectorAll(".selection-card[data-type='method']");
      methodCards.forEach(card => {
        card.addEventListener("click", () => {
          const input = card.querySelector("input");
          if (input && input.value === "exchange") {
            exchangeOptionsContainer.style.display = "block";
          } else {
            exchangeOptionsContainer.style.display = "none";
          }
        });
      });
      
      // Also check initial state
      const initialMethod = methodList.querySelector("input:checked");
      if (initialMethod && initialMethod.value === "exchange") {
        exchangeOptionsContainer.style.display = "block";
      }
    }
  }

  // Handle exchange needs checkboxes
  const exchangeCheckboxes = document.querySelectorAll('input[name="exchange_needs"]');
  exchangeCheckboxes.forEach(checkbox => {
    checkbox.addEventListener("change", (e) => {
      const val = e.target.value;
      const isChecked = e.target.checked;
      
      if (val === "size") {
        const group = document.getElementById("exchange-size-group");
        if (group) group.style.display = isChecked ? "block" : "none";
      } else if (val === "color") {
        const group = document.getElementById("exchange-color-group");
        if (group) group.style.display = isChecked ? "block" : "none";
      } else if (val === "model") {
        const group = document.getElementById("exchange-model-group");
        if (group) group.style.display = isChecked ? "block" : "none";
      }
    });
  });

  // ──────────────────────────────────────────────────
  // 4. IMAGE UPLOAD HANDLING
  // ──────────────────────────────────────────────────

  /**
   * Upload evidence image files to Supabase Storage via the backend proxy.
   * Returns an array of public URLs.
   */
  async function uploadEvidenceImages(files) {
    const token = localStorage.getItem("velura_token");
    const urls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file, file.name);

      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/user/upload/evidence`, {
        method: "POST",
        headers,
        body: formData
      });

      if (!response.ok) {
        let errMsg = `Lỗi tải ảnh ${i + 1}/${files.length}`;
        try {
          const errData = await response.json();
          errMsg = errData?.error?.message || errData?.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json().catch(() => ({}));
      if (!data.url) throw new Error(`Ảnh ${i + 1}: Server không trả về URL`);
      urls.push(data.url);
    }

    return urls;
  }


  const uploadBtn = document.querySelector(".btn-upload");
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", handleFileSelect);
  }

  function handleFileSelect(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      if (uploadedFiles.length >= maxFiles) {
        createToast(`Tối đa ${maxFiles} ảnh. Vui lòng xóa bớt ảnh trước khi thêm.`, "warning");
        break;
      }

      if (!file.type.startsWith("image/")) {
        createToast("Chỉ chấp nhận file ảnh (JPG, PNG, GIF...).", "warning");
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        createToast("Kích thước ảnh tối đa 5MB.", "warning");
        continue;
      }

      uploadedFiles.push(file);

      const reader = new FileReader();
      reader.onload = function (e) {
        renderFilePreview(e.target.result, file.name, uploadedFiles.length - 1);
      };
      reader.readAsDataURL(file);
    }

    updateUploadCounter();
    fileInput.value = "";
  }

  function renderFilePreview(src, name, index) {
    if (!filePreviewList) return;

    const wrapper = document.createElement("div");
    wrapper.className = "file-preview-item";
    wrapper.setAttribute("data-index", index);

    const img = document.createElement("img");
    img.src = src;
    img.alt = name;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-file-btn";
    removeBtn.innerHTML = "&times;";
    removeBtn.addEventListener("click", function () {
      uploadedFiles.splice(index, 1);
      wrapper.remove();
      reindexPreviews();
      updateUploadCounter();
    });

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    filePreviewList.appendChild(wrapper);
  }

  function reindexPreviews() {
    if (!filePreviewList) return;
    const items = filePreviewList.querySelectorAll(".file-preview-item");
    items.forEach((item, i) => {
      item.setAttribute("data-index", i);
    });
  }

  function updateUploadCounter() {
    const counter = document.getElementById("js-upload-counter");
    if (counter) {
      counter.textContent = `${uploadedFiles.length}/${maxFiles} ảnh đã tải lên`;
    }
  }

  // ──────────────────────────────────────────────────
  // 5. FORM SUBMISSION
  // ──────────────────────────────────────────────────

  if (returnForm) {
    returnForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Validate selections
      const selectedOrder = hiddenOrderInput ? hiddenOrderInput.value : "";
      const selectedProducts = returnForm.querySelectorAll('input[name="product_select"]:checked');
      const selectedMethod = returnForm.querySelector('input[name="method_select"]:checked');
      const selectedReason = document.getElementById("returnReason");
      const returnDesc = document.getElementById("returnDesc");

      if (!selectedOrder) {
        createToast("Vui lòng chọn đơn hàng cần đổi/trả.", "warning");
        return;
      }

      if (selectedProducts.length === 0) {
        createToast("Vui lòng chọn ít nhất một sản phẩm cần đổi/trả.", "warning");
        return;
      }

      if (!selectedMethod) {
        createToast("Vui lòng chọn phương thức đổi/trả.", "warning");
        return;
      }

      if (selectedReason && !selectedReason.value) {
        createToast("Vui lòng chọn lý do đổi/trả.", "warning");
        selectedReason.focus();
        return;
      }

      if (uploadedFiles.length === 0) {
        createToast("Vui lòng tải lên ít nhất 1 ảnh minh chứng.", "warning");
        return;
      }

      const submitBtn = returnForm.querySelector(".btn-submit");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Đang tải ảnh...";
      }

      // Upload evidence images to storage first
      let evidenceUrls = [];
      try {
        evidenceUrls = await uploadEvidenceImages(uploadedFiles);
      } catch (uploadErr) {
        createToast(`Lỗi tải ảnh lên: ${uploadErr.message}`, "warning");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Gửi yêu cầu";
        }
        return;
      }

      if (submitBtn) submitBtn.textContent = "Đang gửi...";

      // Map return items
      const itemsPayload = Array.from(selectedProducts).map(input => {
        return {
          order_item_id: input.value,
          quantity: parseInt(input.getAttribute("data-qty") || "1", 10)
        };
      });

      let exchangeDetailsStr = "";
      if (selectedMethod.value === "exchange") {
        const checkedNeeds = Array.from(returnForm.querySelectorAll('input[name="exchange_needs"]:checked')).map(el => el.value);
        if (checkedNeeds.length > 0) {
          exchangeDetailsStr = " | Nhu cầu đổi: ";
          const detailsList = [];
          
          if (checkedNeeds.includes("size")) {
            const sizeVal = document.getElementById("exchange-size-input")?.value || "Không rõ";
            detailsList.push(`Đổi size (${sizeVal})`);
          }
          if (checkedNeeds.includes("color")) {
            const colorVal = document.getElementById("exchange-color-input")?.value || "Không rõ";
            detailsList.push(`Đổi màu (${colorVal})`);
          }
          if (checkedNeeds.includes("model")) {
            const modelVal = document.getElementById("exchange-model-input")?.value || "Không rõ";
            detailsList.push(`Đổi mẫu khác (${modelVal})`);
          }
          if (checkedNeeds.includes("defective")) {
            detailsList.push("Đổi sản phẩm cùng loại do lỗi");
          }
          
          exchangeDetailsStr += detailsList.join(", ");
        }
      }

      const payload = {
        order_id: selectedOrder,
        return_type: selectedMethod.value, // "refund" or "exchange"
        description: `${selectedReason.options[selectedReason.selectedIndex].text}. Chi tiết: ${returnDesc ? returnDesc.value : ""}${exchangeDetailsStr}`,
        evidence_images: evidenceUrls,
        items: itemsPayload
      };

      apiRequest("/api/user/returns", { method: "POST", body: payload })
        .then(() => {
          createToast("Yêu cầu đổi/trả hàng đã được gửi thành công! Chúng tôi sẽ liên hệ bạn trong 24h.", "success");
          setTimeout(() => {
            window.location.href = "/src/pages/account/my-orders.html";
          }, 1500);
        })
        .catch(err => {
          createToast(`Lỗi: ${err.message}`, "warning");
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Gửi yêu cầu";
          }
        });
    });
  }

  // Cancel button
  const cancelBtn = document.querySelector(".btn-cancel");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      window.history.back();
    });
  }

  // ──────────────────────────────────────────────────
  // 6. TOAST NOTIFICATIONS
  // ──────────────────────────────────────────────────

  function createToast(message, type) {
    const existing = document.querySelector(".velura-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "velura-toast";

    const bgColor = type === "success" ? "#2d6a4f" : type === "warning" ? "#b56727" : "#734724";

    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background-color: ${bgColor};
      color: #fff;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      max-width: 420px;
      line-height: 1.5;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    }, 50);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-10px)";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}
