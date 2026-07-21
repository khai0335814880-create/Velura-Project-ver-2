import bannerA1 from "../../assets/images/banners/hot-banner-a1-birthday.png";
import bannerA4 from "../../assets/images/banners/hot-banner-a4-loyal.png";
import bannerA5 from "../../assets/images/banners/hot-banner-a5-friend.png";
import bannerA6 from "../../assets/images/banners/hot-banner-a6-freeship.png";
import fallbackImage from "../../assets/images/placeholder.jpg";

import { apiRequest, isSessionValid } from "./api.js";

const OFFER_IDS_WITH_MODAL = new Set(["A1", "A4", "A5", "A6"]);
const BIRTHDAY_VOUCHER_CODE = "BDAY15";
const PRODUCT_LIST_URL = "/src/pages/products/list.html";
const OFFERS_URL = "/src/pages/offers.html";
const MY_OFFERS_URL = "/src/pages/account/profile.html?tab=offers";
const PENDING_BIRTHDAY_KEY = "velura_pending_birthday";

export function initMonthlyOffers() {
  document.addEventListener("click", handleOfferClick);
  openOfferFromQuery();
}

function handleOfferClick(event) {
  const target = event.target.closest("[data-banner-id]");
  if (!target) return;

  const offerId = String(target.dataset.bannerId || "").trim().toUpperCase();
  if (!offerId) return;

  if (offerId === "A2") {
    event.preventDefault();
    window.location.href = `${PRODUCT_LIST_URL}?sale=true&campaign=flash-sale`;
    return;
  }

  if (offerId === "A3") {
    event.preventDefault();
    window.location.href = "/src/pages/collections.html?type=combo&offer=monthly-combo";
    return;
  }

  if (OFFER_IDS_WITH_MODAL.has(offerId)) {
    event.preventDefault();
    openMonthlyOfferFlow(offerId);
  }
}

function openOfferFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const offerId = normalizeOfferId(params.get("offer") || "");
  if (!OFFER_IDS_WITH_MODAL.has(offerId)) return;

  window.setTimeout(() => openMonthlyOfferFlow(offerId), 260);
}

function normalizeOfferId(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized.startsWith("A1") || normalized.includes("BIRTHDAY")) return "A1";
  if (normalized.startsWith("A4") || normalized.includes("LOYALTY")) return "A4";
  if (normalized.startsWith("A5") || normalized.includes("REFERRAL")) return "A5";
  if (normalized.startsWith("A6") || normalized.includes("FREESHIP")) return "A6";
  return normalized;
}

async function openMonthlyOfferFlow(offerId) {
  try {
    if (offerId === "A1") {
      await openBirthdayFlow();
      return;
    }
    if (offerId === "A4") {
      await openLoyaltyFlow();
      return;
    }
    if (offerId === "A5") {
      await openReferralFlow();
      return;
    }
    if (offerId === "A6") {
      openFreeshipModal();
    }
  } catch (error) {
    console.warn("[monthly-offers] Could not open offer flow:", error);
    openInfoModal({
      tone: "error",
      title: "Chưa mở được ưu đãi",
      body: `<p>Hệ thống chưa tải được thông tin ưu đãi ở thời điểm này. Bạn có thể thử lại sau ít phút hoặc liên hệ Velura qua hotline 1900 1212.</p>`,
      actions: [{ label: "Đóng", variant: "primary", onClick: closeOfferModal }]
    });
  }
}

async function openBirthdayFlow() {
  if (!isMember()) {
    openBirthdayCaptureModal(null, { isGuest: true, initialDate: getPendingBirthdayDate() });
    return;
  }

  const profile = await getFreshProfile();
  const birthday = getBirthdayDate(profile);
  if (!birthday) {
    openBirthdayCaptureModal(profile, { initialDate: getPendingBirthdayDate() });
    return;
  }

  openBirthdayConfirmModal(profile, birthday);
}

