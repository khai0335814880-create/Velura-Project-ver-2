import bannerA1 from "../../assets/images/banners/hot-banner-a1-birthday.png";
import bannerA2 from "../../assets/images/banners/hot-banner-a2-last-days.png";
import bannerA3 from "../../assets/images/banners/hot-banner-a3-combo.png";
import bannerA4 from "../../assets/images/banners/hot-banner-a4-loyal.png";
import bannerA5 from "../../assets/images/banners/hot-banner-a5-friend.png";
import bannerA6 from "../../assets/images/banners/hot-banner-a6-freeship.png";
import fallbackImage from "../../assets/images/placeholder.jpg";

const SLIDE_INTERVAL_MS = 4500;

const HOT_BANNERS = [
  {
    id: "A1",
    eyebrow: "ƯU ĐÃI CÁ NHÂN",
    title: "Tháng sinh nhật của bạn",
    description: "Voucher BDAY15 giảm 15% và quà bất ngờ trong tháng sinh nhật",
    ctaText: "Nhận quà ngay",
    ctaLink: "/src/pages/offers.html?offer=A1",
    imageSrc: bannerA1,
    imageAlt: "Tháng sinh nhật của bạn - Velura có quà nhỏ dành riêng",
    showCondition: null
  },
  {
    id: "A2",
    eyebrow: "CHỈ CÒN 2 NGÀY",
    title: "Chỉ còn 2 ngày",
    description: "Flash Sale ngắn hạn, giảm trực tiếp trên các sản phẩm được chọn",
    ctaText: "Xem ngay",
    ctaLink: "/src/pages/products/list.html?sale=true&campaign=flash-sale",
    imageSrc: bannerA2,
    imageAlt: "Chỉ còn 2 ngày - ưu đãi Flash Sale tháng này",
    showCondition: null
  },
  {
    id: "A3",
    eyebrow: "PHỐI ĐỒ THÔNG MINH",
    title: "Combo Phối Đồ Tiết Kiệm",
    description: "Mua trọn set phối sẵn - tiết kiệm thêm 10%",
    ctaText: "Thêm vào giỏ trọn set",
    ctaLink: "/src/pages/collections.html?type=combo&offer=monthly-combo",
    imageSrc: bannerA3,
    imageAlt: "Combo phối đồ tiết kiệm - mua trọn set tiết kiệm thêm 10%",
    showCondition: null
  },
  {
    id: "A4",
    eyebrow: "DÀNH CHO MEMBER",
    title: "Khách hàng thân thiết",
    description: "Quyền lợi tự động theo tổng chi tiêu tích lũy",
    ctaText: "Xem quyền lợi",
    ctaLink: "/src/pages/offers.html?offer=A4",
    imageSrc: bannerA4,
    imageAlt: "Khách hàng thân thiết - quyền lợi theo tổng chi tiêu tích lũy",
    showCondition: null
  },
  {
    id: "A5",
    eyebrow: "CHIA SẺ CÙNG BẠN",
    title: "Một mình vui không bằng cả hai",
    description: "Bạn nhận 50.000đ, người mới nhận 30.000đ khi giới thiệu thành công",
    ctaText: "Chia sẻ ngay",
    ctaLink: "/src/pages/offers.html?offer=A5",
    imageSrc: bannerA5,
    imageAlt: "Rủ bạn bè - chia sẻ voucher cho bạn",
    showCondition: null
  },
  {
    id: "A6",
    eyebrow: "MIỄN PHÍ VẬN CHUYỂN",
    title: "FreeShip cho đơn từ 500k",
    description: "Miễn phí vận chuyển tiêu chuẩn toàn quốc cho đơn từ 500.000đ",
    ctaText: "Xem ngay",
    ctaLink: "/src/pages/offers.html?offer=A6",
    imageSrc: bannerA6,
    imageAlt: "FreeShip cho đơn từ 500k - áp dụng toàn quốc",
    showCondition: null
  }
];

export function initHotBannerSlider() {
  initHotOfferTicker();
  initHotOfferWidget();
  initOfferBannerList();

  document.querySelectorAll(".js-hot-banner-slider").forEach((root) => {
    if (root.closest(".hot-banner-section--home-legacy")) return;
    initSingleHotBannerSlider(root);
  });
}

