import { apiRequest } from "./api.js";
import { showToast, showConfirmModal } from "./account-profile.js";

export function initOrderDetail() {
  const container = document.querySelector(".order-detail-page");
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");

  if (!orderId) {
    showError("Không tìm thấy mã đơn hàng trong URL.");
    return;
  }

  // DOM Elements
  const orderCodeEl = document.getElementById("js-order-code");
  const orderDateEl = document.getElementById("js-order-date");
  const orderStatusEl = document.getElementById("js-order-status");
  const trackingCodeEl = document.getElementById("js-tracking-code");
  const trackBtnEl = document.getElementById("js-track-btn");
  const timelineEl = document.getElementById("js-detail-timeline");
  const productsCountEl = document.getElementById("js-products-count");
  const productsListEl = document.getElementById("js-products-list");
  const shippingNameEl = document.getElementById("js-shipping-name");
  const shippingPhoneEl = document.getElementById("js-shipping-phone");
  const shippingAddressEl = document.getElementById("js-shipping-address");
  const paymentMethodEl = document.getElementById("js-payment-method");
  const subtotalEl = document.getElementById("js-subtotal");
  const shippingFeeEl = document.getElementById("js-shipping-fee");
  const discountEl = document.getElementById("js-discount");
  const totalAmountEl = document.getElementById("js-total-amount");
  const actionCardEl = document.getElementById("js-action-card");

  // Cancel Modal elements
  const cancelModal = document.getElementById("js-cancel-order-modal");
  const closeCancelBtns = document.querySelectorAll(".js-close-cancel");
  const cancelReasonSelect = document.getElementById("js-cancel-reason-select");
  const cancelReasonOtherContainer = document.getElementById("js-cancel-reason-other-container");
  const cancelReasonOther = document.getElementById("js-cancel-reason-other");
  const submitCancelBtn = document.getElementById("js-btn-submit-cancel");
  let activeCancelOrderId = null;

  if (cancelReasonSelect) {
    cancelReasonSelect.addEventListener("change", () => {
      if (cancelReasonSelect.value === "Khác") {
        cancelReasonOtherContainer.style.display = "block";
      } else {
        cancelReasonOtherContainer.style.display = "none";
      }
    });
  }

  closeCancelBtns.forEach(btn => {
    btn.addEventListener("click", closeCancelModal);
  });

  if (submitCancelBtn) {
    submitCancelBtn.addEventListener("click", () => {
      if (!activeCancelOrderId) return;
      
      let reason = cancelReasonSelect.value;
      if (reason === "Khác") {
        reason = cancelReasonOther.value.trim();
        if (!reason) {
          showToast("Vui lòng nhập chi tiết lý do hủy đơn hàng.");
          return;
        }
      }

      submitCancelBtn.disabled = true;
      submitCancelBtn.textContent = "Đang xử lý...";

      apiRequest(`/api/user/orders`, {
        method: "PATCH",
        body: JSON.stringify({
          order_id: activeCancelOrderId,
          status: "cancelled",
          cancelled_reason: reason
        })
      })
      .then(() => {
        showToast("Hủy đơn hàng thành công!");
        closeCancelModal();
        loadOrderDetail();
      })
      .catch(err => {
        showToast(`Không thể hủy đơn hàng: ${err.message}`);
        submitCancelBtn.disabled = false;
        submitCancelBtn.textContent = "Xác nhận hủy";
      });
    });
  }

  function openCancelModal(id) {
    activeCancelOrderId = id;
    if (cancelModal) cancelModal.classList.add("is-visible");
  }

  function closeCancelModal() {
    if (cancelModal) cancelModal.classList.remove("is-visible");
    activeCancelOrderId = null;
    if (cancelReasonSelect) cancelReasonSelect.value = "Thay đổi ý định";
    if (cancelReasonOtherContainer) cancelReasonOtherContainer.style.display = "none";
    if (cancelReasonOther) cancelReasonOther.value = "";
    if (submitCancelBtn) {
      submitCancelBtn.disabled = false;
      submitCancelBtn.textContent = "Xác nhận hủy";
    }
  }

  function loadOrderDetail() {
    container.style.opacity = "0.5";
    
    Promise.all([
      apiRequest(`/api/user/orders/${orderId}`),
      apiRequest(`/api/user/returns?order_id=${orderId}`).catch(() => ({ returns: [] }))
    ])
      .then(([order, returnData]) => {
        container.style.opacity = "1";
        renderOrder(order, returnData.returns || []);
      })
      .catch(err => {
        container.style.opacity = "1";
        showError(`Không thể tải chi tiết đơn hàng: ${err.message}`);
      });
  }

  function renderOrder(order, returns = []) {
    const trackingCode = order.tracking_code || order.order_id.slice(0, 8).toUpperCase();
    const dateObj = new Date(order.created_at);
    const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

    // 1. Header Info
    if (orderCodeEl) orderCodeEl.textContent = trackingCode;
    if (orderDateEl) orderDateEl.textContent = `Ngày đặt: ${formattedDate}`;

    // Status Label mapping
    const statusLabels = {
      pending: "Chờ xác nhận",
      confirmed: "Đã xác nhận",
      preparing: "Đang chuẩn bị",
      shipping: "Đang giao hàng",
      delivered: "Đã giao hàng",
      completed: "Hoàn thành",
      cancelled: "Đã hủy"
    };

    const statusText = statusLabels[order.status] || order.status;
    if (orderStatusEl) {
      orderStatusEl.textContent = statusText;
      orderStatusEl.className = `detail-status-badge detail-status-badge--${order.status}`;
    }

    // Tracking
    if (trackingCodeEl) trackingCodeEl.textContent = order.tracking_code || "Chưa có";
    if (trackBtnEl) {
      trackBtnEl.href = `./track-order.html?id=${order.order_id}`;
      if (order.status === "pending" || order.status === "cancelled") {
        trackBtnEl.style.display = "none";
      } else {
        trackBtnEl.style.display = "inline-flex";
      }
    }

    // 2. Render Timeline
    renderTimeline(order);

    // 3. Products List
    const items = order.items || [];
    if (productsCountEl) productsCountEl.textContent = `Sản phẩm (${items.length})`;
    if (productsListEl) {
      productsListEl.innerHTML = "";
      items.forEach(item => {
        const itemPrice = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(item.unit_price);
        const itemDiv = document.createElement("div");
        itemDiv.className = "detail-product-item";
        itemDiv.innerHTML = `
          <div class="detail-product-img">
            <img src="${item.product_image || '../../assets/images/product-silk-blazer.png'}" alt="${item.product_name}" />
          </div>
          <div class="detail-product-info">
            <h3 class="detail-product-name">${item.product_name}</h3>
            <div class="detail-product-meta">Số lượng: x${item.quantity}</div>
            <div class="detail-product-price">${itemPrice}</div>
          </div>
        `;
        productsListEl.appendChild(itemDiv);
      });
    }

    // 4. Shipping Info
    if (shippingNameEl) shippingNameEl.textContent = order.shipping_name || "Chưa cập nhật";
    if (shippingPhoneEl) shippingPhoneEl.textContent = order.shipping_phone || "Chưa cập nhật";
    if (shippingAddressEl) shippingAddressEl.textContent = order.shipping_address || "Chưa cập nhật";

    // 5. Billing & Total
    if (paymentMethodEl) paymentMethodEl.innerHTML = `Phương thức: <span class="text-bold">${order.payment_method}</span>`;
    
    const subtotalVal = order.subtotal || 0;
    const shippingVal = order.shipping_fee || 0;
    const discountVal = order.discount_amount || 0;
    const totalVal = order.total_amount || 0;

    const formatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
    if (subtotalEl) subtotalEl.textContent = formatter.format(subtotalVal);
    if (shippingFeeEl) shippingFeeEl.textContent = formatter.format(shippingVal);
    if (discountEl) discountEl.textContent = `-${formatter.format(discountVal)}`;
    if (totalAmountEl) totalAmountEl.textContent = formatter.format(totalVal);

    // 6. Actions Card
    renderActions(order, returns);

    // 7. Return status card
    if (returns && returns.length > 0) {
      renderReturnStatus(returns[0]);
    } else {
      const returnStatusContainer = document.getElementById("js-return-status-container");
      if (returnStatusContainer) returnStatusContainer.style.display = "none";
    }
  }

  function renderTimeline(order) {
    if (!timelineEl) return;
    timelineEl.innerHTML = "";

    const steps = [
      { key: "placed", title: "Đặt hàng thành công", desc: "Đơn hàng đã được ghi nhận trên hệ thống." },
      { key: "confirmed", title: "Đã xác nhận", desc: "Velura đã xác nhận thông tin đơn hàng." },
      { key: "preparing", title: "Đang chuẩn bị hàng", desc: "Sản phẩm đang được đóng gói tại kho." },
      { key: "shipping", title: "Đang giao hàng", desc: "Đơn hàng đã bàn giao cho đơn vị vận chuyển." },
      { key: "delivered", title: "Đã giao hàng", desc: "Giao hàng thành công." }
    ];

    // Determine current status index
    const statusOrder = ["pending", "confirmed", "preparing", "shipping", "delivered", "completed"];
    const currentIdx = statusOrder.indexOf(order.status === "completed" ? "delivered" : order.status);

    if (order.status === "cancelled") {
      timelineEl.innerHTML = `
        <div class="detail-timeline-item detail-timeline-item--completed">
          <div class="detail-timeline-marker">
            <span class="detail-timeline-dot" style="background-color: var(--soft);">×</span>
          </div>
          <div class="detail-timeline-content">
            <h3 class="detail-timeline-title">Đơn hàng đã hủy</h3>
            <p style="color: var(--soft); font-size: 0.8125rem; margin-top: 4px;">Lý do: ${order.cancelled_reason || "Hủy bởi khách hàng"}</p>
          </div>
        </div>
      `;
      return;
    }

    steps.forEach((step, idx) => {
      let stateClass = "detail-timeline-item--pending";
      let isCompleted = false;

      if (idx < currentIdx) {
        stateClass = "detail-timeline-item--completed";
        isCompleted = true;
      } else if (idx === currentIdx) {
        stateClass = "detail-timeline-item--active";
      }

      const timelineItem = document.createElement("div");
      timelineItem.className = `detail-timeline-item ${stateClass}`;
      timelineItem.innerHTML = `
        <div class="detail-timeline-marker">
          <span class="detail-timeline-dot">
            ${isCompleted ? `
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ` : ""}
          </span>
          ${idx < steps.length - 1 ? '<span class="detail-timeline-line"></span>' : ''}
        </div>
        <div class="detail-timeline-content">
          <h3 class="detail-timeline-title">${step.title}</h3>
          <p style="color: var(--soft); font-size: 0.8125rem; margin-top: 2px;">${step.desc}</p>
        </div>
      `;
      timelineEl.appendChild(timelineItem);
    });
  }

  function renderReturnStatus(ret) {
    const container = document.getElementById("js-return-status-container");
    if (!container) return;

    container.style.display = "block";

    // Step labels
    const stepLabels = [
      "Gửi yêu cầu",
      "Duyệt hồ sơ",
      "Vận chuyển ngược",
      "Kiểm kho",
      "Hoàn tất"
    ];

    const steps = ["pending", "approved", "shipping_back", "received", "completed"];
    let currentIdx = steps.indexOf(ret.status);
    if (ret.status === "rejected") {
      currentIdx = -1;
    }

    let timelineHtml = "";
    if (ret.status === "rejected") {
      timelineHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #fee2e2; padding-bottom: 12px;">
          <div style="color: #dc2626; font-weight: 600; display: flex; align-items: center; gap: 8px; font-size: 0.9375rem;">
            <span>⚠️</span> Yêu cầu đổi/trả đã bị từ chối
          </div>
          <div style="font-size: 0.8125rem; color: var(--soft);">Mã yêu cầu: ${ret.tracking_return_code}</div>
        </div>
      `;
    } else {
      timelineHtml = `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #f3f4f6; padding-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; font-size: 0.9375rem; font-weight: 600; color: #734724;">Tiến trình Đổi/Trả hàng</h4>
            <div style="font-size: 0.8125rem; color: var(--soft);">Mã yêu cầu: ${ret.tracking_return_code}</div>
          </div>
          <div style="display: flex; justify-content: space-between; position: relative; margin-top: 12px; padding: 0 10px;">
            <div style="position: absolute; top: 10px; left: 4%; right: 4%; height: 2px; background-color: #e5e7eb; z-index: 1;"></div>
            ${stepLabels.map((lbl, idx) => {
              const isCompleted = idx <= currentIdx;
              const isActive = idx === currentIdx;
              const circleColor = isCompleted ? "#734724" : "#e5e7eb";
              const fontColor = isActive ? "#734724" : isCompleted ? "#555" : "#9ca3af";
              const fontWeight = isActive ? "600" : "500";
              return `
                <div style="display: flex; flex-direction: column; align-items: center; width: 18%; position: relative; z-index: 2; text-align: center;">
                  <div style="width: 22px; height: 22px; border-radius: 50%; background-color: ${circleColor}; border: 4px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 1px ${circleColor}; margin-bottom: 6px;">
                    ${isCompleted && !isActive ? `
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ` : ""}
                  </div>
                  <span style="font-size: 0.75rem; color: ${fontColor}; font-weight: ${fontWeight};">${lbl}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }

    let detailHtml = "";
    const formatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

    if (ret.status === "pending") {
      detailHtml = `
        <div style="font-size: 0.875rem; line-height: 1.6;">
          <p style="margin: 0 0 12px 0;">Hồ sơ đổi trả đang ở trạng thái <strong>Chờ xác nhận</strong>. Đội ngũ Velura đang kiểm tra bằng chứng hình ảnh sản phẩm.</p>
          <div style="margin-top: 16px;">
            <button class="btn btn--outline js-btn-cancel-return-req" data-id="${ret.return_id}" style="padding: 8px 16px; font-size: 0.8125rem;">Hủy yêu cầu đổi trả</button>
          </div>
        </div>
      `;
    } else if (ret.status === "approved") {
      detailHtml = `
        <div style="font-size: 0.875rem; line-height: 1.6;">
          <p style="margin: 0 0 12px 0; color: #166534; font-weight: 600;">Hồ sơ đổi trả đã được Phê duyệt!</p>
          <p style="margin: 0 0 12px 0;">Vui lòng gửi lại sản phẩm về địa chỉ kho Velura dưới đây:</p>
          <div style="background-color: #f9fafb; border: 1px dashed #d1d5db; border-radius: 6px; padding: 12px 16px; margin-bottom: 12px; font-family: monospace; font-size: 0.8125rem;">
            <div>Người nhận: Bộ phận Nhận trả Velura</div>
            <div>Địa chỉ: 123 Đường Thời Trang, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</div>
            <div>Mã vận đơn ngược: ${ret.tracking_return_code}</div>
          </div>
          <p style="margin: 0; color: var(--soft); font-size: 0.8125rem;">* Hệ thống tự động cập nhật khi bưu tá nhận quét mã.</p>
          <div style="margin-top: 16px;">
            <button class="btn btn--outline js-btn-cancel-return-req" data-id="${ret.return_id}" style="padding: 8px 16px; font-size: 0.8125rem;">Hủy yêu cầu đổi trả</button>
          </div>
        </div>
      `;
    } else if (ret.status === "shipping_back") {
      detailHtml = `
        <div style="font-size: 0.875rem; line-height: 1.6;">
          <p style="margin: 0 0 16px 0;">Đang vận chuyển ngược về kho Velura. Vận đơn ngược: <strong>${ret.tracking_return_code}</strong></p>
          <div style="padding-left: 12px; border-left: 2px solid #734724; display: flex; flex-direction: column; gap: 12px;">
            <div>
              <strong style="color: #734724;">Đang vận chuyển ngược</strong>
              <div style="font-size: 0.75rem; color: var(--soft);">Đơn vị vận chuyển đang chuyển tiếp qua bưu cục trung tâm.</div>
            </div>
          </div>
        </div>
      `;
    } else if (ret.status === "received") {
      detailHtml = `
        <div style="font-size: 0.875rem; line-height: 1.6;">
          <p style="margin: 0 0 8px 0;">Hàng đã về tới kho Velura. Nhân viên kho đang thực hiện <strong>kiểm tra chất lượng thực tế</strong>.</p>
          <p style="margin: 0; color: var(--soft); font-size: 0.8125rem;">Kết quả phê duyệt hoàn tiền hoặc đổi mới sẽ được gửi sau ít phút.</p>
        </div>
      `;
    } else if (ret.status === "completed") {
      let extraText = "";
      if (ret.return_type === "refund") {
        if (ret.admin_note && ret.admin_note.includes("Refund Failed")) {
          extraText = `
            <div style="margin-top: 12px; padding: 10px; background-color: #fff5f5; border: 1px solid #feb2b2; border-radius: 6px; color: #c53030; font-size: 0.8125rem;">
              <strong>Lỗi hoàn tiền tự động:</strong> Cổng thanh toán báo lỗi. Velura đang xử lý chuyển khoản thủ công cho quý khách.
            </div>
          `;
        } else {
          extraText = `
            <p style="margin: 8px 0 0 0;">Số tiền hoàn lại <strong>${formatter.format(ret.refund_amount || 0)}</strong> đã được chuyển về phương thức thanh toán gốc.</p>
          `;
        }
      } else if (ret.return_type === "exchange") {
        const damageTag = ret.condition_check_result === "minor_damage"
          ? `<p style="margin: 0 0 8px 0; color: #b45309; font-size: 0.8125rem;">* Hàng có hao mòn/ảnh hưởng nhẹ do vận chuyển nhưng Velura vẫn hỗ trợ đổi mới.</p>`
          : "";
        const orderLink = ret.exchange_order_id
          ? `<a href="/src/pages/account/order-detail.html?id=${ret.exchange_order_id}" style="color: #734724; font-weight: 600; text-decoration: underline;">Theo dõi đơn đổi mới #${ret.exchange_order_id.slice(0, 8).toUpperCase()} &gt;</a>`
          : "Mã đơn hàng đổi mới đang được khởi tạo";
        extraText = `
          <div style="margin-top: 8px;">
            ${damageTag}
            Đơn hàng đổi mới đã được khởi tạo thành công!
            <br>${orderLink}
          </div>
        `;
      }

      detailHtml = `
        <div style="font-size: 0.875rem; line-height: 1.6; color: #166534;">
          <p style="margin: 0; font-weight: 600;">Yêu cầu đổi/trả đã hoàn thành!</p>
          ${extraText}
        </div>
      `;
    } else if (ret.status === "rejected") {
      detailHtml = `
        <div style="font-size: 0.875rem; line-height: 1.6; color: #991b1b;">
          <p style="margin: 0 0 8px 0; font-weight: 600;">Yêu cầu bị từ chối</p>
          <p style="margin: 0 0 12px 0;">Lý do: <strong>${ret.rejection_reason || "Hồ sơ không đúng quy định"}</strong></p>
          <p style="margin: 0; color: var(--soft); font-size: 0.8125rem;">Quý khách vui lòng liên hệ CSKH Velura để được nhận lại sản phẩm.</p>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="detail-card" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        ${timelineHtml}
        ${detailHtml}
      </div>
    `;

    // Bind Cancel Return Button
    const cancelBtn = container.querySelector(".js-btn-cancel-return-req");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", async () => {
        const confirmed = await showConfirmModal("Bạn có chắc muốn hủy yêu cầu đổi trả này?");
        if (!confirmed) return;
        cancelBtn.disabled = true;
        cancelBtn.textContent = "Đang xử lý...";
        apiRequest("/api/user/returns/cancel", {
          method: "POST",
          body: JSON.stringify({ return_id: ret.return_id })
        })
          .then(() => {
            showToast("Hủy yêu cầu thành công!");
            loadOrderDetail();
          })
          .catch(err => {
            showToast("Không thể hủy yêu cầu: " + err.message);
            cancelBtn.disabled = false;
            cancelBtn.textContent = "Hủy yêu cầu đổi trả";
          });
      });
    }
  }

  function renderActions(order, returns = []) {
    if (!actionCardEl) return;
    actionCardEl.innerHTML = `<h3 class="detail-action-title">Hành động</h3>`;

    const groupEl = document.createElement("div");
    groupEl.className = "detail-action-group";

    const cancellableStatuses = ["pending", "confirmed", "preparing"];
    if (cancellableStatuses.includes(order.status)) {
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "detail-action-btn detail-action-btn--danger";
      cancelBtn.textContent = "Hủy đơn hàng";
      cancelBtn.addEventListener("click", () => openCancelModal(order.order_id));
      groupEl.appendChild(cancelBtn);
    } else if (order.status === "shipping") {
      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "detail-action-btn detail-action-btn--primary";
      confirmBtn.textContent = "Xác nhận đã nhận hàng";
      confirmBtn.addEventListener("click", () => handleConfirmDelivery(order.order_id));
      groupEl.appendChild(confirmBtn);
    } else if (order.status === "delivered" || order.status === "completed") {
      const reviewBtn = document.createElement("button");
      reviewBtn.type = "button";
      reviewBtn.className = "detail-action-btn detail-action-btn--primary";
      reviewBtn.textContent = "Viết đánh giá sản phẩm";
      reviewBtn.addEventListener("click", () => {
        window.location.href = `/src/pages/account/product-review.html?id=${order.order_id}`;
      });
      groupEl.appendChild(reviewBtn);

      if (returns.length === 0) {
        const deliveryDate = order.delivered_at ? new Date(order.delivered_at) : new Date(order.updated_at || order.created_at);
        const now = new Date();
        const diffMs = now - deliveryDate;
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours <= 48) {
          const returnBtn = document.createElement("button");
          returnBtn.type = "button";
          returnBtn.className = "detail-action-btn detail-action-btn--outline";
          returnBtn.textContent = "Yêu cầu Đổi/Trả hàng";
          returnBtn.addEventListener("click", () => {
            window.location.href = `/src/pages/account/return-request.html?orderId=${order.order_id}`;
          });
          groupEl.appendChild(returnBtn);
        }
      }
    }

    if (order.status === "failed_delivery") {
      const supportBtn = document.createElement("button");
      supportBtn.type = "button";
      supportBtn.className = "detail-action-btn detail-action-btn--support";
      supportBtn.textContent = "Liên hệ hỗ trợ";
      supportBtn.addEventListener("click", async () => {
        if (supportBtn.disabled) return;
        supportBtn.disabled = true;
        supportBtn.textContent = "Đang tạo phiếu...";
        try {
          const result = await apiRequest(`/api/user/orders/${encodeURIComponent(order.order_id)}/support-ticket`, { method: "POST" });
          const shortCode = result.ticket?.ticket_id?.slice(0, 8) || "";
          supportBtn.textContent = "Đã gửi hỗ trợ";
          showToast(result.created ? `Đã tạo phiếu hỗ trợ #${shortCode}. Bộ phận CSKH sẽ sớm liên hệ với bạn.` : `Phiếu hỗ trợ #${shortCode} của đơn hàng này đang được xử lý.`);
        } catch (err) {
          supportBtn.disabled = false;
          supportBtn.textContent = "Liên hệ hỗ trợ";
          showToast(`Không thể tạo phiếu hỗ trợ: ${err.message}`);
        }
      });
      groupEl.appendChild(supportBtn);
    }

    actionCardEl.appendChild(groupEl);
  }

  async function handleConfirmDelivery(id) {
    const confirmed = await showConfirmModal("Bạn xác nhận đã nhận đầy đủ sản phẩm và muốn hoàn thành đơn hàng?");
    if (!confirmed) return;

    apiRequest(`/api/user/orders`, { method: "PATCH", body: JSON.stringify({ order_id: id, status: "delivered" }) })
      .then(() => {
        showToast("Xác nhận đã nhận hàng thành công!");
        loadOrderDetail();
      })
      .catch(err => {
        showToast(`Không thể xác nhận nhận hàng: ${err.message}`);
      });
  }

  function showError(msg) {
    if (productsListEl) {
      productsListEl.innerHTML = `<div style="padding: 24px 0; color: #d9534f; text-align: center;">Lỗi: ${msg}</div>`;
    }
  }

  loadOrderDetail();
}