function openBirthdayGuestModal() {
  const redirect = encodeURIComponent(`${OFFERS_URL}?offer=A1`);
  openInfoModal({
    title: "Tháng sinh nhật của bạn, Velura có quà nhỏ",
    eyebrow: "Ưu đãi cá nhân",
    image: bannerA1,
    body: `
      <p>Velura không bắt bạn nhập ngày sinh ngay khi tạo tài khoản. Bạn có thể xem ưu đãi trước, sau đó đăng nhập để lưu ngày sinh và kích hoạt quà riêng.</p>
      ${renderBenefitCard({
        headline: "Quà sinh nhật dành cho bạn",
        items: [
          "Voucher BDAY15 giảm 15% trong tháng sinh nhật.",
          "Áp dụng cho đơn hàng từ 500.000đ, giảm tối đa 300.000đ.",
          "Tặng thêm một món quà bất ngờ trong đơn đầu tiên của tháng sinh nhật."
        ]
      })}
    `,
    actions: [
      { label: "Đăng nhập để nhận quà", variant: "primary", href: `/src/pages/auth/signin.html?redirect=${redirect}` },
      { label: "Tạo tài khoản mới", variant: "ghost", href: `/src/pages/auth/signup.html?redirect=${redirect}` }
    ]
  });
}

function openBirthdayCaptureModal(profile, options = {}) {
  const { isGuest = false, initialDate = null } = options;
  const selectedDay = initialDate?.getDate?.() || "";
  const selectedMonth = initialDate ? initialDate.getMonth() + 1 : "";
  const selectedYear = initialDate?.getFullYear?.() || "";
  openInfoModal({
    title: isGuest ? "Nhập sinh nhật để xem quà của bạn" : "Velura chưa biết sinh nhật của bạn",
    eyebrow: "Bổ sung thông tin",
    body: `
      <p>${isGuest
        ? "Bạn có thể nhập ngày sinh để xem trước ưu đãi. Khi bấm lưu, Velura sẽ yêu cầu đăng nhập để lưu thông tin vào tài khoản."
        : "Bổ sung ngày, tháng và năm sinh để Velura chuẩn bị ưu đãi đúng thời điểm, đồng thời cá nhân hóa hồ sơ mua sắm của bạn tốt hơn."
      }</p>
      ${renderBenefitCard({
        headline: "Quà sinh nhật dành cho bạn",
        items: [
          "15% cho đơn hàng trong tháng sinh nhật.",
          "Quà bất ngờ trong đơn hàng đầu tiên của tháng sinh nhật.",
          "Nhận thông báo ưu đãi vào đầu tháng sinh nhật."
        ],
        footer: "Đơn tối thiểu 500.000đ, giảm tối đa 300.000đ."
      })}
      <form class="monthly-offer-form js-birthday-form" novalidate>
        <div class="monthly-offer-form__grid monthly-offer-form__grid--birthdate">
          <label>
            <span>Ngày</span>
            <select name="day" required>
              <option value="">Ngày</option>
              ${renderNumberOptions(1, 31, selectedDay)}
            </select>
          </label>
          <label>
            <span>Tháng</span>
            <select name="month" required>
              <option value="">Tháng</option>
              ${renderNumberOptions(1, 12, selectedMonth, "Tháng ")}
            </select>
          </label>
          <label>
            <span>Năm sinh</span>
            <select name="year" required>
              <option value="">Năm sinh</option>
              ${renderBirthYearOptions(selectedYear)}
            </select>
          </label>
        </div>
        <p class="monthly-offer-form__hint">Ngày sinh được dùng để kích hoạt ưu đãi sinh nhật và cá nhân hóa hồ sơ, không dùng để gửi spam.</p>
        <p class="monthly-offer-form__error js-birthday-error" hidden></p>
      </form>
    `,
    actions: [
      { label: "Lưu và nhận ưu đãi", variant: "primary", onClick: () => submitBirthdayForm({ isGuest }) },
      { label: "Để sau", variant: "ghost", onClick: closeOfferModal }
    ]
  });
}

function renderNumberOptions(start, end, selectedValue = "", prefix = "") {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const value = start + index;
    const selected = Number(selectedValue) === value ? " selected" : "";
    return `<option value="${value}"${selected}>${escapeHtml(prefix)}${value}</option>`;
  }).join("");
}

function renderBirthYearOptions(selectedValue = "") {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= 1950; year -= 1) {
    const selected = Number(selectedValue) === year ? " selected" : "";
    years.push(`<option value="${year}"${selected}>${year}</option>`);
  }
  return years.join("");
}