function initSingleHotBannerSlider(root) {
  const track = root.querySelector(".js-hot-banner-track");
  const prevBtn = root.querySelector(".js-hot-banner-prev");
  const nextBtn = root.querySelector(".js-hot-banner-next");
  const dots = root.querySelector(".js-hot-banner-dots");
  const progress = root.querySelector(".js-hot-banner-progress");
  if (!track || !prevBtn || !nextBtn || !dots || !progress) return;

  const banners = root.dataset.showAll === "true" ? HOT_BANNERS : getVisibleBanners(getUserState());
  let currentIndex = 0;
  let timerId = null;
  let paused = false;

  if (!banners.length) {
    root.classList.add("hot-banner-slider--empty");
    track.innerHTML = `
      <div class="hot-banner-slider__empty">
        <span>Hiện chưa có ưu đãi nào phù hợp với bạn.</span>
      </div>
    `;
    prevBtn.hidden = true;
    nextBtn.hidden = true;
    dots.hidden = true;
    return;
  }

  track.innerHTML = banners.map(renderSlide).join("");
  installImageFallbacks(track);
  dots.innerHTML = banners.map((banner, index) => `
    <button class="hot-banner-slider__dot js-hot-banner-dot" type="button"
      aria-label="Xem banner ${escapeHtml(banner.id)}" data-index="${index}"></button>
  `).join("");

  const dotButtons = Array.from(dots.querySelectorAll(".js-hot-banner-dot"));

  const update = (index, resetProgress = true) => {
    currentIndex = (index + banners.length) % banners.length;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    dotButtons.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === currentIndex);
      dot.setAttribute("aria-current", dotIndex === currentIndex ? "true" : "false");
    });
    if (resetProgress) restartProgress(progress);
  };

  const next = () => update(currentIndex + 1);
  const prev = () => update(currentIndex - 1);

  const start = () => {
    if (timerId || paused || banners.length <= 1) return;
    timerId = window.setInterval(next, SLIDE_INTERVAL_MS);
    restartProgress(progress);
  };

  const stop = () => {
    if (!timerId) return;
    window.clearInterval(timerId);
    timerId = null;
  };

  const pause = () => {
    paused = true;
    stop();
    root.classList.add("is-paused");
  };

  const resume = () => {
    paused = false;
    root.classList.remove("is-paused");
    window.setTimeout(start, 1000);
  };

  prevBtn.addEventListener("click", () => {
    stop();
    prev();
    start();
  });

  nextBtn.addEventListener("click", () => {
    stop();
    next();
    start();
  });

  dotButtons.forEach((dot) => {
    dot.addEventListener("click", () => {
      stop();
      update(Number(dot.dataset.index || 0));
      start();
    });
  });

  root.addEventListener("mouseenter", pause);
  root.addEventListener("mouseleave", resume);
  root.addEventListener("focusin", pause);
  root.addEventListener("focusout", resume);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  update(0, false);
  start();
}

function initOfferBannerList() {
  const list = document.querySelector(".js-offer-banner-list");
  if (!list) return;

  const banners = getVisibleBanners(getUserState());
  list.innerHTML = banners.map((banner, index) => `
    <article class="offer-banner-row ${index % 2 === 1 ? "offer-banner-row--reverse" : ""}">
      <div class="offer-banner-row__copy">
        <span class="offer-banner-row__index">${escapeHtml(banner.id)}</span>
        <span class="offer-banner-row__eyebrow">${escapeHtml(banner.eyebrow || "ƯU ĐÃI VELURA")}</span>
        <h3 class="offer-banner-row__title">${escapeHtml(banner.title)}</h3>
        <p class="offer-banner-row__desc">${escapeHtml(banner.description)}</p>
        <p class="offer-banner-row__benefit"><strong>Quyền lợi:</strong> ${escapeHtml(getBannerBenefit(banner.id))}</p>
        <p class="offer-banner-row__condition">${escapeHtml(getBannerCondition(banner.id))}</p>
        <a class="offer-banner-row__cta" href="${escapeHtml(banner.ctaLink)}" data-banner-id="${escapeHtml(banner.id)}">${escapeHtml(banner.ctaText)} →</a>
      </div>
      <a class="offer-banner-row__image-link" href="${escapeHtml(banner.ctaLink)}" aria-label="${escapeHtml(banner.title)}" data-banner-id="${escapeHtml(banner.id)}">
        <img class="offer-banner-row__image" data-banner-src="${escapeHtml(banner.imageSrc)}" alt="${escapeHtml(banner.imageAlt)}"
          loading="${index < 2 ? "eager" : "lazy"}" decoding="async" />
      </a>
    </article>
  `).join("");
  installImageFallbacks(list);
}

