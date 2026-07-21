import adminIconsUrl from "../assets/icons/admin-icons.svg?url";
import { API_BASE_URL, getAccessToken } from "./supabase-auth.js";

(function () {
  "use strict";

  var root = document.querySelector("[data-dashboard]");
  if (!root) return;

  var overlay = document.querySelector("#dashboard-overlay");
  var loadError = false;
  var toast = document.querySelector("#dashboard-toast");
  var sidebar = document.querySelector("#admin-sidebar");
  var backdrop = document.querySelector("[data-dashboard-sidebar-close]");
  var currentDashboardData = null;

  root.querySelectorAll(".dashboard-kpi").forEach(function (card) {
    card.classList.add("dashboard-kpi--loading");
  });

  var todayForInput = new Date();
  var sevenDaysAgo = new Date(todayForInput.getTime() - 6 * 24 * 60 * 60 * 1000);
  var fromInput = document.querySelector("[data-dashboard-date-from]");
  var toInput = document.querySelector("[data-dashboard-date-to]");
  if (fromInput) fromInput.value = sevenDaysAgo.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  if (toInput) toInput.value = todayForInput.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

  function icon(name) {
    return '<svg class="admin-line-icon"><use href="' + adminIconsUrl + '#' + name + '"></use></svg>';
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { toast.hidden = true; }, 2400);
  }

  function closeOverlay() {
    overlay.innerHTML = "";
  }

  function fmtNum(n) { return Number(n).toLocaleString("vi-VN"); }
  function fmtMoney(n) {
    var abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (abs >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (abs >= 1e3) return (n / 1e3).toFixed(0) + "K";
    return String(n);
  }

  function fmtPercent(n) {
    return Number(n).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  }

  function setTrend(element, value, suffix) {
    if (!element) return;
    element.classList.remove("dashboard-trend--up", "dashboard-trend--down");
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      element.textContent = "Chưa có dữ liệu kỳ trước";
      return;
    }
    var numeric = Number(value);
    var arrow = numeric > 0 ? "↑" : numeric < 0 ? "↓" : "→";
    if (numeric > 0) element.classList.add("dashboard-trend--up");
    if (numeric < 0) element.classList.add("dashboard-trend--down");
    element.textContent = arrow + " " + fmtPercent(Math.abs(numeric)) + (suffix || "% so với kỳ trước");
  }

  function compressTrend(points, maxPoints) {
    if (!Array.isArray(points) || points.length <= maxPoints) return points || [];
    var size = Math.ceil(points.length / maxPoints);
    var result = [];
    for (var i = 0; i < points.length; i += size) {
      var chunk = points.slice(i, i + size);
      result.push({
        dateStr: chunk.length === 1 ? chunk[0].dateStr : chunk[0].dateStr + "–" + chunk[chunk.length - 1].dateStr,
        revenue: chunk.reduce(function (sum, point) { return sum + Number(point.revenue || 0); }, 0),
        orderCount: chunk.reduce(function (sum, point) { return sum + Number(point.orderCount || 0); }, 0)
      });
    }
    return result;
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>'"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c];
    });
  }

  function updateDashboardUI(data) {
    loadError = false;
    var opsPanel = document.querySelector("#dashboard-operations");
    if (opsPanel) {
      var kpis = opsPanel.querySelectorAll(".dashboard-kpi");
      if (kpis.length >= 5) {
        kpis[0].querySelector("strong").textContent = fmtNum(data.operations.pendingOrders);
        kpis[0].querySelector("small").textContent = fmtNum(data.operations.paymentErrors) + " thanh toán lỗi";

        kpis[1].querySelector("strong").textContent = fmtNum(data.operations.openReturns);
        kpis[2].querySelector("strong").textContent = fmtNum(data.operations.openSupportTickets);
        kpis[3].querySelector("strong").textContent = fmtNum(data.operations.lowStockProducts);

        kpis[4].querySelector("strong").textContent = fmtNum(data.business.pendingReviews);
        kpis[4].querySelector("small").textContent = fmtNum(data.operations.urgentReviews) + " đánh giá tiêu cực";
      }

      var alertCountBtn = opsPanel.querySelector("[data-dashboard-drawer='alerts']");
      if (alertCountBtn) {
        var totalAlerts = data.operations.openReturns + data.operations.paymentErrors + data.operations.lowStockProducts + data.operations.openSupportTickets;
        alertCountBtn.textContent = "Xem tất cả " + totalAlerts;
      }

      // Update alerts list on operations panel
      var alertList = opsPanel.querySelector(".dashboard-alert-list");
      if (alertList) {
        alertList.innerHTML = `
          <article class="dashboard-alert dashboard-alert--critical"><span class="admin-badge admin-badge--danger dashboard-alert__level">Khẩn cấp</span><div><h4>${fmtNum(data.operations.openReturns)} phiếu đổi/trả cần xử lý</h4><p>Đổi trả &amp; CSKH · Tải trực tiếp từ Supabase</p></div><a href="./returns-cskh.html#returns">Xem phiếu</a></article>
          <article class="dashboard-alert dashboard-alert--critical"><span class="admin-badge admin-badge--danger dashboard-alert__level">Khẩn cấp</span><div><h4>${fmtNum(data.operations.paymentErrors)} đơn hàng thanh toán lỗi cần kiểm tra</h4><p>Quản lý đơn hàng · Cảnh báo hệ thống</p></div><a href="./orders.html">Kiểm tra</a></article>
          <article class="dashboard-alert dashboard-alert--high"><span class="admin-badge admin-badge--warning dashboard-alert__level">Cao</span><div><h4>${fmtNum(data.operations.lowStockProducts)} sản phẩm dưới mức tồn kho tối thiểu</h4><p>Sản phẩm &amp; tồn kho · Tồn kho thấp</p></div><a href="./products.html">Xem tồn kho</a></article>
          <article class="dashboard-alert dashboard-alert--medium"><span class="admin-badge admin-badge--pending dashboard-alert__level">Trung bình</span><div><h4>${fmtNum(data.operations.openSupportTickets)} phiếu hỗ trợ khách hàng chờ phản hồi</h4><p>Đổi trả &amp; CSKH · Phiếu mới nhận</p></div><a href="./returns-cskh.html#support">Xem hỗ trợ</a></article>
        `;
      }

      // Update health list cards dynamically
      var healthList = opsPanel.querySelector(".dashboard-health-list");
      if (healthList) {
        var ordersStatus = (data.operations.pendingOrders > 0 || data.operations.paymentErrors > 0) ? "warning" : "success";
        var ordersStatusLabel = ordersStatus === "warning" ? "Cần chú ý" : "Tốt";
        
        var productsStatus = data.operations.lowStockProducts > 0 ? "danger" : "success";
        var productsStatusLabel = productsStatus === "danger" ? "Rủi ro" : "Tốt";
        
        var reviewsStatus = data.business.pendingReviews > 0 ? "warning" : "success";
        var reviewsStatusLabel = reviewsStatus === "warning" ? "Cần chú ý" : "Tốt";
        
        var returnsStatus = (data.operations.openReturns > 0 || data.operations.openSupportTickets > 0) ? "warning" : "success";
        var returnsStatusLabel = returnsStatus === "warning" ? "Cần chú ý" : "Tốt";

        healthList.innerHTML = `
          <a class="dashboard-health-card" href="./orders.html">
            <div class="dashboard-health-card__head">
              <i>${icon("cart")}</i>
              <span class="admin-badge admin-badge--${ordersStatus}">${ordersStatusLabel}</span>
            </div>
            <div class="dashboard-health-card__title">
              <span class="dashboard-health-dot dashboard-health-dot--${ordersStatus}"></span>
              <strong>Đơn hàng</strong>
            </div>
            <small>${fmtNum(data.operations.pendingOrders)} cần xử lý · ${fmtNum(data.operations.paymentErrors)} thanh toán lỗi</small>
          </a>
          <a class="dashboard-health-card" href="./products.html">
            <div class="dashboard-health-card__head">
              <i>${icon("box")}</i>
              <span class="admin-badge admin-badge--${productsStatus}">${productsStatusLabel}</span>
            </div>
            <div class="dashboard-health-card__title">
              <span class="dashboard-health-dot dashboard-health-dot--${productsStatus}"></span>
              <strong>Sản phẩm &amp; tồn kho</strong>
            </div>
            <small>${fmtNum(data.operations.lowStockProducts)} dưới tồn tối thiểu</small>
          </a>
          <a class="dashboard-health-card" href="./reviews.html">
            <div class="dashboard-health-card__head">
              <i>${icon("star")}</i>
              <span class="admin-badge admin-badge--${reviewsStatus}">${reviewsStatusLabel}</span>
            </div>
            <div class="dashboard-health-card__title">
              <span class="dashboard-health-dot dashboard-health-dot--${reviewsStatus}"></span>
              <strong>Đánh giá</strong>
            </div>
            <small>${fmtNum(data.business.pendingReviews)} chờ duyệt</small>
          </a>
          <a class="dashboard-health-card" href="./returns-cskh.html">
            <div class="dashboard-health-card__head">
              <i>${icon("support")}</i>
              <span class="admin-badge admin-badge--${returnsStatus}">${returnsStatusLabel}</span>
            </div>
            <div class="dashboard-health-card__title">
              <span class="dashboard-health-dot dashboard-health-dot--${returnsStatus}"></span>
              <strong>Đổi trả &amp; CSKH</strong>
            </div>
            <small>${fmtNum(data.operations.openReturns)} phiếu còn hạn · ${fmtNum(data.operations.openSupportTickets)} ticket chờ</small>
          </a>
          <a class="dashboard-health-card" href="./promotions.html">
            <div class="dashboard-health-card__head">
              <i>${icon("tag")}</i>
              <span class="admin-badge admin-badge--success">Tốt</span>
            </div>
            <div class="dashboard-health-card__title">
              <span class="dashboard-health-dot dashboard-health-dot--success"></span>
              <strong>Giá &amp; khuyến mãi</strong>
            </div>
            <small>Hoạt động bình thường</small>
          </a>
          <a class="dashboard-health-card" href="./accounts.html">
            <div class="dashboard-health-card__head">
              <i>${icon("users")}</i>
              <span class="admin-badge admin-badge--success">Tốt</span>
            </div>
            <div class="dashboard-health-card__title">
              <span class="dashboard-health-dot dashboard-health-dot--success"></span>
              <strong>Tài khoản &amp; hệ thống</strong>
            </div>
            <small>Không có cảnh báo bảo mật mới</small>
          </a>
        `;
      }

      // Update dynamic tasks list
      var taskList = opsPanel.querySelector(".dashboard-task-list");
      var taskCount = opsPanel.querySelector(".dashboard-action-queue .dashboard-section__count");
      if (taskList) {
        var tasks = [
          {
            index: "01",
            title: `Duyệt ${fmtNum(data.operations.openReturns)} phiếu đổi/trả cần xử lý`,
            desc: "Đổi trả & CSKH · Hạn trong tuần này",
            badge: "Cao",
            badgeClass: "admin-badge--danger",
            link: "./returns-cskh.html#returns"
          },
          {
            index: "02",
            title: `Kiểm tra ${fmtNum(data.operations.paymentErrors)} đơn thanh toán lỗi`,
            desc: "Quản lý đơn hàng · Cảnh báo hệ thống",
            badge: "Cao",
            badgeClass: "admin-badge--danger",
            link: "./orders.html"
          },
          {
            index: "03",
            title: `Phản hồi ${fmtNum(data.operations.urgentReviews)} đánh giá tiêu cực`,
            desc: "Quản lý đánh giá · Trong hôm nay",
            badge: "Vừa",
            badgeClass: "admin-badge--warning",
            link: "./reviews.html"
          },
          {
            index: "04",
            title: `Bổ sung tồn kho cho ${fmtNum(data.operations.lowStockProducts)} sản phẩm`,
            desc: "Quản lý sản phẩm · Tồn kho thấp",
            badge: "Vừa",
            badgeClass: "admin-badge--warning",
            link: "./products.html"
          }
        ];
        taskList.innerHTML = tasks.map(t => `
          <a href="${t.link}"><span class="dashboard-task__index">${t.index}</span><div><strong>${t.title}</strong><small>${t.desc}</small></div><span class="admin-badge ${t.badgeClass}">${t.badge}</span></a>
        `).join("");
        if (taskCount) {
          taskCount.textContent = tasks.length + " việc";
        }
      }

      // Update recent activity timeline
      var timeline = opsPanel.querySelector(".dashboard-timeline");
      if (timeline && data.recentLogs) {
        if (data.recentLogs.length === 0) {
          timeline.innerHTML = `
            <div style="padding: 24px; text-align: center; color: var(--muted); font-size: 0.85rem;">
              Chưa có hoạt động gần đây
            </div>
          `;
        } else {
          timeline.innerHTML = data.recentLogs.slice(0, 5).map(log => {
            var date = new Date(log.timestamp);
            var timeStr = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
            var actor = log.actor_name || log.actor_id || "Hệ thống";
            
            var actionVerb = "";
            if (log.action === "create") actionVerb = "Tạo mới";
            else if (log.action === "update") actionVerb = "Cập nhật";
            else if (log.action === "delete") actionVerb = "Xóa";
            else if (log.action === "approve") actionVerb = "Duyệt";
            else if (log.action === "reject") actionVerb = "Từ chối";
            else actionVerb = log.action || "Thao tác";

            var targetModule = "";
            if (log.module === "orders") targetModule = "đơn hàng";
            else if (log.module === "product" || log.module === "products") targetModule = "sản phẩm";
            else if (log.module === "reviews") targetModule = "đánh giá";
            else if (log.module === "accounts") targetModule = "tài khoản";
            else if (log.module === "returns" || log.module === "return_exchange") targetModule = "yêu cầu đổi trả";
            else targetModule = log.module || "";

            var desc = actionVerb + " " + targetModule;
            if (log.target_id) {
              desc += " #" + log.target_id.slice(0, 8);
            }

            var moduleLabel = "Hệ thống";
            if (log.module === "orders") moduleLabel = "Đơn hàng";
            else if (log.module === "product" || log.module === "products") moduleLabel = "Sản phẩm";
            else if (log.module === "reviews") moduleLabel = "Đánh giá";
            else if (log.module === "accounts") moduleLabel = "Tài khoản";
            else if (log.module === "returns" || log.module === "return_exchange") moduleLabel = "Đổi trả & CSKH";

            return `
              <article>
                <time>${timeStr}</time>
                <span></span>
                <div>
                  <strong>${escapeHtml(actor)}</strong>
                  <p>${escapeHtml(desc)}</p>
                  <small>${escapeHtml(moduleLabel)} · Thành công</small>
                </div>
              </article>
            `;
          }).join("");
        }
      }
    }

    var busPanel = document.querySelector("#dashboard-business");
    if (busPanel) {
      var comparisons = data.business.comparisons || {};
      var kpis = busPanel.querySelectorAll(".dashboard-kpi");
      if (kpis.length >= 5) {
        kpis[0].querySelector("strong").textContent = fmtMoney(data.business.revenue);
        setTrend(kpis[0].querySelector("small"), comparisons.revenuePct);
        kpis[1].querySelector("strong").textContent = fmtNum(data.business.orderCount);
        setTrend(kpis[1].querySelector("small"), comparisons.orderCountPct);

        kpis[2].querySelector("strong").textContent = fmtMoney(data.business.averageOrderValue || 0);
        setTrend(kpis[2].querySelector("small"), comparisons.aovPct);

        kpis[3].querySelector("strong").textContent = fmtPercent(data.business.completionRate || 0) + "%";
        setTrend(kpis[3].querySelector("small"), comparisons.completionRatePoints, " điểm phần trăm");

        kpis[4].querySelector("strong").textContent = fmtMoney(data.business.promotionRevenue || 0);
        kpis[4].querySelector("small").textContent = fmtPercent(data.business.promotionRevenueShare || 0) + "% tổng doanh thu";
      }

      var periodLabel = busPanel.querySelector(".dashboard-revenue .dashboard-eyebrow");
      if (periodLabel) periodLabel.textContent = data.periodDays + " ngày đã chọn";
      var chartLabel = busPanel.querySelector(".dashboard-chart");
      if (chartLabel) chartLabel.setAttribute("aria-label", "Biểu đồ doanh thu và số đơn trong " + data.periodDays + " ngày đã chọn");

      var dataStatus = document.querySelector("[data-dashboard-data-status]");
      if (dataStatus && data.meta) {
        var generated = new Date(data.meta.generatedAt);
        dataStatus.innerHTML = '<span class="dashboard-data-status__dot"></span><strong>Dữ liệu trực tiếp từ Supabase</strong><span>Cập nhật ' + generated.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) + '</span><button type="button" data-dashboard-definitions>Xem công thức</button>';
      }

      // Update best categories ranking
      var rankingContainer = busPanel.querySelector(".dashboard-ranking");
      if (rankingContainer && data.business.categoryContributions) {
        rankingContainer.innerHTML = data.business.categoryContributions.map(cat => `
          <div>
            <span>${escapeHtml(cat.name)}</span>
            <i style="--pct: ${cat.pct}%"><b style="width: ${cat.pct}%"></b></i>
            <strong>${fmtMoney(cat.revenue)} <small>${cat.pct}%</small></strong>
          </div>
        `).join("");
      }

      // Update best selling products
      var productsContainer = busPanel.querySelector(".dashboard-products");
      if (productsContainer && data.business.bestSellers) {
        productsContainer.innerHTML = data.business.bestSellers.map((prod, index) => {
          var num = String(index + 1).padStart(2, "0");
          return `
            <article>
              <span>${num}</span>
              <div>
                <strong>${escapeHtml(prod.name)}</strong>
                <small>${escapeHtml(prod.sku)} · ${fmtNum(prod.qty)} đã bán</small>
              </div>
              <b>${fmtMoney(prod.revenue)}</b>
              <em class="admin-badge admin-badge--${prod.statusClass}">${escapeHtml(prod.stockStatus)}</em>
            </article>
          `;
        }).join("");
      }

      // Update promotion impact stats
      var promoStats = busPanel.querySelector(".dashboard-impact-stats");
      if (promoStats) {
        promoStats.innerHTML = `
          <div><small>Đơn có khuyến mãi</small><strong>${fmtNum(data.business.promoOrdersCount)}</strong></div>
          <div><small>Tổng giá trị giảm</small><strong>${fmtMoney(data.business.totalDiscount)}</strong></div>
          <div><small>Campaign tốt nhất</small><strong>${escapeHtml(data.business.bestCampaign)}</strong></div>
          <div><small>Voucher dùng nhiều</small><strong>${escapeHtml(data.business.mostUsedVoucher)}</strong></div>
        `;
      }

      var budget = data.business.insights?.budget || {};
      var impactNote = busPanel.querySelector(".dashboard-impact-note span");
      if (impactNote) {
        if (budget.campaign && Number(budget.usagePct) > 0) {
          impactNote.innerHTML = "<strong>Cần theo dõi ngân sách.</strong> " + escapeHtml(budget.campaign) + " đã sử dụng " + fmtPercent(budget.usagePct) + "% ngân sách.";
        } else {
          impactNote.innerHTML = "<strong>Chưa có mức sử dụng ngân sách.</strong> Supabase chưa ghi nhận chi phí giảm giá vào ngân sách campaign đang hoạt động.";
        }
      }

      var peak = data.business.insights?.peakDay || {};
      var chartInsight = busPanel.querySelector(".dashboard-chart-insight");
      if (chartInsight) {
        var peakDate = peak.date ? new Date(peak.date + "T00:00:00+07:00").toLocaleDateString("vi-VN") : "kỳ đã chọn";
        var hasPeakChange = peak.changePct !== null && peak.changePct !== undefined && Number.isFinite(Number(peak.changePct));
        var peakChange = hasPeakChange ? ", " + (Number(peak.changePct) >= 0 ? "tăng " : "giảm ") + fmtPercent(Math.abs(Number(peak.changePct))) + "% so với ngày liền trước" : "";
        chartInsight.innerHTML = '<span>Insight từ dữ liệu thật</span><h4>Doanh thu cao nhất vào ' + escapeHtml(peakDate) + '</h4><p>Đạt ' + fmtMoney(peak.revenue || 0) + peakChange + '.</p><a href="./orders.html">Xem đơn hàng</a>';
      }

      var insightList = busPanel.querySelector(".dashboard-insight-list");
      if (insightList) {
        var promoAovPct = data.business.insights?.promotionAovPct;
        var lowStockBest = Number(data.business.insights?.lowStockBestSellers || 0);
        var voucherInsight = data.business.insights?.newCustomerVoucher || {};
        var topCategory = data.business.categoryContributions?.[0];
        var insightRows = [
          {
            key: "category",
            title: topCategory ? topCategory.name + " dẫn đầu doanh thu" : "Chưa có doanh thu theo danh mục",
            detail: topCategory ? fmtMoney(topCategory.revenue) + " · đóng góp " + fmtPercent(topCategory.pct) + "% trong kỳ." : "Không có đơn hợp lệ trong khoảng đã chọn.",
            label: topCategory ? "Cơ hội" : "Thông tin",
            klass: topCategory ? "success" : "neutral"
          },
          {
            key: "aov",
            title: promoAovPct === null || promoAovPct === undefined ? "Chưa đủ dữ liệu so sánh AOV" : "AOV đơn khuyến mãi " + (Number(promoAovPct) < 0 ? "thấp hơn" : "cao hơn"),
            detail: promoAovPct === null || promoAovPct === undefined ? "Cần cả đơn khuyến mãi và đơn thường để so sánh." : "Chênh " + fmtPercent(Math.abs(Number(promoAovPct))) + "% so với đơn không khuyến mãi.",
            label: promoAovPct === null || promoAovPct === undefined ? "Thiếu dữ liệu" : Number(promoAovPct) < 0 ? "Theo dõi" : "Tích cực",
            klass: promoAovPct === null || promoAovPct === undefined ? "neutral" : Number(promoAovPct) < 0 ? "warning" : "success"
          },
          {
            key: "stock",
            title: lowStockBest > 0 ? "Sản phẩm bán chạy cần bổ sung tồn" : "Top bán chạy vẫn đủ tồn kho",
            detail: lowStockBest > 0 ? lowStockBest + " sản phẩm có doanh thu trong kỳ đang dưới ngưỡng tồn." : "Không có sản phẩm bán chạy nào dưới ngưỡng tồn tối thiểu.",
            label: lowStockBest > 0 ? "Rủi ro" : "Ổn định",
            klass: lowStockBest > 0 ? "danger" : "success"
          },
          {
            key: "voucher",
            title: voucherInsight.code ? "Hiệu suất voucher " + voucherInsight.code : "Chưa có voucher riêng cho khách mới",
            detail: voucherInsight.usagePct === null || voucherInsight.usagePct === undefined ? "Supabase chưa có đủ giới hạn và lượt dùng để tính tỷ lệ." : "Đã dùng " + fmtPercent(voucherInsight.usagePct) + "% hạn mức phát hành.",
            label: voucherInsight.usagePct === null || voucherInsight.usagePct === undefined ? "Thiếu dữ liệu" : "Theo dõi",
            klass: "neutral"
          }
        ];
        insightList.innerHTML = insightRows.map(function (row) {
          return '<button type="button" data-dashboard-drawer="insight" data-insight="' + row.key + '"><div><strong>' + escapeHtml(row.title) + '</strong><small>' + escapeHtml(row.detail) + '</small></div><span class="admin-badge admin-badge--' + row.klass + '">' + escapeHtml(row.label) + '</span><em>›</em></button>';
        }).join("");
      }

      // Update chart dynamically
      var chartContainer = busPanel.querySelector(".dashboard-chart__bars");
      var gridContainer = busPanel.querySelector(".dashboard-chart__grid");
      if (chartContainer && data.business.revenueTrend && data.business.revenueTrend.length > 0) {
        var trend = compressTrend(data.business.revenueTrend, 15);
        var maxRevenue = Math.max.apply(null, trend.map(function(p) { return p.revenue; })) || 1;
        var maxOrders = Math.max.apply(null, trend.map(function(p) { return p.orderCount; })) || 1;

        chartContainer.innerHTML = trend.map(function(p) {
          var pctBar = p.revenue > 0 ? Math.max(4, Math.round((p.revenue / maxRevenue) * 100)) : 0;
          var pctOrders = p.orderCount > 0 ? Math.max(4, Math.round((p.orderCount / maxOrders) * 100)) : 0;
          return `
            <div style="--bar: ${pctBar}%; --orders: ${pctOrders}%;">
              <i title="Doanh thu: ${fmtMoney(p.revenue)}"></i>
              <b title="Số đơn: ${p.orderCount} đơn"></b>
              <span>${escapeHtml(p.dateStr)}</span>
            </div>
          `;
        }).join("");
        chartContainer.style.gridTemplateColumns = "repeat(" + trend.length + ", minmax(12px, 1fr))";

        if (gridContainer) {
          gridContainer.innerHTML = `
            <span>${fmtMoney(maxRevenue)}</span>
            <span>${fmtMoney(maxRevenue * 2 / 3)}</span>
            <span>${fmtMoney(maxRevenue / 3)}</span>
            <span>0</span>
          `;
        }
      }
    }
  }

  async function loadDashboard(params) {
    var token = getAccessToken();
    if (!token) {
      console.warn("[Dashboard] Không có access token, bỏ qua tải dữ liệu.");
      return;
    }
    try {
      var query = "";
      if (params && params.range) {
        query = "?range=" + params.range;
      } else if (params && params.from && params.to) {
        query = "?from=" + params.from + "&to=" + params.to;
      } else {
        var activeRangeBtn = document.querySelector("[data-dashboard-range].is-active");
        var activeRange = activeRangeBtn ? activeRangeBtn.dataset.dashboardRange : "week";
        if (activeRange !== "custom") {
          query = "?range=" + activeRange;
        } else {
          var fromVal = document.querySelector("[data-dashboard-date-from]").value;
          var toVal = document.querySelector("[data-dashboard-date-to]").value;
          if (fromVal && toVal) {
            query = "?from=" + fromVal + "&to=" + toVal;
          }
        }
      }

      var response = await fetch(API_BASE_URL + "/api/admin/dashboard" + query, {
        headers: {
          authorization: "Bearer " + token,
          accept: "application/json"
        }
      });
      if (!response.ok) {
        var errBody = null;
        try { errBody = await response.json(); } catch { /* ignore */ }
        var errMsg = errBody?.error?.message || "Không thể tải dữ liệu dashboard (HTTP " + response.status + ")";
        throw new Error(errMsg);
      }
      var data = await response.json();
      currentDashboardData = data;
      updateDashboardUI(data);
      root.querySelectorAll(".dashboard-kpi--loading").forEach(function (card) { card.classList.remove("dashboard-kpi--loading"); });
    } catch (err) {
      loadError = true;
      console.error("[Dashboard] Load error:", err);
      var dataStatus = document.querySelector("[data-dashboard-data-status]");
      if (dataStatus) dataStatus.innerHTML = '<span class="dashboard-data-status__dot dashboard-data-status__dot--error"></span><strong>Không thể xác minh dữ liệu</strong><span>' + escapeHtml(err.message || "Lỗi kết nối tới server") + '</span>';
      root.querySelectorAll(".dashboard-kpi--loading").forEach(function (card) { card.classList.remove("dashboard-kpi--loading"); });
      showToast(err.message || "Lỗi kết nối tới server");
    }
  }

  function openDrawer(type, insightKey) {
    var content = "";
    var title = "Cảnh báo vận hành";
    if (type === "alerts") {
      content = '<p class="admin-note">Cảnh báo được tổng hợp từ các phân hệ. Dashboard chỉ hiển thị các mục có mức ưu tiên cao nhất.</p><div class="dashboard-drawer-list"><a href="./returns-cskh.html"><strong>Yêu cầu đổi/trả mới nhận</strong><span>Mở CSKH</span></a><a href="./orders.html"><strong>Đơn hàng cần xử lý</strong><span>Mở đơn hàng</span></a><a href="./products.html"><strong>Sản phẩm dưới tồn tối thiểu</strong><span>Mở tồn kho</span></a><a href="./promotions.html"><strong>Chiến dịch khuyến mãi hoạt động</strong><span>Mở khuyến mãi</span></a><a href="./reviews.html"><strong>Đánh giá chưa phản hồi</strong><span>Mở đánh giá</span></a></div>';
    } else if (type === "definitions") {
      title = "Công thức và nguồn dữ liệu";
      var definitions = currentDashboardData?.meta?.definitions || {};
      content = '<p class="admin-note">Mỗi KPI được tính trực tiếp trong PostgreSQL, theo múi giờ Việt Nam và cùng một khoảng lọc. Đơn hủy/hoàn không đóng góp doanh thu, danh mục hay sản phẩm bán chạy.</p><div class="dashboard-definition-list">' + [
        ["Doanh thu", definitions.revenue],
        ["Giá trị đơn trung bình", definitions.averageOrderValue],
        ["Tỷ lệ hoàn tất", definitions.completionRate],
        ["Doanh thu khuyến mãi", definitions.promotionRevenue]
      ].map(function (row) { return '<div><strong>' + escapeHtml(row[0]) + '</strong><span>' + escapeHtml(row[1] || "Chưa có định nghĩa") + '</span></div>'; }).join("") + '</div>';
    } else {
      var business = currentDashboardData?.business || {};
      var insightData = business.insights || {};
      var topCategory = business.categoryContributions?.[0];
      var promoAovPct = insightData.promotionAovPct;
      var lowStockBest = Number(insightData.lowStockBestSellers || 0);
      var newVoucher = insightData.newCustomerVoucher || {};
      var insights = {
        category: { title: topCategory ? topCategory.name + " dẫn đầu doanh thu" : "Chưa có doanh thu theo danh mục", description: topCategory ? "Xếp hạng được tính từ order_item của các đơn hợp lệ trong đúng khoảng đang chọn." : "Không có đơn hợp lệ để xếp hạng danh mục.", first: topCategory ? fmtPercent(topCategory.pct) + "%" : "0%", second: topCategory ? fmtMoney(topCategory.revenue) : "0", action: "./products.html", actionLabel: "Xem sản phẩm" },
        aov: { title: "So sánh AOV khuyến mãi", description: promoAovPct === null || promoAovPct === undefined ? "Chưa đủ cả hai nhóm đơn để so sánh." : "So sánh AOV đơn có voucher/giảm giá với đơn không khuyến mãi trong cùng kỳ.", first: promoAovPct === null || promoAovPct === undefined ? "Chưa đủ dữ liệu" : fmtPercent(promoAovPct) + "%", second: fmtMoney(business.averageOrderValue || 0), action: "./promotions.html", actionLabel: "Xem khuyến mãi" },
        stock: { title: "Tồn kho của sản phẩm bán chạy", description: "Tồn kho được cộng từ toàn bộ biến thể và đối chiếu với tổng ngưỡng tồn tối thiểu của sản phẩm.", first: fmtNum(lowStockBest), second: "sản phẩm", action: "./products.html", actionLabel: "Xem tồn kho" },
        voucher: { title: "Hiệu suất voucher khách mới", description: newVoucher.usagePct === null || newVoucher.usagePct === undefined ? "Chưa có đủ usage_limit_total và used_count để tính tỷ lệ." : "Tỷ lệ được tính từ lượt đã dùng chia hạn mức phát hành.", first: newVoucher.usagePct === null || newVoucher.usagePct === undefined ? "Chưa đủ dữ liệu" : fmtPercent(newVoucher.usagePct) + "%", second: newVoucher.code || "Không có", action: "./promotions.html", actionLabel: "Xem voucher" }
      };
      var item = insights[insightKey] || insights.category;
      title = "Insight kinh doanh";
      content = '<span class="admin-badge admin-badge--warning">Dữ liệu đã kiểm chứng</span><h3 class="admin-drawer__section">' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.description) + '</p><div class="dashboard-drawer-metric"><div><small>Chỉ số</small><strong>' + escapeHtml(item.first) + '</strong></div><div><small>Giá trị liên quan</small><strong>' + escapeHtml(item.second) + '</strong></div></div><p class="admin-note">Kết quả phản ánh dữ liệu hiện có trong Supabase tại thời điểm tải dashboard.</p><a class="admin-btn admin-btn--secondary" href="' + item.action + '">' + item.actionLabel + '</a>';
    }
    overlay.innerHTML = '<div class="admin-drawer-backdrop" data-dashboard-close></div><aside class="admin-drawer admin-drawer--wide dashboard-drawer" aria-modal="true" role="dialog"><header class="admin-drawer__header"><div><small>TỔNG QUAN DASHBOARD</small><h2>' + title + '</h2></div><button class="admin-icon-button" type="button" data-dashboard-close aria-label="Đóng">×</button></header><div class="admin-drawer__body">' + content + '</div></aside>';
  }

  function toCsvRow(array) {
    return array.map(function (val) {
      var s = String(val === null || val === undefined ? "" : val);
      if (s.indexOf(",") !== -1 || s.indexOf('"') !== -1 || s.indexOf("\n") !== -1) {
        s = '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(",");
  }

  function exportToExcel(data, typeIndex, period) {
    var rows = [];
    var dateStr = new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN");

    if (typeIndex === 0 || typeIndex === 2) {
      rows.push(toCsvRow(["BÁO CÁO TỔNG QUAN ĐIỀU HÀNH VELURA"]));
      rows.push(toCsvRow(["Khoảng thời gian", period]));
      rows.push(toCsvRow(["Ngày xuất báo cáo", dateStr]));
      rows.push("");
      rows.push(toCsvRow(["I. CHỈ SỐ VẬN HÀNH"]));
      rows.push(toCsvRow(["Chỉ số", "Số lượng", "Trạng thái"]));
      rows.push(toCsvRow(["Đơn hàng cần xử lý", data.operations.pendingOrders, "Cần xử lý"]));
      rows.push(toCsvRow(["Đơn hàng thanh toán lỗi", data.operations.paymentErrors, data.operations.paymentErrors > 0 ? "Khẩn cấp" : "Bình thường"]));
      rows.push(toCsvRow(["Phiếu đổi/trả cần xử lý", data.operations.openReturns, data.operations.openReturns > 0 ? "Khẩn cấp" : "Bình thường"]));
      rows.push(toCsvRow(["Phiếu hỗ trợ khách hàng", data.operations.openSupportTickets, data.operations.openSupportTickets > 0 ? "Cần chú ý" : "Bình thường"]));
      rows.push(toCsvRow(["Sản phẩm sắp hết hàng", data.operations.lowStockProducts, data.operations.lowStockProducts > 0 ? "Khẩn cấp" : "Bình thường"]));
      rows.push(toCsvRow(["Đánh giá cần duyệt", data.business.pendingReviews, "Bình thường"]));
      rows.push(toCsvRow(["Đánh giá tiêu cực", data.operations.urgentReviews, data.operations.urgentReviews > 0 ? "Khẩn cấp" : "Bình thường"]));
      rows.push("");
      rows.push(toCsvRow(["II. DANH SÁCH CÔNG VIỆC CẦN XỬ LÝ HÔM NAY"]));
      rows.push(toCsvRow(["STT", "Công việc", "Hạn xử lý", "Mức độ ưu tiên"]));
      rows.push(toCsvRow(["1", "Duyệt " + data.operations.openReturns + " phiếu đổi/trả cần xử lý", "Trong tuần này", "Cao"]));
      rows.push(toCsvRow(["2", "Kiểm tra " + data.operations.paymentErrors + " đơn thanh toán lỗi", "Cảnh báo hệ thống", "Cao"]));
      rows.push(toCsvRow(["3", "Phản hồi " + data.operations.urgentReviews + " đánh giá tiêu cực", "Trong hôm nay", "Vừa"]));
      rows.push(toCsvRow(["4", "Bổ sung tồn kho cho " + data.operations.lowStockProducts + " sản phẩm", "Tồn kho thấp", "Vừa"]));
    }

    if (typeIndex === 2) {
      rows.push("");
      rows.push("");
      rows.push("");
    }

    if (typeIndex === 1 || typeIndex === 2) {
      rows.push(toCsvRow(["BÁO CÁO HIỆU QUẢ KINH DOANH VELURA"]));
      rows.push(toCsvRow(["Khoảng thời gian", period]));
      rows.push(toCsvRow(["Ngày xuất báo cáo", dateStr]));
      rows.push("");
      rows.push(toCsvRow(["I. CHỈ SỐ KINH DOANH CHÍNH"]));
      rows.push(toCsvRow(["Chỉ số", "Giá trị"]));
      rows.push(toCsvRow(["Doanh thu", data.business.revenue + " VND"]));
      rows.push(toCsvRow(["Số lượng đơn hàng", data.business.orderCount]));
      rows.push(toCsvRow(["Giá trị đơn trung bình (AOV)", data.business.averageOrderValue + " VND"]));
      rows.push(toCsvRow(["Tỷ lệ hoàn thành đơn", (data.business.completionRate ?? 100) + "%"]));
      rows.push(toCsvRow(["Doanh thu đơn có khuyến mãi", data.business.promotionRevenue + " VND"]));
      rows.push("");

      rows.push(toCsvRow(["II. ĐÓNG GÓP DOANH THU THEO DANH MỤC"]));
      rows.push(toCsvRow(["Danh mục", "Doanh thu (VND)", "Tỷ lệ đóng góp (%)"]));
      if (data.business.categoryContributions) {
        data.business.categoryContributions.forEach(function (cat) {
          rows.push(toCsvRow([cat.name, cat.revenue, cat.pct + "%"]));
        });
      }
      rows.push("");

      rows.push(toCsvRow(["III. DANH SÁCH SẢN PHẨM BÁN CHẠY NHẤT"]));
      rows.push(toCsvRow(["STT", "Tên sản phẩm", "SKU", "Số lượng bán", "Doanh thu (VND)", "Trạng thái tồn kho"]));
      if (data.business.bestSellers) {
        data.business.bestSellers.forEach(function (prod, index) {
          rows.push(toCsvRow([index + 1, prod.name, prod.sku, prod.qty, prod.revenue, prod.stockStatus]));
        });
      }
      rows.push("");

      rows.push(toCsvRow(["IV. HIỆU QUẢ CHƯƠNG TRÌNH KHUYẾN MÃI"]));
      rows.push(toCsvRow(["Chỉ số", "Giá trị"]));
      rows.push(toCsvRow(["Đơn hàng có áp dụng khuyến mãi", data.business.promoOrdersCount]));
      rows.push(toCsvRow(["Tổng ngân sách đã giảm", data.business.totalDiscount + " VND"]));
      rows.push(toCsvRow(["Chiến dịch hiệu quả nhất", data.business.bestCampaign]));
      rows.push(toCsvRow(["Voucher dùng nhiều nhất", data.business.mostUsedVoucher]));
    }

    var csvContent = "\ufeff" + rows.join("\r\n");
    var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    var link = document.createElement("a");
    var url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    var filename = "Velura_Bao_Cao_" + (typeIndex === 0 ? "Dieu_Hanh" : typeIndex === 1 ? "Kinh_Doanh" : "Tong_Hop") + "_" + period.replace(/\s+/g, "_") + ".csv";
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function openReport() {
    overlay.innerHTML = '<div class="admin-modal-overlay" role="presentation"><section class="admin-modal admin-modal--lg" role="dialog" aria-modal="true" aria-labelledby="dashboard-report-title"><header class="admin-modal__header"><div><small>BÁO CÁO NHANH</small><h2 id="dashboard-report-title">Xuất báo cáo Dashboard</h2></div><button class="admin-icon-button" type="button" data-dashboard-close aria-label="Đóng">×</button></header><div class="admin-modal__body"><p>Chọn nội dung cần tổng hợp. Báo cáo sử dụng khoảng thời gian đang chọn trên Dashboard.</p><label class="admin-form-group"><span class="admin-form-label">Khoảng thời gian</span><select class="admin-form-control" data-report-period><option>Hôm nay</option><option selected>7 ngày qua</option><option>30 ngày qua</option><option>Tháng này</option></select></label><div class="dashboard-report-options"><label class="dashboard-report-option"><input type="radio" name="report-type" checked><span>Tổng quan điều hành<small>Cảnh báo, hàng đợi xử lý và tình trạng phân hệ.</small></span></label><label class="dashboard-report-option"><input type="radio" name="report-type"><span>Kết quả kinh doanh<small>Doanh thu, đơn hàng, sản phẩm và tác động khuyến mãi.</small></span></label><label class="dashboard-report-option"><input type="radio" name="report-type"><span>Báo cáo tổng hợp<small>Kết hợp hai góc nhìn trong một báo cáo.</small></span></label></div></div><footer class="admin-modal__footer"><button class="admin-btn admin-btn--ghost" type="button" data-dashboard-close>Hủy</button><button class="admin-btn admin-btn--secondary" type="button" data-dashboard-export>' + icon("download") + 'Xuất báo cáo</button></footer></section></div>';
  }

  document.addEventListener("click", function (event) {
    var tab = event.target.closest("[data-dashboard-tab]");
    if (tab) {
      var name = tab.dataset.dashboardTab;
      document.querySelectorAll("[data-dashboard-tab]").forEach(function (button) {
        var active = button === tab;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll("[data-dashboard-panel]").forEach(function (panel) { panel.hidden = panel.dataset.dashboardPanel !== name; });
      return;
    }

    var rangeButton = event.target.closest("[data-dashboard-range]");
    if (rangeButton) {
      var range = rangeButton.dataset.dashboardRange;
      document.querySelectorAll("[data-dashboard-range]").forEach(function (button) {
        var active = button === rangeButton;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      document.querySelector("[data-dashboard-custom-period]").hidden = range !== "custom";
      if (range !== "custom") {
        var rangeLabels = { day: "hôm nay", week: "tuần này", month: "tháng này" };
        showToast("Đã chuyển dữ liệu sang " + rangeLabels[range] + ".");
        loadDashboard({ range: range });
      }
      return;
    }

    var drawerTrigger = event.target.closest("[data-dashboard-drawer]");
    if (drawerTrigger) {
      openDrawer(drawerTrigger.dataset.dashboardDrawer, drawerTrigger.dataset.insight);
      return;
    }

    if (event.target.closest("[data-dashboard-definitions]")) {
      openDrawer("definitions");
      return;
    }

    if (event.target.closest("[data-dashboard-report]")) {
      openReport();
      return;
    }

    if (event.target.closest("[data-dashboard-export]")) {
      if (!currentDashboardData) {
        showToast("Không tìm thấy dữ liệu báo cáo để xuất.");
        return;
      }
      
      var period = currentDashboardData.periodDays + " ngày đã chọn (" + new Date(currentDashboardData.from).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) + " - " + new Date(currentDashboardData.to).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) + ")";
      
      var typeRadios = document.getElementsByName("report-type");
      var typeIndex = 0;
      for (var i = 0; i < typeRadios.length; i++) {
        if (typeRadios[i].checked) {
          typeIndex = i;
          break;
        }
      }
      
      exportToExcel(currentDashboardData, typeIndex, period);
      closeOverlay();
      showToast("Đã xuất báo cáo thành công.");
      return;
    }

    if (event.target.closest("[data-dashboard-close]")) {
      closeOverlay();
      return;
    }

    var refresh = event.target.closest("[data-dashboard-refresh]");
    if (refresh) {
      root.classList.add("dashboard-refreshing");
      refresh.disabled = true;
      loadDashboard().finally(function () {
        root.classList.remove("dashboard-refreshing");
        refresh.disabled = false;
        showToast("Dữ liệu Dashboard đã được làm mới.");
      });
      return;
    }

    var sideButton = event.target.closest("[data-dashboard-sidebar]");
    if (sideButton) {
      if (window.innerWidth > 768) {
        var collapsed = !root.classList.contains("admin-layout--sidebar-collapsed");
        root.classList.toggle("admin-layout--sidebar-collapsed", collapsed);
        sideButton.setAttribute("aria-expanded", String(!collapsed));
        sideButton.setAttribute("aria-label", collapsed ? "Mở sidebar" : "Đóng sidebar");
        sideButton.title = collapsed ? "Mở sidebar" : "Đóng sidebar";
      } else {
        var open = !sidebar.classList.contains("is-open");
        sidebar.classList.toggle("is-open", open);
        backdrop.hidden = !open;
        sideButton.setAttribute("aria-expanded", String(open));
      }
    }
  });

  backdrop.addEventListener("click", function () {
    sidebar.classList.remove("is-open");
    backdrop.hidden = true;
  });

  document.querySelector("[data-dashboard-custom-period]").addEventListener("submit", function (event) {
    event.preventDefault();
    var from = document.querySelector("[data-dashboard-date-from]").value;
    var to = document.querySelector("[data-dashboard-date-to]").value;
    if (!from || !to) {
      showToast("Vui lòng chọn đủ ngày bắt đầu và kết thúc.");
      return;
    }
    if (from > to) {
      showToast("Ngày bắt đầu không được sau ngày kết thúc.");
      return;
    }
    showToast("Đã áp dụng khoảng thời gian đã chọn.");
    loadDashboard({ from: from, to: to });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeOverlay();
  });

  loadDashboard();
}());