async function submitBirthdayForm({ isGuest = false } = {}) {
  const form = document.querySelector(".js-birthday-form");
  const errorNode = document.querySelector(".js-birthday-error");
  const day = Number(form?.elements?.day?.value || 0);
  const month = Number(form?.elements?.month?.value || 0);
  const year = Number(form?.elements?.year?.value || 0);

  if (!isValidBirthDate(day, month, year)) {
    showInlineError(errorNode, "Bạn chọn giúp Velura ngày, tháng và năm sinh hợp lệ nhé.");
    return;
  }

  const date_of_birth = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  if (isGuest || !isMember()) {
    sessionStorage.setItem(PENDING_BIRTHDAY_KEY, date_of_birth);
    localStorage.removeItem(PENDING_BIRTHDAY_KEY);
    openBirthdayLoginRequiredModal(date_of_birth);
    return;
  }

  await saveBirthdayToProfile(date_of_birth, errorNode);
}

async function saveBirthdayToProfile(date_of_birth, errorNode) {
  setModalBusy(true);
  try {
    const updated = await apiRequest("/api/user/profile", {
      method: "PATCH",
      body: { date_of_birth }
    });
    const updatedProfile = { ...(getStoredUser() || {}), ...updated, date_of_birth };
    sessionStorage.removeItem(PENDING_BIRTHDAY_KEY);
    localStorage.removeItem(PENDING_BIRTHDAY_KEY);
    cacheProfile(updatedProfile);
    syncProfileBirthdayInDom(date_of_birth);
    const birthday = getBirthdayDate(updatedProfile) || new Date(date_of_birth);
    if (birthday.getMonth() === new Date().getMonth()) {
      openBirthdayActiveModal(updatedProfile);
    } else {
      openBirthdayCountdownModal(updatedProfile, birthday);
    }
  } catch (error) {
    showInlineError(errorNode, error.message || "Chưa lưu được ngày sinh. Bạn thử lại giúp Velura nhé.");
  } finally {
    setModalBusy(false);
  }
}

function openBirthdayLoginRequiredModal(dateOfBirth) {
  const redirect = encodeURIComponent(`${OFFERS_URL}?offer=A1`);
  openInfoModal({
    title: "Đăng nhập để lưu ưu đãi",
    eyebrow: "Cần tài khoản",
    body: `
      <p>Velura đã ghi nhận tạm ngày sinh ${escapeHtml(formatDateForDisplay(dateOfBirth))}. Để lưu vào hồ sơ và nhận ưu đãi sinh nhật, bạn cần đăng nhập hoặc tạo tài khoản.</p>
      ${renderBenefitCard({
        headline: "Sau khi đăng nhập",
        items: [
          "Ngày sinh sẽ được lưu vào hồ sơ tài khoản.",
          "Ưu đãi sinh nhật sẽ được kích hoạt đúng tháng.",
          "Thông tin sẽ đồng bộ với giao diện Profile."
        ]
      })}
    `,
    actions: [
      { label: "Đăng nhập", variant: "primary", href: `/src/pages/auth/signin.html?redirect=${redirect}` },
      { label: "Tạo tài khoản", variant: "ghost", href: `/src/pages/auth/signup.html?redirect=${redirect}` }
    ]
  });
}

function openBirthdayConfirmModal(profile, birthday) {
  const isoDate = toIsoDate(birthday);
  openInfoModal({
    title: "Xác nhận sinh nhật của bạn",
    eyebrow: "Ưu đãi sinh nhật",
    body: `
      <p>Velura đang ghi nhận ngày sinh của bạn là:</p>
      <div class="monthly-offer-voucher monthly-offer-voucher--date">
        <span>Ngày sinh trong hồ sơ</span>
        <strong>${escapeHtml(formatDateForDisplay(isoDate))}</strong>
        <small>Nếu thông tin chưa đúng, bạn có thể chỉnh lại trước khi nhận ưu đãi.</small>
      </div>
    `,
    actions: [
      { label: "Chỉnh lại", variant: "ghost", onClick: () => openBirthdayCaptureModal(profile, { initialDate: birthday }) },
      { label: "Xác nhận", variant: "primary", onClick: () => {
        if (birthday.getMonth() === new Date().getMonth()) {
          openBirthdayActiveModal(profile);
        } else {
          openBirthdayCountdownModal(profile, birthday);
        }
      }}
    ]
  });
}