function getBannerBenefit(id) {
  return {
    A1: "Giảm 15%, tối đa 300.000đ trong tháng sinh nhật.",
    A2: "Giá sản phẩm đã giảm trực tiếp trong thời gian Flash Sale.",
    A3: "Mua đủ set được giảm thêm 10%.",
    A4: "Mở khóa quyền lợi theo tổng chi tiêu tích lũy.",
    A5: "Bạn nhận 50.000đ, người mới nhận 30.000đ khi đủ điều kiện.",
    A6: "Miễn phí vận chuyển cho đơn từ 500.000đ."
  }[id] || "Quyền lợi theo chương trình đang áp dụng.";
}

function getBannerCondition(id) {
  return {
    A1: "Cần ngày sinh hợp lệ để kích hoạt ưu đãi.",
    A2: "Chỉ áp dụng cho sản phẩm còn hàng trong chương trình.",
    A3: "Cần mua đủ các sản phẩm bắt buộc trong set.",
    A4: "Dành cho thành viên có lịch sử mua sắm tại Velura.",
    A5: "Thưởng được cấp sau khi người được giới thiệu hoàn tất đơn đầu tiên.",
    A6: "Áp dụng tự động khi tổng đơn đạt ngưỡng."
  }[id] || "Xem điều kiện chi tiết trong chương trình.";
}

function initHotOfferTicker() {
  const track = document.querySelector(".js-hot-offer-ticker-track");
  if (!track) return;

  const duplicated = [...HOT_BANNERS, ...HOT_BANNERS];
  track.innerHTML = duplicated.map((banner) => `
    <a class="hot-offer-ticker__item" href="${escapeHtml(banner.ctaLink)}" data-banner-id="${escapeHtml(banner.id)}">
      <span>${escapeHtml(banner.title)}</span>
    </a>
  `).join("");
}

function initHotOfferWidget() {
  const widget = document.querySelector(".js-hot-offer-widget");
  if (!widget) return;

  const list = widget.querySelector(".js-hot-offer-widget-list");
  const count = widget.querySelector(".js-hot-offer-widget-count");
  if (!list) return;

  const banners = getVisibleBanners(getUserState());
  const preview = banners.length ? banners.slice(0, 4) : HOT_BANNERS.slice(0, 4);

  if (count) count.textContent = `${banners.length || HOT_BANNERS.length} tin`;
  list.innerHTML = preview.map((banner) => `
    <a class="hot-offer-widget__item" href="${escapeHtml(banner.ctaLink)}" data-banner-id="${escapeHtml(banner.id)}">
      <img data-banner-src="${escapeHtml(banner.imageSrc)}" alt="" loading="lazy" decoding="async" />
      <span>
        <strong>${escapeHtml(banner.title)}</strong>
        <small>${escapeHtml(banner.description)}</small>
      </span>
    </a>
  `).join("");
  installImageFallbacks(list);
}

function getVisibleBanners(userState) {
  return HOT_BANNERS.filter((banner) => {
    const condition = banner.showCondition;
    if (!condition) return true;
    if (condition.birthdayThisMonth !== undefined && condition.birthdayThisMonth !== userState.birthdayThisMonth) {
      return false;
    }
    if (condition.hasItemsInCart !== undefined && condition.hasItemsInCart !== userState.hasItemsInCart) {
      return false;
    }
    if (condition.isFirstTimeVisitor !== undefined && condition.isFirstTimeVisitor !== userState.isFirstTimeVisitor) {
      return false;
    }
    return true;
  }).sort((a, b) => scoreBanner(b, userState) - scoreBanner(a, userState));
}

