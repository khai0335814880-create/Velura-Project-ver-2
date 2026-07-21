import { apiRequest } from "./api.js";
import { showToast } from "./account-profile.js";
import { addToCart, getVariantImage } from "./cart.js";
import { updateWishlistBadge } from "./wishlist.js";
import { CATEGORY_IMAGE_MAP } from "./category-images.js";

/**
 * ES6 Module: Homepage Controller
 * Fetches and binds category list and featured products dynamically from the Supabase backend.
 */
export function initHomepage() {
  const isHomepage = document.querySelector(".categories-section") || document.querySelector(".products-section");
  if (!isHomepage) return;

  const categoriesGrid = document.querySelector(".categories-section__grid");
  const productsGrid = document.querySelector(".products-section__grid");

  // State
  let wishlistedProductIds = new Set();

  // Load Homepage Data
  async function loadData() {
    loadPolicyHighlights();

    // Fetch user wishlist first to set up active classes
    const token = localStorage.getItem("velura_token");
    if (token) {
      try {
        const wishlistData = await apiRequest("/api/user/wishlist");
        const items = wishlistData.items || [];
        wishlistedProductIds = new Set(items.map(item => item.product_id));
        localStorage.setItem("velura_wishlist_count", wishlistedProductIds.size);
        updateWishlistBadge();
      } catch (wishlistErr) {
        console.error("Failed to load wishlist for homepage:", wishlistErr);
      }
    } else {
      try {
        const guestIds = JSON.parse(localStorage.getItem("velura_guest_wishlist") || "[]");
        wishlistedProductIds = new Set(guestIds);
        updateWishlistBadge();
      } catch (guestErr) {
        wishlistedProductIds = new Set();
      }
    }

    try {
      // 1. Fetch categories
      if (categoriesGrid) {
        categoriesGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: var(--soft);">Đang tải danh mục...</div>`;
        const categories = await apiRequest("/api/user/categories");
        renderCategories(categories);
      }

      // Fetch products once to be shared across widgets
      let products = [];
      try {
        products = await apiRequest("/api/user/products");
        products = products.filter(p => {
          const nameLower = (p.name || "").toLowerCase();
          return !nameLower.includes("test") && !nameLower.includes("validation") && !nameLower.includes("commit");
        });
      } catch (prodErr) {
        console.error("Failed to fetch products for homepage:", prodErr);
      }

        // Get featured products that have sales, sorted by sold_count DESC
        const activeFeatured = products
          .filter(p => p.is_featured && (p.sold_count || 0) > 0)
          .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
        
        // Get featured products that do not have sales yet
        const quietFeatured = products
          .filter(p => p.is_featured && (p.sold_count || 0) === 0);

        // Combine both lists and take the top 8 (best-selling will always appear first)
        const productsToRender = [...activeFeatured, ...quietFeatured].slice(0, 8);
        renderProducts(productsToRender);

      // 3. Fetch personalized products based on Style Profile body shape
      const personalizedSection = document.querySelector("#personalized-recommendations");
      const personalizedGrid = document.querySelector(".js-personalized-grid");
      const personalizedSubtitle = document.querySelector(".js-personalized-subtitle");
      
      if (personalizedSection && personalizedGrid && products.length > 0) {
        try {
          const profileRes = await apiRequest("/api/user/style-quiz");
          if (profileRes && (profileRes.quiz || profileRes.profile)) {
            const bodyShape = (profileRes.quiz || profileRes.profile).body_shape;
            if (bodyShape) {
              const matchedProds = products.filter(p => {
                const suitable = Array.isArray(p.suitable_body_shapes)
                  ? p.suitable_body_shapes.map(s => (s || "").toLowerCase())
                  : [];
                return suitable.includes((bodyShape || "").toLowerCase());
              }).slice(0, 4);

              if (matchedProds.length > 0) {
                const shapeMap = {
                  "Hourglass": "Đồng hồ cát", "Pear": "Quả lê", "Apple": "Quả táo", 
                  "Rectangle": "Chữ nhật", "Inverted Triangle": "Tam giác ngược"
                };
                if (personalizedSubtitle) {
                  personalizedSubtitle.textContent = `Các thiết kế được gợi ý riêng cho dáng người ${shapeMap[bodyShape] || bodyShape}`;
                }
                
                renderPersonalizedProducts(matchedProds, personalizedGrid);
                personalizedSection.style.display = "block";
              }
            }
          }
        } catch (quizErr) {
          // Guest or no style profile, hide section (already hidden)
        }
      }

      // 4. Render special collections
      const collectionsGrid = document.querySelector(".collections-section__grid");
      if (collectionsGrid && products.length > 0) {
        const uniqueColNames = [...new Set(products.map(p => p.collection).filter(Boolean))];
        renderSpecialCollections(uniqueColNames);
      }
    } catch (err) {
      console.error("Failed to load homepage data:", err);
    }
  }

  async function loadPolicyHighlights() {
    const cards = Array.from(document.querySelectorAll(".policies-section .policy-card"));
    if (!cards.length) return;

    try {
      const result = await apiRequest("/api/content/policies");
      const policies = result.rows || [];
      const bySlug = new Map(policies.map((policy) => [policy.slug, policy]));
      const highlights = [
        {
          policy: bySlug.get("shipping"),
          title: "Miễn phí vận chuyển",
          description: "Cho đơn hàng từ 500.000đ"
        },
        {
          policy: bySlug.get("returns"),
          title: "Đổi trả minh bạch",
          description: "Gửi yêu cầu trong 48 giờ"
        },
        {
          policy: bySlug.get("privacy"),
          title: "Bảo mật Style Quiz",
          description: "Dữ liệu dùng khép kín cho AI Stylist"
        }
      ];

      highlights.forEach((item, index) => {
        const card = cards[index];
        if (!card) return;
        const title = card.querySelector(".policy-card__title");
        const desc = card.querySelector(".policy-card__desc");
        if (title) title.textContent = item.title;
        if (desc) desc.textContent = item.description || item.policy?.summary || "";
      });
    } catch (error) {
      console.warn("Homepage policy highlights unavailable.", error);
    }
  }

  // Render categories with custom icons
  function renderCategories(categories) {
    if (!categoriesGrid) return;

    const iconMap = {
      ao: `
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#C97B63" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <!-- Áo blouse cổ tròn nữ -->
          <path d="M19 6c0 0-2 2-5 3L7 12l3 8h4v22h24V20h4l3-8-7-3c-3-1-5-3-5-3"/>
          <path d="M19 6c1.5 2.5 3.5 4 7 4s5.5-1.5 7-4"/>
          <!-- Đường kẻ ngang ngực -->
          <line x1="14" y1="26" x2="38" y2="26"/>
          <line x1="14" y1="32" x2="38" y2="32"/>
        </svg>
      `,
      quan: `
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#C97B63" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <!-- Quần short lưng cao -->
          <rect x="9" y="10" width="34" height="7" rx="2"/>
          <path d="M9 17l4 23h11l2-10 2 10h11l4-23"/>
          <!-- Dây rút -->
          <line x1="22" y1="10" x2="22" y2="7"/>
          <line x1="30" y1="10" x2="30" y2="7"/>
          <circle cx="22" cy="6" r="1.5"/>
          <circle cx="30" cy="6" r="1.5"/>
          <!-- Đường chi tiết -->
          <line x1="9" y1="21" x2="43" y2="21"/>
        </svg>
      `,
      "dam-vay": `
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#C97B63" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <!-- Đầm váy dây 2 bên -->
          <path d="M20 6h12"/>
          <!-- Dây váy 2 bên -->
          <line x1="20" y1="6" x2="17" y2="3"/>
          <line x1="32" y1="6" x2="35" y2="3"/>
          <!-- Thân váy trên -->
          <path d="M16 6h20v14H16z"/>
          <!-- Phần váy xoè -->
          <path d="M16 20 L6 48 h40 L36 20"/>
          <!-- Đường eo -->
          <line x1="14" y1="20" x2="38" y2="20"/>
        </svg>
      `,
      "ao-khoac": `
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#C97B63" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <!-- Áo khoác cardigan dài -->
          <path d="M19 5c0 0-2 2-6 3.5L7 12v30h12V20h10v22h12V12l-6-3.5C31 7 29 5 29 5"/>
          <path d="M19 5c1.5 2 3.5 3 7 3s5.5-1 7-3"/>
          <!-- Đường giữa áo khoác -->
          <line x1="26" y1="20" x2="26" y2="42"/>
          <!-- Túi -->
          <rect x="11" y="30" width="6" height="8" rx="1"/>
          <rect x="35" y="30" width="6" height="8" rx="1"/>
          <!-- Cổ áo chữ V -->
          <path d="M19 5 L26 18 L33 5"/>
        </svg>
      `,
      "set-do": `
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#C97B63" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <!-- Áo crop top -->
          <path d="M17 5c0 0-1.5 1.5-4 2.5L8 10l2 7h4v6h24v-6h4l2-7-5-2.5C33 6.5 31 5 31 5"/>
          <path d="M17 5c1.5 2 3.5 3 9 3s7.5-1 9-3"/>
          <!-- Quần cao eo -->
          <rect x="9" y="25" width="34" height="6" rx="2"/>
          <path d="M9 31l4 18h11l2-8 2 8h11l4-18"/>
        </svg>
      `,
      "phu-kien": `
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#C97B63" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <!-- Nơ bướm -->
          <path d="M26 26 C26 26 14 18 8 22 C4 25 8 30 14 28 C20 26 26 26 26 26"/>
          <path d="M26 26 C26 26 38 18 44 22 C48 25 44 30 38 28 C32 26 26 26 26 26"/>
          <path d="M26 26 C26 26 14 34 8 30 C4 27 8 22 14 24 C20 26 26 26 26 26"/>
          <path d="M26 26 C26 26 38 34 44 30 C48 27 44 22 38 24 C32 26 26 26 26 26"/>
          <!-- Nút giữa nơ -->
          <circle cx="26" cy="26" r="3"/>
        </svg>
      `,
      "giay-dep": `
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#C97B63" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <!-- Giày boots -->
          <path d="M14 10 L14 32 Q14 36 10 38 L8 44 h30 l-2-6 Q34 36 34 32 L34 24"/>
          <!-- Phần mũi giày -->
          <path d="M34 32 Q38 33 40 36 L42 44"/>
          <!-- Dây giày -->
          <line x1="14" y1="16" x2="34" y2="16"/>
          <line x1="14" y1="21" x2="34" y2="21"/>
          <line x1="14" y1="26" x2="34" y2="26"/>
          <!-- Lưỡi giày -->
          <path d="M14 10 h20 v6 Q28 18 26 16 Q22 18 20 16 Q18 18 16 16 Q14 16 14 14z"/>
          <!-- Đế giày -->
          <path d="M6 44 h40 Q47 47 44 48 H8 Q5 47 6 44z"/>
        </svg>
      `
    };

    const categoryImageMap = CATEGORY_IMAGE_MAP;

    categoriesGrid.innerHTML = categories.map(c => {
      const iconHtml = iconMap[c.slug] || `
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#C97B63" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M26 6L6 17l20 10 20-10-20-11zM6 37l20 10 20-10M6 27l20 10 20-10"/>
        </svg>
      `;
      const iconSrc = categoryImageMap[c.slug] || categoryImageMap.ao;

      return `
        <a href="/src/pages/products/list.html?category=${c.slug}" class="category-card">
          <div class="category-card__icon">
            <img src="${iconSrc}" alt="${c.name}" class="category-card__icon-img" loading="lazy" />
          </div>
          <span class="category-card__name">${c.name}</span>
          <span class="category-card__count">${c.product_count || 0} sản phẩm</span>
        </a>
      `;
    }).join("");

    setupHomepageCarousel(categoriesGrid, {
      label: "Danh mục nổi bật",
      scrollRatio: 0.75
    });
  }


  // Render featured products
  function renderProducts(products) {
    if (!productsGrid) return;

    const formatVND = (value) => {
      return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
    };

    productsGrid.innerHTML = products.map(product => {
      const priceVal = product.sale_price || product.base_price;
      const oldPriceVal = product.sale_price && product.base_price > product.sale_price ? product.base_price : null;

      const discountPercent = oldPriceVal ? Math.round((1 - priceVal / oldPriceVal) * 100) : 0;
      const isOutOfStock = product.status === "out_of_stock";

      let badgeHtml = "";
      if (isOutOfStock) {
        badgeHtml = `<span class="product-card__badge product-card__badge--out-of-stock" style="background:#555;color:#fff;">HẾT HÀNG</span>`;
      } else if (discountPercent > 0) {
        badgeHtml = `<span class="product-card__badge product-card__badge--sale">-${discountPercent}%</span>`;
      } else if (product.is_combo) {
        badgeHtml = `<span class="product-card__badge product-card__badge--new" style="background:#4A90E2;color:#fff;">COMBO</span>`;
      } else if ((product.sold_count || 0) > 0) {
        badgeHtml = `<span class="product-card__badge product-card__badge--best">BÁN CHẠY</span>`;
      } else if (product.is_featured) {
        badgeHtml = `<span class="product-card__badge product-card__badge--hot">NỔI BẬT</span>`;
      }

      const isWishlisted = wishlistedProductIds.has(product.product_id);
      const wishlistClass = isWishlisted ? "active" : "";

      const cardStyle = isOutOfStock ? "opacity: 0.6; filter: grayscale(100%); cursor: not-allowed;" : "";
      const linkTag = isOutOfStock ? "div" : "a";
      const linkHref = isOutOfStock ? "" : `href="/src/pages/products/detail.html?id=${product.product_id}"`;
      const hoverHtml = isOutOfStock ? 
        `<div class="product-card__img-hover" style="cursor: not-allowed;"><span class="btn-detail" style="background:#555; pointer-events:none;">Đã hết hàng</span></div>` :
        `<div class="product-card__img-hover">
              <a href="/src/pages/products/detail.html?id=${product.product_id}" class="btn-detail">Xem chi tiết</a>
            </div>`;

      const actionsHtml = isOutOfStock ? `
          <div class="product-card__actions" style="justify-content: center;">
            <span style="color: #555; font-weight: bold;">HẾT HÀNG</span>
          </div>
      ` : `
          <div class="product-card__actions">
            <a href="/src/pages/products/detail.html?id=${product.product_id}" class="btn-buy">
              <svg class="icon" width="16" height="16" style="fill: none; stroke: currentColor; stroke-width: 2;"><use href="#icon-bag"></use></svg>
              <span>Mua ngay</span>
            </a>
            <button class="product-card__btn-cart js-add-cart-home" type="button" title="Thêm vào giỏ hàng" data-id="${product.product_id}">
              <svg class="icon" width="18" height="18" style="fill: none; stroke: currentColor; stroke-width: 2;"><use href="#icon-cart"></use></svg>
            </button>
          </div>
      `;

      return `
        <article class="product-card" style="${cardStyle}" ${isOutOfStock ? "" : `data-detail-url="/src/pages/products/detail.html?id=${product.product_id}"`}>
          <div class="product-card__img-wrapper">
            ${badgeHtml}
            <${linkTag} ${linkHref} class="product-card__img-link">
              <img src="${product.images?.[0] || '/src/assets/images/placeholder.jpg'}" alt="${product.name}" class="product-card__img" />
            </${linkTag}>
            ${hoverHtml}
            <button class="btn-icon product-card__btn-wishlist card__wishlist-btn js-add-wishlist-home ${wishlistClass}" type="button" title="Thêm vào Wishlist" data-id="${product.product_id}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>

          <div class="product-card__info">
            <div class="product-card__rating">
              <span class="product-card__rating-star">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="color: #FFD700;">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </span>
              <span>${Number(product.rating_value || 0).toFixed(1)}</span>
              <span>(${product.rating_count || 0})</span>
            </div>
            <${linkTag} ${linkHref} class="product-card__title-link">
              <h3 class="product-card__title">${product.name}</h3>
            </${linkTag}>
            <div class="product-card__price-row">
              <span class="product-card__price">${formatVND(priceVal)}</span>
              ${oldPriceVal ? `<span class="product-card__price-old">${formatVND(oldPriceVal)}</span>` : ""}
            </div>
          </div>
          ${actionsHtml}
        </article>
      `;
    }).join("");

    bindHomeEvents(products);
    setupHomepageCarousel(productsGrid, {
      label: "Sản phẩm nổi bật",
      scrollRatio: 0.95,
      autoplay: "forward"
    });
  }

  // Bind cart/wishlist click events
  function bindHomeEvents(products) {
    bindProductCardNavigation(productsGrid);

    const wishlistBtns = productsGrid.querySelectorAll(".js-add-wishlist-home");
    wishlistBtns.forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const productId = btn.getAttribute("data-id");
        const isActive = btn.classList.contains("active");
        const token = localStorage.getItem("velura_token");

        try {
          if (token) {
            if (isActive) {
              await apiRequest(`/api/user/wishlist?product_id=${productId}`, { method: "DELETE" });
              btn.classList.remove("active");
              wishlistedProductIds.delete(productId);
              showToast("Đã xóa khỏi danh sách yêu thích");
            } else {
              await apiRequest("/api/user/wishlist", {
                method: "POST",
                body: { product_id: productId }
              });
              btn.classList.add("active");
              wishlistedProductIds.add(productId);
              showToast("Đã thêm vào danh sách yêu thích!");
            }
            localStorage.setItem("velura_wishlist_count", wishlistedProductIds.size);
          } else {
            let guestIds = [];
            try {
              guestIds = JSON.parse(localStorage.getItem("velura_guest_wishlist") || "[]");
            } catch {
              guestIds = [];
            }

            if (isActive) {
              guestIds = guestIds.filter(id => id !== productId);
              btn.classList.remove("active");
              wishlistedProductIds.delete(productId);
              showToast("Đã xóa khỏi danh sách yêu thích");
            } else {
              if (!guestIds.includes(productId)) {
                guestIds.push(productId);
              }
              btn.classList.add("active");
              wishlistedProductIds.add(productId);
              showToast("Đã thêm vào danh sách yêu thích!");
            }
            localStorage.setItem("velura_guest_wishlist", JSON.stringify(guestIds));
          }
          updateWishlistBadge();
        } catch (err) {
          showToast(err.message || "Không thể lưu sản phẩm");
        }
      });
    });

    const cartBtns = productsGrid.querySelectorAll(".js-add-cart-home");
    cartBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const productId = btn.getAttribute("data-id");
        const prod = products.find(x => x.product_id === productId);
        if (prod && prod.variants && prod.variants.length > 0) {
          const matchedVariant = prod.variants[0]; // Pick first variant as default
          addToCart({
            variant_id: matchedVariant.variant_id,
            product_id: prod.product_id,
            product_name: prod.name,
            product_image: getVariantImage(prod, matchedVariant.color || "Mặc định"),
            quantity: 1,
            unit_price: prod.sale_price || prod.base_price,
            color: matchedVariant.color || "Mặc định",
            size: matchedVariant.size || "M"
          });
        } else {
          showToast("Sản phẩm không có biến thể sẵn có.");
        }
      });
    });
  }

  // Render personalized body shape recommendations
  function renderPersonalizedProducts(products, gridEl) {
    const formatVND = (value) => {
      return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
    };

    gridEl.innerHTML = products.map(product => {
      const priceVal = product.sale_price || product.base_price;
      const oldPriceVal = product.sale_price && product.base_price > product.sale_price ? product.base_price : null;

      const discountPercent = oldPriceVal ? Math.round((1 - priceVal / oldPriceVal) * 100) : 0;
      const isOutOfStock = product.status === "out_of_stock";

      let badgeHtml = "";
      if (isOutOfStock) {
        badgeHtml = `<span class="product-card__badge product-card__badge--out-of-stock" style="background:#555;color:#fff;">HẾT HÀNG</span>`;
      } else if (discountPercent > 0) {
        badgeHtml = `<span class="product-card__badge product-card__badge--sale">-${discountPercent}%</span>`;
      } else if (product.is_combo) {
        badgeHtml = `<span class="product-card__badge product-card__badge--new" style="background:#4A90E2;color:#fff;">COMBO</span>`;
      } else if ((product.sold_count || 0) > 0) {
        badgeHtml = `<span class="product-card__badge product-card__badge--best">BÁN CHẠY</span>`;
      } else if (product.is_featured) {
        badgeHtml = `<span class="product-card__badge product-card__badge--hot">NỔI BẬT</span>`;
      }

      const isWishlisted = wishlistedProductIds.has(product.product_id);
      const wishlistClass = isWishlisted ? "active" : "";

      const cardStyle = isOutOfStock ? "opacity: 0.6; filter: grayscale(100%); cursor: not-allowed;" : "";
      const linkTag = isOutOfStock ? "div" : "a";
      const linkHref = isOutOfStock ? "" : `href="/src/pages/products/detail.html?id=${product.product_id}"`;
      const hoverHtml = isOutOfStock ? 
        `<div class="product-card__img-hover" style="cursor: not-allowed;"><span class="btn-detail" style="background:#555; pointer-events:none;">Đã hết hàng</span></div>` :
        `<div class="product-card__img-hover">
              <a href="/src/pages/products/detail.html?id=${product.product_id}" class="btn-detail">Xem chi tiết</a>
            </div>`;

      const actionsHtml = isOutOfStock ? `
          <div class="product-card__actions" style="justify-content: center;">
            <span style="color: #555; font-weight: bold;">HẾT HÀNG</span>
          </div>
      ` : `
          <div class="product-card__actions">
            <a href="/src/pages/products/detail.html?id=${product.product_id}" class="btn-buy">
              <svg class="icon" width="16" height="16" style="fill: none; stroke: currentColor; stroke-width: 2;"><use href="#icon-bag"></use></svg>
              <span>Mua ngay</span>
            </a>
            <button class="product-card__btn-cart js-add-cart-personalized" type="button" title="Thêm vào giỏ hàng" data-id="${product.product_id}">
              <svg class="icon" width="18" height="18" style="fill: none; stroke: currentColor; stroke-width: 2;"><use href="#icon-cart"></use></svg>
            </button>
          </div>
      `;

      return `
        <article class="product-card" style="${cardStyle}" ${isOutOfStock ? "" : `data-detail-url="/src/pages/products/detail.html?id=${product.product_id}"`}>
          <div class="product-card__img-wrapper">
            ${badgeHtml}
            <${linkTag} ${linkHref} class="product-card__img-link">
              <img src="${product.images?.[0] || '/src/assets/images/placeholder.jpg'}" alt="${product.name}" class="product-card__img" />
            </${linkTag}>
            ${hoverHtml}
            <button class="btn-icon product-card__btn-wishlist card__wishlist-btn js-add-wishlist-personalized ${wishlistClass}" type="button" title="Thêm vào Wishlist" data-id="${product.product_id}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>

          <div class="product-card__info">
            <div class="product-card__rating">
              <span class="product-card__rating-star">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="color: #FFD700;">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </span>
              <span>${Number(product.rating_value || 0).toFixed(1)}</span>
              <span>(${product.rating_count || 0})</span>
            </div>
            <${linkTag} ${linkHref} class="product-card__title-link">
              <h3 class="product-card__title">${product.name}</h3>
            </${linkTag}>
            <div class="product-card__price-row">
              <span class="product-card__price">${formatVND(priceVal)}</span>
              ${oldPriceVal ? `<span class="product-card__price-old">${formatVND(oldPriceVal)}</span>` : ""}
            </div>
          </div>
          ${actionsHtml}
        </article>
      `;
    }).join("");

    // Bind events
    bindProductCardNavigation(gridEl);

    const wishlistBtns = gridEl.querySelectorAll(".js-add-wishlist-personalized");
    wishlistBtns.forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const productId = btn.getAttribute("data-id");
        const isActive = btn.classList.contains("active");
        const token = localStorage.getItem("velura_token");

        try {
          if (token) {
            if (isActive) {
              await apiRequest(`/api/user/wishlist?product_id=${productId}`, { method: "DELETE" });
              btn.classList.remove("active");
              wishlistedProductIds.delete(productId);
              showToast("Đã xóa khỏi danh sách yêu thích");
            } else {
              await apiRequest("/api/user/wishlist", {
                method: "POST",
                body: { product_id: productId }
              });
              btn.classList.add("active");
              wishlistedProductIds.add(productId);
              showToast("Đã thêm vào danh sách yêu thích!");
            }
            localStorage.setItem("velura_wishlist_count", wishlistedProductIds.size);
          } else {
            let guestIds = [];
            try {
              guestIds = JSON.parse(localStorage.getItem("velura_guest_wishlist") || "[]");
            } catch {
              guestIds = [];
            }

            if (isActive) {
              guestIds = guestIds.filter(id => id !== productId);
              btn.classList.remove("active");
              wishlistedProductIds.delete(productId);
              showToast("Đã xóa khỏi danh sách yêu thích");
            } else {
              if (!guestIds.includes(productId)) {
                guestIds.push(productId);
              }
              btn.classList.add("active");
              wishlistedProductIds.add(productId);
              showToast("Đã thêm vào danh sách yêu thích!");
            }
            localStorage.setItem("velura_guest_wishlist", JSON.stringify(guestIds));
          }
          updateWishlistBadge();
        } catch (err) {
          showToast(err.message || "Không thể lưu sản phẩm");
        }
      });
    });

    const cartBtns = gridEl.querySelectorAll(".js-add-cart-personalized");
    cartBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const productId = btn.getAttribute("data-id");
        const prod = products.find(x => x.product_id === productId);
        if (prod && prod.variants && prod.variants.length > 0) {
          const matchedVariant = prod.variants[0];
          addToCart({
            variant_id: matchedVariant.variant_id,
            product_id: prod.product_id,
            product_name: prod.name,
            product_image: getVariantImage(prod, matchedVariant.color || "Mặc định"),
            quantity: 1,
            unit_price: prod.sale_price || prod.base_price,
            color: matchedVariant.color || "Mặc định",
            size: matchedVariant.size || "M"
          });
        } else {
          showToast("Sản phẩm không có biến thể sẵn có.");
        }
      });
    });
  }

  function bindProductCardNavigation(root) {
    if (!root) return;
    const cards = root.querySelectorAll(".product-card[data-detail-url]");
    cards.forEach(card => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("a, button, input, select, textarea, label")) return;
        window.location.href = card.dataset.detailUrl;
      });
    });
  }

  // Render special collections dynamically
  function renderSpecialCollections(uniqueColNames) {
    const collectionsGrid = document.querySelector(".collections-section__grid");
    if (!collectionsGrid) return;

    const COLLECTION_META = {
      'Soft Ceremony': {
        id: 'soft-ceremony',
        vnName: 'Soft Ceremony',
        badge: 'ELEGANT',
        story: 'Những thiết kế mềm mại, tinh tế cho những dịp tiệc nhẹ, hẹn hò và các buổi gặp gỡ đặc biệt — sang trọng, hiện đại, dễ ứng dụng.',
        banner: 'https://cdn.jsdelivr.net/gh/khai0335814880-create/Velura-Images@main/categories/set-do/velura_Soft-Ceremony_cover.png'
      },
      'The Urban Rhythm': {
        id: 'the-urban-rhythm',
        vnName: 'The Urban Rhythm',
        badge: 'CASUAL',
        story: 'Phom dáng hiện đại, đường cắt sắc sảo — bảng màu beige, charcoal, olive dễ mix-and-match cho cả ngày làm việc bận rộn lẫn buổi dạo phố cuối tuần.',
        banner: 'https://cdn.jsdelivr.net/gh/khai0335814880-create/Velura-Images@main/categories/set-do/Velura_urban-rythm_cover.png'
      },
      'Weekend Escape': {
        id: 'weekend-escape',
        vnName: 'Weekend Escape',
        badge: 'TRAVEL',
        story: 'Phom dáng nhẹ nhàng, chất liệu thoáng mát — dạo phố, cà phê hay du lịch đều thoải mái, thanh lịch trong mọi hành trình.',
        banner: 'https://cdn.jsdelivr.net/gh/khai0335814880-create/Velura-Images@main/categories/set-do/velura_Weekend-Escape_cover.png'
      },
      'Midnight Mirage': {
        id: 'midnight-mirage',
        vnName: 'Midnight Mirage',
        badge: 'STREET',
        story: 'Street style Hàn Quốc — Grunge, Campus Girl, Y2K Minimal. Bảng màu trung tính pha pastel, trẻ trung và dễ phối đồ mọi ngày.',
        banner: 'https://cdn.jsdelivr.net/gh/khai0335814880-create/Velura-Images@main/categories/set-do/velura_Midnight-Mirage_cover.png'
      },
      'The Afterglow': {
        id: 'the-afterglow',
        vnName: 'The Afterglow',
        badge: 'COUTURE',
        story: 'Dư âm vương giả — lụa satin, corset tinh tế và sắc hồng tulle cùng xanh Sapphire tôn vinh vẻ đẹp kiêu sa, lộng lẫy như một tiểu thư vương giả.',
        banner: 'https://cdn.jsdelivr.net/gh/khai0335814880-create/Velura-Images@main/categories/set-do/velura_The-Afterglow_cover.png'
      }
    };

    // Fixed display order — only show the 5 official collections, in this exact sequence
    const DISPLAY_ORDER = ['Soft Ceremony', 'The Urban Rhythm', 'Weekend Escape', 'Midnight Mirage', 'The Afterglow'];

    const getMeta = (name) => {
      return COLLECTION_META[name] || {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        vnName: name,
        badge: 'NEW',
        story: `Khám phá các thiết kế mới nhất nằm trong bộ sưu tập ${name} của Velura.`,
        banner: '/src/assets/images/about_02.jpg'
      };
    };

    if (uniqueColNames.length === 0) {
      collectionsGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: var(--soft);">Hiện chưa có bộ sưu tập nào hoạt động.</div>`;
      return;
    }

    // Render in fixed order — only collections that exist in DB AND are in DISPLAY_ORDER
    const orderedColNames = DISPLAY_ORDER.filter(name => uniqueColNames.includes(name));

    collectionsGrid.innerHTML = orderedColNames.map(colName => {
      const meta = getMeta(colName);
      return `
        <a href="/src/pages/collections.html?id=${meta.id}" class="collection-card" data-bind="collection.detail_url">
          <img src="${meta.banner}" alt="${meta.vnName}" class="collection-card__image" data-bind="collection.image_url" />
          <div class="collection-card__overlay"></div>
          <div class="collection-card__content">
            <span class="collection-card__badge" data-bind="collection.badge">${meta.badge}</span>
            <h3 class="collection-card__title" data-bind="collection.name">${meta.vnName}</h3>
            <p class="collection-card__desc" data-bind="collection.short_description">${meta.story}</p>
            <span class="collection-card__btn">Xem chi tiết &rarr;</span>
          </div>
        </a>
      `;
    }).join("");

    setupHomepageCarousel(collectionsGrid, {
      label: "Bộ sưu tập đặc biệt",
      scrollRatio: 0.9,
      autoplay: "backward"
    });
  }

  function setupHomepageCarousel(track, options = {}) {
    if (!track) return;

    const section = track.closest("section");
    if (!section) return;

    section.classList.add("home-carousel");
    track.classList.add("home-carousel__track");
    track.setAttribute("tabindex", "0");

    section.querySelectorAll(".home-carousel__arrow, .home-carousel__progress").forEach((el) => el.remove());

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "home-carousel__arrow home-carousel__arrow--prev";
    prevBtn.setAttribute("aria-label", `Trượt ${options.label || "nội dung"} sang trái`);
    prevBtn.innerHTML = `<span aria-hidden="true">‹</span>`;

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "home-carousel__arrow home-carousel__arrow--next";
    nextBtn.setAttribute("aria-label", `Trượt ${options.label || "nội dung"} sang phải`);
    nextBtn.innerHTML = `<span aria-hidden="true">›</span>`;

    const progress = document.createElement("div");
    progress.className = "home-carousel__progress";
    progress.setAttribute("aria-hidden", "true");
    progress.innerHTML = `<span class="home-carousel__progress-bar"></span>`;

    section.append(prevBtn, nextBtn, progress);

    const getScrollStep = () => Math.max(track.clientWidth * (options.scrollRatio || 0.85), 240);

    const updateState = () => {
      const maxScroll = Math.max(track.scrollWidth - track.clientWidth, 0);
      const current = Math.min(Math.max(track.scrollLeft, 0), maxScroll);
      const hasOverflow = maxScroll > 8;
      const progressBar = progress.querySelector(".home-carousel__progress-bar");
      const viewportRatio = hasOverflow ? Math.max(track.clientWidth / track.scrollWidth, 0.18) : 1;
      const travelRatio = hasOverflow ? current / maxScroll : 0;
      const maxTranslate = Math.max((1 / viewportRatio - 1) * 100, 0);

      section.classList.toggle("home-carousel--static", !hasOverflow);
      prevBtn.disabled = !hasOverflow || current <= 4;
      nextBtn.disabled = !hasOverflow || current >= maxScroll - 4;

      if (progressBar) {
        progressBar.style.width = `${viewportRatio * 100}%`;
        progressBar.style.transform = `translateX(${travelRatio * maxTranslate}%)`;
      }
    };

    prevBtn.addEventListener("click", () => {
      track.scrollBy({ left: -getScrollStep(), behavior: "smooth" });
    });

    nextBtn.addEventListener("click", () => {
      track.scrollBy({ left: getScrollStep(), behavior: "smooth" });
    });

    track.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState, { passive: true });
    requestAnimationFrame(updateState);
    setTimeout(updateState, 250);

    // --- AUTOPLAY LOGIC WITH DIRECTION & PAUSE ON HOVER ---
    let autoplayInterval = null;
    let isHovering = false;

    const startAutoplay = () => {
      if (!options.autoplay) return;
      stopAutoplay();
      autoplayInterval = setInterval(() => {
        if (isHovering) return;
        const maxScroll = Math.max(track.scrollWidth - track.clientWidth, 0);
        if (maxScroll <= 8) return;

        const step = getScrollStep();
        if (options.autoplay === "forward") {
          // Slide forward: if near the end, go smoothly to beginning, otherwise scroll next
          if (track.scrollLeft >= maxScroll - 16) {
            track.scrollTo({ left: 0, behavior: "smooth" });
          } else {
            track.scrollBy({ left: step, behavior: "smooth" });
          }
        } else if (options.autoplay === "backward") {
          // Slide backward: if near the beginning, go smoothly to the end, otherwise scroll prev
          if (track.scrollLeft <= 16) {
            track.scrollTo({ left: maxScroll, behavior: "smooth" });
          } else {
            track.scrollBy({ left: -step, behavior: "smooth" });
          }
        }
      }, 2500);
    };

    const stopAutoplay = () => {
      if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
      }
    };

    section.addEventListener("mouseenter", () => {
      isHovering = true;
    });

    section.addEventListener("mouseleave", () => {
      isHovering = false;
    });

    // Start sliding
    startAutoplay();
  }

  loadData();
}