function openBirthdayActiveModal(profile) {
  const name = profile?.full_name || "bạn";
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString("vi-VN");
  saveMyOffer({
    id: "birthday",
    code: BIRTHDAY_VOUCHER_CODE,
    title: "Voucher sinh nhật",
    description: "Giảm 15% cho đơn từ 500.000đ, giảm tối đa 300.000đ.",
    expires_at: endOfMonth
  });

  openInfoModal({
    title: "Velura đã ghi nhớ sinh nhật của bạn",
    eyebrow: "Ưu đãi đã sẵn sàng",
    image: bannerA1,
    body: `
      <p>Chúc mừng sinh nhật, ${escapeHtml(name)}! Ưu đãi dành riêng cho tháng này đã sẵn sàng.</p>
      <div class="monthly-offer-voucher">
        <span>Mã của bạn</span>
        <strong>${BIRTHDAY_VOUCHER_CODE}</strong>
        <small>Giảm 15% cho đơn từ 500.000đ, tối đa 300.000đ. Hiệu lực đến ${escapeHtml(endOfMonth)}.</small>
      </div>
      <p>Đơn hàng đầu tiên trong tháng sinh nhật có thể nhận thêm một món quà bất ngờ từ Velura.</p>
    `,
    actions: [
      { label: "Xem trong ưu đãi của tôi", variant: "ghost", href: MY_OFFERS_URL },
      { label: "Áp dụng và mua sắm ngay", variant: "primary", onClick: () => goShoppingWithVoucher(BIRTHDAY_VOUCHER_CODE) }
    ]
  });
}

function openBirthdayCountdownModal(profile, birthday) {
  const birthdayMonth = birthday.getMonth() + 1;
  openInfoModal({
    title: "Velura đã ghi nhớ sinh nhật của bạn",
    eyebrow: "Sinh nhật của bạn",
    body: `
      <p>Đến tháng ${birthdayMonth}, bạn sẽ nhận được ưu đãi sinh nhật riêng từ Velura.</p>
      <ul>
        <li>Voucher giảm 15% trong tháng sinh nhật.</li>
        <li>Một món quà bất ngờ trong đơn hàng đầu tiên của tháng sinh nhật.</li>
        <li>Thông báo chúc mừng và nhắc ưu đãi vào đầu tháng.</li>
      </ul>
    `,
    actions: [
      { label: "Xem ưu đãi đang có", variant: "primary", href: MY_OFFERS_URL },
      { label: "Đóng", variant: "ghost", onClick: closeOfferModal }
    ]
  });
}

async function openLoyaltyFlow() {
  if (!isMember()) {
    openInfoModal({
      title: "Mua nhiều, nhận nhiều hơn",
      eyebrow: "Khách hàng thân thiết",
      image: bannerA4,
      body: `
        <p>Quyền lợi thân thiết được tính theo tổng chi tiêu tích lũy của tài khoản, không yêu cầu đăng ký chương trình riêng.</p>
        ${renderTierList([
          ["Từ 500.000đ", "Miễn phí vận chuyển cho đơn đủ điều kiện."],
          ["Từ 2.000.000đ", "Nhận quà bất ngờ từ Velura."],
          ["Từ 3.000.000đ", "Nhận voucher hoàn 5% cho lần mua tiếp theo."],
          ["Từ 5.000.000đ", "Gói quà miễn phí và ưu tiên xử lý đơn."]
        ])}
      `,
      actions: [
        { label: "Tạo tài khoản để tích lũy", variant: "primary", href: `/src/pages/auth/signup.html?redirect=${encodeURIComponent(`${OFFERS_URL}?offer=A4`)}` },
        { label: "Xem sản phẩm", variant: "ghost", href: PRODUCT_LIST_URL }
      ]
    });
    return;
  }

  const profile = await getFreshProfile();
  const spending = Number(profile?.total_spent || profile?.lifetime_spend || 0);
  const nextTarget = spending >= 5000000 ? 5000000 : spending >= 3000000 ? 5000000 : spending >= 2000000 ? 3000000 : spending >= 500000 ? 2000000 : 500000;
  const progress = nextTarget ? Math.min(100, Math.round((spending / nextTarget) * 100)) : 100;

  openInfoModal({
    title: `Xin chào, ${profile?.full_name || "bạn"}`,
    eyebrow: "Tiến trình thân thiết",
    image: bannerA4,
    body: `
      <p>Velura đang ghi nhận quyền lợi thành viên dựa trên tổng chi tiêu tích lũy của tài khoản.</p>
      <div class="monthly-offer-progress">
        <span>Tổng chi tiêu hiện ghi nhận</span>
        <strong>${formatMoney(spending)}</strong>
        <div><i style="width: ${progress}%"></i></div>
        <small>${renderLoyaltyNextMessage(spending, nextTarget)}</small>
      </div>
      ${renderTierList([
        ["Từ 500.000đ", "Miễn phí vận chuyển cho đơn đủ điều kiện."],
        ["Từ 2.000.000đ", "Nhận quà bất ngờ."],
        ["Từ 3.000.000đ", "Voucher hoàn 5% cho lần mua tiếp theo."],
        ["Từ 5.000.000đ", "Gói quà miễn phí và ưu tiên xử lý đơn."]
      ])}
    `,
    actions: [
      { label: "Mua sắm để mở khóa quyền lợi", variant: "primary", href: PRODUCT_LIST_URL },
      { label: "Xem hồ sơ", variant: "ghost", href: "/src/pages/account/profile.html" }
    ]
  });
}