function getUserState() {
  const profile = readJson("velura_user") || readJson("velura_profile") || {};
  const cart = readJson("velura_cart") || readJson("cart") || [];
  const cartItems = Array.isArray(cart) ? cart : (Array.isArray(cart.items) ? cart.items : []);
  const cartValue = cartItems.reduce((sum, item) => sum + Number(item.price || item.unit_price || 0) * Number(item.quantity || 1), 0);
  return {
    birthdayThisMonth: isBirthdayThisMonth(),
    hasItemsInCart: getCartCount() > 0,
    isFirstTimeVisitor: !localStorage.getItem("velura_has_visited"),
    hasBirthday: Boolean(profile.date_of_birth || profile.birthday || profile.birthdate || profile.dob),
    cartValue,
    hasStyleProfile: Boolean(readJson("velura_style_profile") || readJson("velura_style_profile_results")),
    isMember: Boolean(localStorage.getItem("velura_token"))
  };
}

function scoreBanner(banner, state) {
  const scores = { A1: 20, A2: 10, A3: 12, A4: 8, A5: 6, A6: 9 };
  let score = scores[banner.id] || 0;
  if (banner.id === "A1" && !state.hasBirthday) score += 30;
  if (banner.id === "A1" && state.birthdayThisMonth) score += 45;
  if (banner.id === "A2" && state.hasItemsInCart) score += 8;
  if (banner.id === "A3" && state.hasStyleProfile) score += 16;
  if (banner.id === "A4" && state.isMember) score += 8;
  if (banner.id === "A6" && state.cartValue > 0 && state.cartValue < 500000) score += 32;
  if (banner.id === "A6" && state.cartValue >= 500000) score -= 10;
  return score;
}

function isBirthdayThisMonth() {
  const candidates = [
    readJson("velura_user"),
    readJson("velura_profile"),
    readJson("velura_style_profile")
  ].filter(Boolean);
  const birthValue = candidates
    .map((item) => item.birthdate || item.birthday || item.date_of_birth || item.dob || item.birth_date)
    .find(Boolean);
  if (!birthValue) return false;

  const parsed = new Date(birthValue);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getMonth() === new Date().getMonth();
}

function getCartCount() {
  const directCount = Number(localStorage.getItem("velura_cart_count") || 0);
  if (directCount > 0) return directCount;

  const cart = readJson("velura_cart") || readJson("cart") || [];
  if (Array.isArray(cart)) {
    return cart.reduce((total, item) => total + Number(item.quantity || 1), 0);
  }
  if (cart && Array.isArray(cart.items)) {
    return cart.items.reduce((total, item) => total + Number(item.quantity || 1), 0);
  }

  const badge = document.querySelector(".cart-badge");
  const badgeCount = Number(badge?.textContent?.trim() || 0);
  return Number.isFinite(badgeCount) ? badgeCount : 0;
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function renderSlide(banner, index) {
  return `
    <article class="hot-banner-slide" aria-label="${escapeHtml(banner.title)}">
      <a class="hot-banner-slide__link" href="${escapeHtml(banner.ctaLink)}" data-banner-id="${escapeHtml(banner.id)}">
        <img class="hot-banner-slide__image" data-banner-src="${escapeHtml(banner.imageSrc)}" alt="${escapeHtml(banner.imageAlt)}"
          loading="${index === 0 ? "eager" : "lazy"}" decoding="async" />
        <span class="hot-banner-slide__sr">
          ${escapeHtml(banner.title)}. ${escapeHtml(banner.description)}. ${escapeHtml(banner.ctaText)}.
        </span>
      </a>
    </article>
  `;
}

function installImageFallbacks(root) {
  root.querySelectorAll("img[data-banner-src]").forEach((image) => {
    const source = image.dataset.bannerSrc;
    let retryCount = 0;
    image.addEventListener("error", () => {
      retryCount += 1;
      if (retryCount <= 2) {
        const separator = source.includes("?") ? "&" : "?";
        window.setTimeout(() => { image.src = `${source}${separator}retry=${Date.now()}`; }, 250 * retryCount);
        return;
      }
      image.src = fallbackImage;
    });
    image.src = source;
  });
}

function restartProgress(progress) {
  progress.style.animation = "none";
  progress.offsetHeight;
  progress.style.animation = `hotBannerProgress ${SLIDE_INTERVAL_MS}ms linear forwards`;
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