async function openReferralFlow() {
  if (!isMember()) {
    openInfoModal({
      title: "Rủ bạn bè, cả hai đều có quà",
      eyebrow: "Chia sẻ Velura",
      image: bannerA5,
      body: `
        <p>Bạn có thể xem điều kiện trước. Khi muốn tạo link giới thiệu riêng, hãy đăng nhập hoặc tạo tài khoản để hệ thống ghi nhận chính xác.</p>
        ${renderMetricGrid([
          ["Bạn của bạn", "Giảm 30.000đ cho đơn đầu tiên từ 300.000đ."],
          ["Bạn", "Nhận 50.000đ khi người bạn hoàn tất đơn đầu tiên."]
        ])}
        <form class="monthly-offer-form js-referral-form" novalidate>
          <label>
            <span>Đã có mã bạn bè?</span>
            <input name="referralCode" type="text" maxlength="48" placeholder="Nhập mã giới thiệu" />
          </label>
          <p class="monthly-offer-form__error js-referral-error" hidden></p>
        </form>
      `,
      actions: [
        { label: "Nhập mã giới thiệu", variant: "ghost", onClick: saveReferralCode },
        { label: "Tạo link giới thiệu của tôi", variant: "primary", href: `/src/pages/auth/signin.html?redirect=${encodeURIComponent(`${OFFERS_URL}?offer=A5`)}` }
      ]
    });
    return;
  }

  const profile = await getFreshProfile();
  const code = buildReferralCode(profile);
  const url = `${window.location.origin}/src/pages/auth/signup.html?ref=${encodeURIComponent(code)}`;
  openInfoModal({
    title: "Link giới thiệu của bạn",
    eyebrow: "Ưu đãi bạn bè",
    image: bannerA5,
    body: `
      <p>Gửi link này cho bạn bè. Mã sẽ được lưu trong 30 ngày để ghi nhận người giới thiệu khi bạn mới tạo tài khoản.</p>
      <div class="monthly-offer-link">
        <span>${escapeHtml(url)}</span>
      </div>
      ${renderMetricGrid([
        ["Người mới", "Nhận voucher 30.000đ cho đơn đầu tiên từ 300.000đ."],
        ["Bạn", "Nhận voucher 50.000đ sau khi bạn mới hoàn tất đơn đầu tiên."],
        ["Trạng thái", "Đang chờ dữ liệu thống kê từ hệ thống đơn hàng."]
      ])}
    `,
    actions: [
      { label: "Sao chép link", variant: "primary", onClick: () => copyVoucher(url, "Đã sao chép link chia sẻ") },
      { label: "Xem voucher của tôi", variant: "ghost", href: MY_OFFERS_URL }
    ]
  });
}

function openFreeshipModal() {
  const subtotal = getCartSubtotal();
  const target = 500000;
  const remaining = Math.max(0, target - subtotal);
  const progress = Math.min(100, Math.round((subtotal / target) * 100));
  openInfoModal({
    title: "Miễn phí vận chuyển từ 500.000đ",
    eyebrow: "Chính sách vận chuyển",
    image: bannerA6,
    body: `
      <div class="monthly-offer-progress">
        <span>${subtotal >= target ? "Bạn đã mở khóa Freeship" : `Còn ${formatMoney(remaining)} để mở khóa Freeship`}</span>
        <strong>${formatMoney(subtotal)} / ${formatMoney(target)}</strong>
        <div><i style="width: ${progress}%"></i></div>
        <small>${progress}% tiến trình</small>
      </div>
      ${renderMetricGrid([
        ["Đơn từ 500.000đ", "Miễn phí vận chuyển tiêu chuẩn toàn quốc."],
        ["Đơn dưới 500.000đ", "Phí vận chuyển tiêu chuẩn 30.000đ."],
        ["Nội thành", "Dự kiến giao trong 1–3 ngày làm việc."],
        ["Tỉnh thành khác", "Dự kiến giao trong 3–5 ngày làm việc."]
      ])}
    `,
    actions: [
      { label: "Mua sắm ngay", variant: "primary", href: PRODUCT_LIST_URL },
      { label: "Xem đầy đủ chính sách", variant: "ghost", href: "/src/pages/policies.html?tab=shipping" }
    ]
  });
}

function getCartSubtotal() {
  const cart = readJson("velura_cart") || readJson("cart") || [];
  const items = Array.isArray(cart) ? cart : (Array.isArray(cart.items) ? cart.items : []);
  return items.reduce((sum, item) => sum + Number(item.unit_price || item.price || 0) * Number(item.quantity || 1), 0);
}

function renderBenefitCard({ headline, items = [], footer = "" }) {
  return `
    <div class="monthly-offer-benefit">
      <strong>${escapeHtml(headline)}</strong>
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
      ${footer ? `<small>${escapeHtml(footer)}</small>` : ""}
    </div>
  `;
}

function renderTierList(items) {
  return `
    <div class="monthly-offer-tier-list">
      ${items.map(([label, text]) => `
        <div>
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(text)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderMetricGrid(items) {
  return `
    <div class="monthly-offer-metric-grid">
      ${items.map(([label, text]) => `
        <div>
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(text)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function openInfoModal({ title, eyebrow = "", image = "", body = "", actions = [], tone = "" }) {
  closeOfferModal();
  const modal = document.createElement("div");
  modal.className = `monthly-offer-modal ${tone ? `monthly-offer-modal--${tone}` : ""}`;
  modal.innerHTML = `
    <div class="monthly-offer-modal__overlay" data-offer-close></div>
    <section class="monthly-offer-modal__panel" role="dialog" aria-modal="true" aria-labelledby="monthly-offer-title">
      <button class="monthly-offer-modal__close" type="button" data-offer-close aria-label="Đóng">×</button>
      ${image ? `<img class="monthly-offer-modal__media" data-banner-src="${escapeAttribute(image)}" alt="" loading="lazy" decoding="async" />` : ""}
      ${eyebrow ? `<p class="monthly-offer-modal__eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
      <h2 class="monthly-offer-modal__title" id="monthly-offer-title">${escapeHtml(title)}</h2>
      <div class="monthly-offer-modal__body">${body}</div>
      <div class="monthly-offer-modal__actions">
        ${actions.map((action, index) => renderAction(action, index)).join("")}
      </div>
      <p class="monthly-offer-modal__toast js-offer-toast" hidden></p>
    </section>
  `;
  document.body.appendChild(modal);
  const modalImage = modal.querySelector(".monthly-offer-modal__media");
  if (modalImage) {
    const source = modalImage.dataset.bannerSrc;
    let retryCount = 0;
    modalImage.addEventListener("error", () => {
      retryCount += 1;
      if (retryCount <= 2) {
        const separator = source.includes("?") ? "&" : "?";
        window.setTimeout(() => { modalImage.src = `${source}${separator}retry=${Date.now()}`; }, 250 * retryCount);
        return;
      }
      modalImage.src = fallbackImage;
    });
    modalImage.src = source;
  }
  document.body.classList.add("has-monthly-offer-modal");

  modal.querySelectorAll("[data-offer-close]").forEach((node) => {
    node.addEventListener("click", () => {
      if (!modal.classList.contains("is-busy")) closeOfferModal();
    });
  });

  actions.forEach((action, index) => {
    if (typeof action.onClick !== "function") return;
    modal.querySelector(`[data-action-index="${index}"]`)?.addEventListener("click", action.onClick);
  });

  const firstFocusable = modal.querySelector("button, a, input, select");
  firstFocusable?.focus?.();
}

function renderAction(action, index) {
  const className = `monthly-offer-modal__action monthly-offer-modal__action--${action.variant || "ghost"}`;
  if (action.href) {
    return `<a class="${className}" href="${escapeAttribute(action.href)}">${escapeHtml(action.label)}</a>`;
  }
  return `<button class="${className}" type="button" data-action-index="${index}">${escapeHtml(action.label)}</button>`;
}

function closeOfferModal() {
  document.querySelector(".monthly-offer-modal")?.remove();
  document.body.classList.remove("has-monthly-offer-modal");
}

function setModalBusy(isBusy) {
  const modal = document.querySelector(".monthly-offer-modal");
  if (!modal) return;
  modal.classList.toggle("is-busy", isBusy);
  modal.querySelectorAll("button, input, select").forEach((node) => {
    node.disabled = isBusy;
  });
}

function showInlineError(node, message) {
  if (!node) return;
  node.textContent = message;
  node.hidden = false;
}

function showToast(message) {
  const toast = document.querySelector(".js-offer-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

async function getFreshProfile() {
  try {
    const profile = await apiRequest("/api/user/profile");
    cacheProfile(profile);
    return profile;
  } catch {
    return getStoredUser() || {};
  }
}

function cacheProfile(profile) {
  if (!profile || typeof profile !== "object") return;
  const current = getStoredUser() || {};
  localStorage.setItem("velura_user", JSON.stringify({ ...current, ...profile }));
  localStorage.setItem("velura_profile", JSON.stringify({ ...current, ...profile }));
}

function isMember() {
  return isSessionValid();
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("velura_user") || "null");
  } catch {
    return null;
  }
}

function getBirthdayDate(profile) {
  const value = profile?.date_of_birth || profile?.birthday || profile?.birthdate || profile?.dob;
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPendingBirthdayDate() {
  const value = sessionStorage.getItem(PENDING_BIRTHDAY_KEY) || localStorage.getItem(PENDING_BIRTHDAY_KEY);
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateForDisplay(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function syncProfileBirthdayInDom(dateOfBirth) {
  const dobInput = document.querySelector('.profile-form input[name="dob"]');
  if (dobInput) {
    dobInput.value = formatDateForDisplay(dateOfBirth);
  }
  window.dispatchEvent(new CustomEvent("velura:profile-updated", {
    detail: { date_of_birth: dateOfBirth }
  }));
}

function isValidBirthDate(day, month, year) {
  const currentYear = new Date().getFullYear();
  if (!day || !month || !year || year < 1950 || year > currentYear || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const test = new Date(year, month - 1, day);
  if (test.getFullYear() !== year || test.getMonth() !== month - 1 || test.getDate() !== day) {
    return false;
  }
  return test <= new Date();
}

function goShoppingWithVoucher(code) {
  localStorage.setItem("checkout_voucher_code", code);
  localStorage.setItem("velura_pending_voucher", code);
  window.location.href = PRODUCT_LIST_URL;
}

function saveMyOffer(offer) {
  const current = readJson("velura_my_offers") || [];
  const next = [
    ...current.filter((item) => item?.id !== offer.id && item?.code !== offer.code),
    { ...offer, saved_at: new Date().toISOString() }
  ];
  localStorage.setItem("velura_my_offers", JSON.stringify(next));
}

async function copyVoucher(value, successMessage = "Đã sao chép mã") {
  try {
    await navigator.clipboard.writeText(value);
    showToast(successMessage);
  } catch {
    showToast("Bạn có thể sao chép thủ công nội dung đang hiển thị.");
  }
}

function saveReferralCode() {
  const input = document.querySelector(".js-referral-form input[name='referralCode']");
  const error = document.querySelector(".js-referral-error");
  const value = String(input?.value || "").trim();
  if (!/^[a-zA-Z0-9_-]{4,48}$/.test(value)) {
    showInlineError(error, "Mã giới thiệu chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.");
    return;
  }
  localStorage.setItem("velura_referral_code", value);
  showToast("Đã lưu mã giới thiệu.");
}

function buildReferralCode(profile) {
  const userId = String(profile?.user_id || localStorage.getItem("user_id") || "member").slice(0, 8);
  const nameSlug = slugify(profile?.full_name || "velura");
  return `${userId}-${nameSlug}`;
}

function renderLoyaltyNextMessage(spending, nextTarget) {
  if (spending >= 5000000) return "Bạn đã ở mốc quyền lợi cao nhất hiện tại.";
  const remaining = Math.max(0, nextTarget - spending);
  return `Còn ${formatMoney(remaining)} để chạm mốc quyền lợi tiếp theo.`;
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "velura";
}

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeAttribute(text) {
  return escapeHtml(text).replace(/`/g, "&#96;");
}
