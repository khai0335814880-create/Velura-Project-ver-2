/**
 * Velura — Consolidated Account & Profile Logic
 */
import { apiRequest } from "./api.js";
import { addToCart, getVariantImage } from "./cart.js";
import { getCurrentRole, hasRealAuthSession } from "./auth-session.js";
import { locationData } from "./location-data.js";
import { createSearchDropdown } from "./search-dropdown.js";
import { isValidPhone } from "../utils/phone-validator.js";
import { supabaseConfig } from "../supabase-config.js";



export function initProfileForm() {
  if (!document.querySelector(".profile-page")) return;

  // 1. Tab Switching System
  initAccountTabs();

  if (document.querySelector(".profile-page") && !hasRealAuthSession()) {
    renderGuestProfileState();
    showGuestLoginModal();
    return;
  }

  // 2. Profile Details Form
  initProfileFormValidation();

  // 3. Address Manager
  initAddressManager();

  // 4. Order Filters
  initOrderFilter();

  // 5. Wishlist Management
  initWishlistActions();

  // 6. Settings & Style Profile Actions
  initSettingsAndStyleActions();
}

function renderGuestProfileState() {
  const dash = "-";

  document.querySelectorAll(".account-sidebar__name, .profile-avatar-name").forEach((el) => {
    el.textContent = dash;
  });

  document.querySelectorAll(".profile-form input, .profile-form select, .profile-form textarea").forEach((field) => {
    if (field.type === "radio" || field.type === "checkbox") {
      field.checked = false;
    } else {
      field.value = dash;
    }
    field.disabled = true;
  });

  document.querySelectorAll(
    ".profile-form button, .js-btn-add-address, .js-btn-save-settings, .js-remove-wishlist, .js-add-cart-fast"
  ).forEach((btn) => {
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
  });

  const addressList = document.querySelector(".address-list");
  if (addressList) addressList.innerHTML = `<p class="account-guest-empty">-</p>`;

  const ordersList = document.querySelector(".orders-list");
  if (ordersList) ordersList.innerHTML = `<p class="account-guest-empty">-</p>`;

  const wishlistGrid = document.getElementById("wishlist-product-grid");
  if (wishlistGrid) wishlistGrid.innerHTML = `<p class="account-guest-empty">-</p>`;

  const filledContainer = document.getElementById("js-style-profile-filled");
  const emptyContainer = document.getElementById("js-style-profile-empty");
  if (filledContainer) filledContainer.style.display = "none";
  if (emptyContainer) {
    emptyContainer.style.display = "";
    emptyContainer.querySelector("a").style.pointerEvents = "none";
    emptyContainer.querySelector("a").style.opacity = "0.5";
  }
}

function showGuestLoginModal() {
  if (hasRealAuthSession() || document.querySelector(".account-login-required-modal")) return;

  const modal = document.createElement("div");
  modal.className = "account-login-required-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `
    <div class="account-login-required-modal__card">
      <h2>BẠN CHƯA ĐĂNG NHẬP TRANG WEB</h2>
      <p>Đăng nhập để tiếp tục?</p>
      <div class="account-login-required-modal__actions">
        <a class="account-login-required-modal__btn account-login-required-modal__btn--primary" href="/src/pages/auth/signin.html">Đăng nhập</a>
        <button class="account-login-required-modal__btn account-login-required-modal__btn--secondary" type="button">Thoát</button>
      </div>
    </div>
  `;

  modal.querySelector("button").addEventListener("click", () => {
    window.location.href = "/index.html";
  });

  document.body.appendChild(modal);
}

/**
 * Tab Switching with Deep-linking support
 */
function initAccountTabs() {
  const sidebarLinks = document.querySelectorAll(".account-sidebar__link[data-tab]");
  const tabContents = document.querySelectorAll(".account-tab-content");

  if (sidebarLinks.length === 0) return;

  function switchTab(tabId) {
    // 1. Remove active state from all sidebar links and tab contents
    sidebarLinks.forEach(link => {
      if (link.getAttribute("data-tab") === tabId) {
        link.classList.add("is-active");
      } else {
        link.classList.remove("is-active");
      }
    });

    tabContents.forEach(content => {
      if (content.id === `tab-${tabId}`) {
        content.classList.add("is-active");
      } else {
        content.classList.remove("is-active");
      }
    });
  }

  // Bind click listeners
  sidebarLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const tabId = link.getAttribute("data-tab");
      switchTab(tabId);

      // Update URL query parameter without reloading page
      const url = new URL(window.location);
      url.searchParams.set("tab", tabId);
      window.history.pushState({}, "", url);
    });
  });

  // Check URL search params for direct tab landing
  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get("tab");
  if (initialTab && document.getElementById(`tab-${initialTab}`)) {
    switchTab(initialTab);
  }
}

/**
 * Profile form verification and submission
 */
const SOCIAL_SUPABASE_AUTH = supabaseConfig.url + "/auth/v1";
const SOCIAL_PKCE_KEY = "velura-oauth-pkce-code-verifier";
const SOCIAL_CALLBACK_URL = window.location.origin + "/src/pages/auth/auth-callback.html";

function generateSocialCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function computeSocialCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const array = new Uint8Array(digest);
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function startProfileSocialOAuth(provider) {
  const verifier = generateSocialCodeVerifier();
  const challenge = await computeSocialCodeChallenge(verifier);
  localStorage.setItem(SOCIAL_PKCE_KEY, verifier);
  const url = SOCIAL_SUPABASE_AUTH + "/authorize?provider=" + provider
    + "&code_challenge=" + encodeURIComponent(challenge)
    + "&code_challenge_method=s256"
    + "&redirect_to=" + encodeURIComponent(SOCIAL_CALLBACK_URL);
  window.location.href = url;
}

function getProviderAccount(profile, provider) {
  const accounts = profile?.social_accounts || profile?.socialAccounts || {};
  if (accounts && typeof accounts === "object" && !Array.isArray(accounts)) {
    const account = accounts[provider];
    if (account) {
      return {
        email: account.providerEmail || account.email || null,
        name: account.providerName || account.name || null
      };
    }
  }

  if (provider === "google") {
    return {
      email: profile?.googleEmail || profile?.google_email || null,
      name: profile?.googleName || profile?.google_name || null
    };
  }

  return {
    email: profile?.facebookEmail || profile?.facebook_email || null,
    name: profile?.facebookName || profile?.facebook_name || null
  };
}

function getProviderDisplayValue(provider, account) {
  if (provider === "facebook") {
    return account.email || account.name || "";
  }
  return account.email || "";
}

function renderSocialAccountLinks(profile = {}) {
  document.querySelectorAll("[data-social-provider]").forEach(row => {
    const provider = row.dataset.socialProvider;
    const desc = row.querySelector("[data-social-desc]");
    const button = row.querySelector("[data-social-action]");
    const account = getProviderAccount(profile, provider);
    const displayValue = getProviderDisplayValue(provider, account);
    const providerLabel = provider === "facebook" ? "Facebook" : "Google";
    const isLinked = Boolean(displayValue);

    if (desc) {
      desc.textContent = isLinked
        ? displayValue
        : `Chưa liên kết tài khoản ${providerLabel}`;
    }

    if (button) {
      button.textContent = isLinked ? "Hủy liên kết" : "Liên kết";
      button.classList.toggle("linked", isLinked);
      button.dataset.socialLinked = isLinked ? "true" : "false";
    }
  });
}

function loadProfileData(form) {
  apiRequest("/api/user/profile")
    .then(profile => {
      renderSocialAccountLinks(profile);

      const nameInput = form.querySelector('input[name="fullname"]');
      const phoneInput = form.querySelector('input[name="phone"]');
      const emailInput = form.querySelector('input[name="email"]');
      const dobInput = form.querySelector('input[name="dob"]');
      const avatarInput = createHiddenAvatarInput(form);
      
      if (nameInput) nameInput.value = profile.full_name || "";
      if (phoneInput) {
        phoneInput.value = profile.phone || "";
        phoneInput.readOnly = true;
      }
      if (emailInput) {
        emailInput.value = profile.email || "";
        emailInput.readOnly = true;
      }
      if (dobInput) dobInput.value = formatProfileDate(profile.date_of_birth);
      if (avatarInput) {
        avatarInput.value = profile.avatar || "";
      }

      form.querySelectorAll('input[name="gender"]').forEach((radio) => { radio.checked = false; });
      if (profile.gender) {
        const genderRadio = form.querySelector(`input[name="gender"][value="${profile.gender}"]`);
        if (genderRadio) genderRadio.checked = true;
      }

      cacheLiveProfile(profile);

      // Update names on UI
      const sidebarName = document.querySelector(".account-sidebar__name");
      if (sidebarName && profile.full_name) {
        const nameParts = profile.full_name.split(" ");
        sidebarName.textContent = nameParts.length >= 2 ? (nameParts[nameParts.length - 1] + " " + nameParts[0]) : profile.full_name;
      }
      const largeName = document.querySelector(".profile-avatar-name");
      if (largeName && profile.full_name) {
        largeName.textContent = profile.full_name;
      }
      
      const avatarMeta = document.querySelector(".profile-avatar-meta");
      if (avatarMeta) {
        if (profile.created_at) {
          const date = new Date(profile.created_at);
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          avatarMeta.textContent = `Thành viên từ tháng ${month}/${year} · 0 điểm tích lũy`;
        } else {
          avatarMeta.textContent = `Thành viên mới · 0 điểm tích lũy`;
        }
      }

      // Render user avatar (initials fallback or custom URL)
      renderUserAvatar(profile.avatar, profile.full_name);
    })
    .catch(err => {
      console.error("Failed to load profile:", err);
      if (err.status === 401 && !hasRealAuthSession()) {
        renderGuestProfileState();
        showGuestLoginModal();
      } else {
        // Fallback: load details from local storage user
        const rawUser = localStorage.getItem("velura_user");
        if (rawUser) {
          try {
            const profile = JSON.parse(rawUser);
            renderSocialAccountLinks(profile);

            const nameInput = form.querySelector('input[name="fullname"]');
            const phoneInput = form.querySelector('input[name="phone"]');
            const emailInput = form.querySelector('input[name="email"]');
            const dobInput = form.querySelector('input[name="dob"]');
            const avatarInput = createHiddenAvatarInput(form);
            
            if (nameInput) nameInput.value = profile.full_name || "";
            if (phoneInput) {
              phoneInput.value = profile.phone || "";
              phoneInput.readOnly = true;
            }
            if (emailInput) {
              emailInput.value = profile.email || "";
              emailInput.readOnly = true;
            }
            if (dobInput) dobInput.value = formatProfileDate(profile.date_of_birth);
            if (avatarInput) {
              avatarInput.value = profile.avatar || "";
            }

            form.querySelectorAll('input[name="gender"]').forEach((radio) => { radio.checked = false; });
            if (profile.gender) {
              const genderRadio = form.querySelector(`input[name="gender"][value="${profile.gender}"]`);
              if (genderRadio) genderRadio.checked = true;
            }

            // Update names on UI
            const sidebarName = document.querySelector(".account-sidebar__name");
            if (sidebarName && profile.full_name) {
              const nameParts = profile.full_name.split(" ");
              sidebarName.textContent = nameParts.length >= 2 ? (nameParts[nameParts.length - 1] + " " + nameParts[0]) : profile.full_name;
            }
            const largeName = document.querySelector(".profile-avatar-name");
            if (largeName && profile.full_name) {
              largeName.textContent = profile.full_name;
            }
            
            const avatarMeta = document.querySelector(".profile-avatar-meta");
            if (avatarMeta) {
              if (profile.created_at) {
                const date = new Date(profile.created_at);
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                avatarMeta.textContent = `Thành viên từ tháng ${month}/${year} · 0 điểm tích lũy`;
              } else {
                avatarMeta.textContent = `Thành viên mới · 0 điểm tích lũy`;
              }
            }

            // Render user avatar (initials fallback or custom URL)
            renderUserAvatar(profile.avatar, profile.full_name);
          } catch (e) {
            console.error("Failed to parse fallback user profile:", e);
          }
        } else {
          showToast("Không thể tải thông tin hồ sơ. Vui lòng thử lại sau.");
        }
      }
    });
}

/**
 * Avatar Initials Fallback and Image Rendering Helpers
 */
function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function renderUserAvatar(avatarUrl, fullName) {
  const sidebarAvatar = document.querySelector(".account-sidebar__avatar");
  const profileAvatar = document.querySelector(".profile-avatar-img");
  const avatarWrapper = document.querySelector(".profile-avatar-wrapper");
  const sidebarWrapper = document.querySelector(".account-sidebar__avatar-wrapper");

  const initials = getInitials(fullName);

  if (avatarUrl && avatarUrl.trim() !== "") {
    if (sidebarAvatar) {
      sidebarAvatar.src = avatarUrl;
      sidebarAvatar.style.display = "block";
    }
    if (profileAvatar) {
      profileAvatar.src = avatarUrl;
      profileAvatar.style.display = "block";
    }
    
    // Clean up initials placeholders if they exist
    const existingSidebarPlaceholder = sidebarWrapper?.querySelector(".avatar-placeholder");
    if (existingSidebarPlaceholder) existingSidebarPlaceholder.remove();
    
    const existingProfilePlaceholder = avatarWrapper?.querySelector(".avatar-placeholder");
    if (existingProfilePlaceholder) existingProfilePlaceholder.remove();
  } else {
    if (sidebarAvatar) sidebarAvatar.style.display = "none";
    if (profileAvatar) profileAvatar.style.display = "none";

    // Draw initials placeholder in sidebar
    if (sidebarWrapper) {
      let sidebarPlaceholder = sidebarWrapper.querySelector(".avatar-placeholder");
      if (!sidebarPlaceholder) {
        sidebarPlaceholder = document.createElement("div");
        sidebarPlaceholder.className = "avatar-placeholder sidebar-avatar-placeholder";
        sidebarWrapper.insertBefore(sidebarPlaceholder, sidebarAvatar);
      }
      sidebarPlaceholder.textContent = initials;
    }

    // Draw initials placeholder in profile top
    if (avatarWrapper) {
      let profilePlaceholder = avatarWrapper.querySelector(".avatar-placeholder");
      if (!profilePlaceholder) {
        profilePlaceholder = document.createElement("div");
        profilePlaceholder.className = "avatar-placeholder profile-avatar-placeholder";
        avatarWrapper.insertBefore(profilePlaceholder, profileAvatar);
      }
      profilePlaceholder.textContent = initials;
    }
  }
}

function setupAvatarUploadBtn(form) {
  const uploadBtn = document.querySelector(".js-avatar-upload");
  const fileInput = document.querySelector(".js-avatar-file-input");
  if (!uploadBtn || !fileInput) return;

  // Prevent multiple bindings
  if (uploadBtn.dataset.bound === "true") return;
  uploadBtn.dataset.bound = "true";

  uploadBtn.addEventListener("click", function(e) {
    e.preventDefault();
    fileInput.click();
  });

  fileInput.addEventListener("change", async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn tệp ảnh hợp lệ.");
      fileInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Kích thước ảnh phải nhỏ hơn 5MB.");
      fileInput.value = "";
      return;
    }

    uploadBtn.style.opacity = "0.5";
    uploadBtn.style.pointerEvents = "none";

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("velura_token");
      const res = await fetch("/api/user/upload/evidence", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed");
      }

      const avatarInput = form.querySelector('input[name="avatar"]') || createHiddenAvatarInput(form);
      avatarInput.value = data.url;

      const nameInput = form.querySelector('input[name="fullname"]');
      const fullName = nameInput ? nameInput.value.trim() : "User";
      renderUserAvatar(data.url, fullName);

      showToast("Đã tải ảnh lên thành công. Nhấn 'Cập nhật' để lưu thay đổi.");
    } catch (err) {
      console.error("Avatar upload failed:", err);
      showToast("Tải ảnh lên thất bại: " + (err.message || "Vui lòng thử lại."));
    } finally {
      uploadBtn.style.opacity = "1";
      uploadBtn.style.pointerEvents = "";
      fileInput.value = "";
    }
  });
}

function createHiddenAvatarInput(form) {
  let existing = form.querySelector('input[name="avatar"]');
  if (existing) return existing;
  existing = document.createElement("input");
  existing.type = "hidden";
  existing.name = "avatar";
  form.appendChild(existing);
  return existing;
}

function initProfileFormValidation() {
  const form = document.querySelector(".profile-form");
  if (!form) return;

  // Load live data from backend
  loadProfileData(form);

  // Hook up camera upload button to prompt for URL
  setupAvatarUploadBtn(form);

  const cancelBtn = form.querySelector(".js-btn-cancel");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function(e) {
      e.preventDefault();
      // Reset form to default values
      form.reset();
      loadProfileData(form);
      
      // Clear validation errors
      clearErrors(form);
      
      // Toast notification for cancellation
      showToast("Đã hủy bỏ các thay đổi.");
    });
  }

  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    
    // Clear previous errors
    clearErrors(form);

    let isValid = true;

    // 1. Validate Fullname
    const nameInput = form.querySelector('input[name="fullname"]');
    if (nameInput) {
      const nameVal = nameInput.value.trim();
      if (!nameVal) {
        showError(nameInput, "Họ và tên không được để trống.");
        isValid = false;
      }
    }

    // 2. Validate Phone Number (10 digits starting with 0, ignoring spaces)
    const phoneInput = form.querySelector('input[name="phone"]');
    if (phoneInput) {
      const phoneVal = phoneInput.value.replace(/\s+/g, ""); // Strip spaces for validation
      const phoneRegex = /^0\d{9}$/;
      if (!phoneVal) {
        showError(phoneInput, "Số điện thoại không được để trống.");
        isValid = false;
      } else if (!phoneRegex.test(phoneVal)) {
        showError(phoneInput, "Số điện thoại không hợp lệ (phải gồm 10 chữ số bắt đầu bằng số 0).");
        isValid = false;
      }
    }

    // 3. Validate Date of Birth (dd/mm/yyyy format)
    const dobInput = form.querySelector('input[name="dob"]');
    let parsedDateOfBirth = null;
    if (dobInput) {
      const dobVal = dobInput.value.trim();
      if (dobVal) {
        parsedDateOfBirth = parseProfileDate(dobVal);
        if (!parsedDateOfBirth) {
          showError(dobInput, "Ngày sinh không hợp lệ hoặc không đúng định dạng dd/mm/yyyy.");
          isValid = false;
        }
      }
    }

    if (isValid) {
      const fullname = nameInput.value.trim();
      const genderInput = form.querySelector('input[name="gender"]:checked');
      const gender = genderInput ? genderInput.value : null;

      const avatarInput = createHiddenAvatarInput(form);
      const avatar = avatarInput ? avatarInput.value.trim() : "";

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Đang cập nhật...";
      }

      try {
        const updated = await apiRequest("/api/user/profile", {
          method: "PATCH",
          body: {
          full_name: fullname,
          ...(parsedDateOfBirth ? { date_of_birth: parsedDateOfBirth } : {}),
          gender,
          avatar
          }
        });
        showToast("Cập nhật thông tin tài khoản thành công!");
        cacheLiveProfile(updated);
        if (dobInput) dobInput.value = formatProfileDate(updated.date_of_birth);
        window.dispatchEvent(new CustomEvent("velura:profile-updated", { detail: updated }));

        // Sync names dynamically
        const updatedName = updated.full_name;
        
        // Sidebar name
        const sidebarName = document.querySelector(".account-sidebar__name");
        if (sidebarName) {
          const nameParts = updatedName.split(" ");
          if (nameParts.length >= 2) {
            sidebarName.textContent = nameParts[nameParts.length - 1] + " " + nameParts[0];
          } else {
            sidebarName.textContent = updatedName;
          }
        }
        
        // Large profile header name
        const largeName = document.querySelector(".profile-avatar-name");
        if (largeName) {
          largeName.textContent = updatedName;
        }

        // Update avatar on UI dynamically
        renderUserAvatar(updated.avatar, updated.full_name);
      } catch (err) {
        showToast(`Cập nhật thất bại: ${err.message}`);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Cập nhật";
        }
      }
    }
  });
}

function formatProfileDate(value) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function parseProfileDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || "").trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const isValid = year >= 1900
    && date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && date <= new Date();
  return isValid ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function cacheLiveProfile(profile) {
  if (!profile || typeof profile !== "object") return;
  let current = {};
  try { current = JSON.parse(localStorage.getItem("velura_user") || "{}"); } catch { current = {}; }
  const merged = { ...current, ...profile };
  localStorage.setItem("velura_user", JSON.stringify(merged));
  localStorage.setItem("velura_profile", JSON.stringify(merged));
}

function showError(inputEl, message) {
  inputEl.classList.add("is-invalid");
  
  const errorSpan = document.createElement("span");
  errorSpan.className = "invalid-feedback";
  errorSpan.innerText = message;
  
  // Insert inside the parent wrapper after the input field
  const parent = inputEl.parentNode;
  parent.appendChild(errorSpan);
}

function clearErrors(form) {
  const invalidInputs = form.querySelectorAll(".is-invalid");
  invalidInputs.forEach(input => {
    input.classList.remove("is-invalid");
  });

  const errorMessages = form.querySelectorAll(".invalid-feedback");
  errorMessages.forEach(msg => {
    msg.remove();
  });
}

/**
 * Address Manager modal and data handling
 */
function syncAddressesToServer() {
  const cards = document.querySelectorAll(".address-list .address-card");
  const addresses = [];
  cards.forEach(card => {
    const id = card.getAttribute("data-id");
    const name = card.querySelector(".address-card__name").textContent.trim();
    const phone = card.querySelector(".address-card__phone").textContent.trim();
    const detail = card.querySelector(".address-card__detail").textContent.trim();
    const isDefault = card.classList.contains("address-card--default");
    addresses.push({ id, name, phone, detail, is_default: isDefault });
  });

  apiRequest("/api/user/addresses", {
    method: "PATCH",
    body: JSON.stringify({ addresses })
  })
  .then(() => {
    console.log("Addresses synced to server successfully");
  })
  .catch(err => {
    console.error("Failed to sync addresses:", err);
  });
}

function loadAddresses(addressList) {
  apiRequest("/api/user/profile")
    .then(profile => {
      const addresses = profile.saved_addresses || [];
      if (!addresses.length) {
        addressList.innerHTML = `<p style="color:var(--soft);font-size:0.875rem;padding:16px 0;">Bạn chưa lưu địa chỉ nào.</p>`;
        return;
      }

      addressList.innerHTML = "";
      addresses.forEach(addr => {
        const isDefault = addr.is_default;
        const card = document.createElement("div");
        card.className = `address-card ${isDefault ? "address-card--default" : ""}`;
        card.setAttribute("data-id", addr.id || Date.now().toString());
        card.innerHTML = `
          <div class="address-card__icon-wrapper">
            <svg class="address-card__location-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div class="address-card__content">
            <div class="address-card__header">
              <span class="address-card__name">${addr.name}</span>
              <span class="address-card__separator">·</span>
              <span class="address-card__phone">${addr.phone}</span>
              <span class="badge badge--default ${isDefault ? "" : "d-none"}">Mặc định</span>
            </div>
            <p class="address-card__detail">${addr.detail || addr.address || ""}</p>
          </div>
          <div class="address-card__actions">
            <button class="address-card__btn js-btn-edit-address" aria-label="Chỉnh sửa" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
            <button class="address-card__btn js-btn-delete-address" aria-label="Xóa" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        `;
        addressList.appendChild(card);
      });
    })
    .catch(err => {
      console.error("Failed to load addresses:", err);
    });
}

function initAddressManager() {
  const modal = document.getElementById("address-modal");
  if (!modal) return;

  const btnAdd = document.querySelector(".js-btn-add-address");
  const btnCloseList = document.querySelectorAll(".js-btn-close-modal");
  const form = document.getElementById("address-form");
  const addressList = document.querySelector(".address-list");

  const provinceHidden = document.getElementById("address-province");
  const districtHidden = document.getElementById("address-district");
  const wardHidden = document.getElementById("address-ward");

  const provinceWrapper = document.getElementById("address-province-wrapper");
  const districtWrapper = document.getElementById("address-district-wrapper");
  const wardWrapper = document.getElementById("address-ward-wrapper");

  const provinceOptions = Object.keys(locationData).map(key => ({
    value: key,
    label: locationData[key].name
  }));

  let districtDD = null;
  let wardDD = null;

  const provinceDD = createSearchDropdown({
    container: provinceWrapper,
    placeholder: "Chọn Tỉnh/Thành phố",
    options: provinceOptions,
    onSelect: (val) => {
      provinceHidden.value = val;
      populateDistricts(val);
    }
  });

  if (addressList) {
    loadAddresses(addressList);
  }

  // Show modal for adding
  if (btnAdd) {
    btnAdd.addEventListener("click", () => {
      resetForm();
      document.getElementById("modal-title").textContent = "Thêm địa chỉ mới";
      openModal();
    });
  }

  // Close modal events
  btnCloseList.forEach(btn => {
    btn.addEventListener("click", closeModal);
  });

  const backdrop = modal.querySelector(".modal__backdrop");
  if (backdrop) {
    backdrop.addEventListener("click", closeModal);
  }

  // Location chaining is handled by the onSelect callbacks of each dropdown

  // Delegation for Edit & Delete buttons
  if (addressList) {
    addressList.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".js-btn-edit-address");
      const deleteBtn = e.target.closest(".js-btn-delete-address");

      if (editBtn) {
        const card = editBtn.closest(".address-card");
        if (card) handleEdit(card);
        return;
      }

      if (deleteBtn) {
        const card = deleteBtn.closest(".address-card");
        if (card) handleDelete(card);
        return;
      }

      // Click on card itself → set as default
      const card = e.target.closest(".address-card");
      if (card && !card.classList.contains("address-card--default")) {
        document.querySelectorAll(".address-list .address-card").forEach(c => {
          c.classList.remove("address-card--default");
          const badge = c.querySelector(".badge--default");
          if (badge) badge.classList.add("d-none");
        });
        card.classList.add("address-card--default");
        const badge = card.querySelector(".badge--default");
        if (badge) badge.classList.remove("d-none");
        localStorage.removeItem("checkout_shipping");
        syncAddressesToServer();
        showToast("Đã đặt làm địa chỉ mặc định!");
      }
    });
  }

  // Form submit
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleFormSubmit();
    });
  }

  function openModal() {
    modal.classList.add("is-visible");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("is-visible");
    document.body.style.overflow = "";
  }

  function resetForm() {
    form.reset();
    document.getElementById("address-id").value = "";
    
    // Clear validation states
    form.querySelectorAll(".is-invalid").forEach(input => input.classList.remove("is-invalid"));
    form.querySelectorAll(".invalid-feedback").forEach(div => div.remove());

    // Reset searchable dropdowns
    if (provinceDD) provinceDD.reset();
    if (districtDD) { districtDD.reset(); districtDD.setOptions([]); districtDD.disable(); }
    if (wardDD) { wardDD.reset(); wardDD.setOptions([]); wardDD.disable(); }

    // Reset hidden inputs
    if (provinceHidden) provinceHidden.value = "";
    if (districtHidden) districtHidden.value = "";
    if (wardHidden) wardHidden.value = "";
  }

  function populateDistricts(provinceKey) {
    if (!districtWrapper || !locationData[provinceKey]) return;

    const districts = locationData[provinceKey].districts;
    const districtOptions = Object.keys(districts).map(key => ({
      value: key,
      label: districts[key].name
    }));

    if (wardDD) { wardDD.reset(); wardDD.setOptions([]); wardDD.disable(); }
    if (wardHidden) wardHidden.value = "";
    districtHidden.value = "";

    if (districtDD) {
      districtDD.setOptions(districtOptions);
      districtDD.enable();
      districtDD.reset();
    } else {
      districtDD = createSearchDropdown({
        container: districtWrapper,
        placeholder: "Chọn Quận/Huyện",
        options: districtOptions,
        onSelect: (val) => {
          districtHidden.value = val;
          populateWards(provinceKey, val);
        }
      });
      if (districtDD) districtDD.enable();
    }
  }

  function populateWards(provinceKey, districtKey) {
    if (!wardWrapper || !locationData[provinceKey] || !locationData[provinceKey].districts[districtKey]) return;

    const wards = locationData[provinceKey].districts[districtKey].wards;
    const wardOptions = wards.map(w => ({ value: w, label: w }));

    wardHidden.value = "";

    if (wardDD) {
      wardDD.setOptions(wardOptions);
      wardDD.enable();
      wardDD.reset();
    } else {
      wardDD = createSearchDropdown({
        container: wardWrapper,
        placeholder: "Chọn Phường/Xã",
        options: wardOptions,
        onSelect: (val) => { wardHidden.value = val; }
      });
      if (wardDD) wardDD.enable();
    }
  }

  function handleEdit(card) {
    resetForm();
    document.getElementById("modal-title").textContent = "Chỉnh sửa địa chỉ";

    const id = card.getAttribute("data-id");
    const name = card.querySelector(".address-card__name").textContent;
    const phone = card.querySelector(".address-card__phone").textContent;
    const detailText = card.querySelector(".address-card__detail").textContent;
    const isDefault = card.classList.contains("address-card--default");

    document.getElementById("address-id").value = id;
    document.getElementById("address-fullname").value = name;
    document.getElementById("address-phone").value = phone;
    document.getElementById("address-is-default").checked = isDefault;

    // Parse location details
    let addressDetail = detailText;
    let selectedProv = "";
    let selectedDist = "";
    let selectedWard = "";

    // Determine Province dynamically
    for (const provKey in locationData) {
      const provName = locationData[provKey].name;
      if (detailText.includes(provName)) {
        selectedProv = provKey;
        addressDetail = addressDetail.replace(`, ${provName}`, "");
        break;
      }
    }

    if (selectedProv) {
      provinceDD.setValue(selectedProv);
      provinceHidden.value = selectedProv;
      populateDistricts(selectedProv);

      // Determine District
      const districts = locationData[selectedProv].districts;
      for (const distKey in districts) {
        if (detailText.includes(districts[distKey].name)) {
          selectedDist = distKey;
          if (districtDD) districtDD.setValue(distKey);
          districtHidden.value = distKey;
          populateWards(selectedProv, distKey);
          addressDetail = addressDetail.replace(`, ${districts[distKey].name}`, "");
          break;
        }
      }

      if (selectedDist) {
        // Determine Ward
        const wards = districts[selectedDist].wards;
        for (const ward of wards) {
          if (detailText.includes(ward)) {
            selectedWard = ward;
            if (wardDD) wardDD.setValue(ward);
            wardHidden.value = ward;
            addressDetail = addressDetail.replace(`, ${ward}`, "");
            break;
          }
        }
      }
    }

    document.getElementById("address-detail").value = addressDetail.trim();
    openModal();
  }

  async function handleDelete(card) {
    if (card.classList.contains("address-card--default")) {
      showToast("Không thể xóa địa chỉ mặc định! Hãy đặt địa chỉ khác làm mặc định trước.");
      return;
    }

    const confirmed = await showConfirmModal("Bạn có chắc chắn muốn xóa địa chỉ này?");
    if (confirmed) {
      card.style.opacity = "0";
      card.style.transform = "scale(0.9)";
      setTimeout(() => {
        card.remove();
        showToast("Đã xóa địa chỉ thành công!");
        syncAddressesToServer();
      }, 300);
    }
  }

  function handleFormSubmit() {
    const fullname = document.getElementById("address-fullname");
    const phone = document.getElementById("address-phone");
    const province = document.getElementById("address-province");
    const district = document.getElementById("address-district");
    const ward = document.getElementById("address-ward");
    const detail = document.getElementById("address-detail");
    const isDefault = document.getElementById("address-is-default").checked;
    const addressId = document.getElementById("address-id").value;

    let hasError = false;

    // Helper to validate and set status
    const validateField = (el, condition, msg) => {
      el.classList.remove("is-invalid");
      const next = el.nextElementSibling;
      if (next && next.classList.contains("invalid-feedback")) next.remove();
      const parent = el.closest(".profile-form__input-wrapper");
      if (parent) {
        const feed = parent.querySelector(".invalid-feedback");
        if (feed) feed.remove();
      }

      if (!condition) {
        el.classList.add("is-invalid");
        const feedback = document.createElement("div");
        feedback.className = "invalid-feedback";
        feedback.textContent = msg;
        if (parent) {
          parent.appendChild(feedback);
        } else {
          el.parentNode.appendChild(feedback);
        }
        hasError = true;
      }
    };

    validateField(fullname, fullname.value.trim() !== "", "Họ và tên không được để trống");
    
    const phoneVal = phone.value.trim();
    validateField(phone, isValidPhone(phoneVal), "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)");
    
    validateField(province, province.value !== "", "Vui lòng chọn Tỉnh/Thành phố");
    validateField(district, districtDD && districtDD.getValue() !== "", "Vui lòng chọn Quận/Huyện");
    validateField(ward, wardDD && wardDD.getValue() !== "", "Vui lòng chọn Phường/Xã");
    validateField(detail, detail.value.trim() !== "", "Địa chỉ chi tiết không được để trống");

    if (hasError) return;

    // Form text strings — look up names from locationData
    const provName = province.value ? (locationData[province.value]?.name || "") : "";
    const distName = (province.value && district.value) ? (locationData[province.value]?.districts[district.value]?.name || "") : "";
    const wardName = ward.value || "";
    const fullDetailString = `${detail.value.trim()}, ${wardName}, ${distName}, ${provName}`;

    if (isDefault) {
      // Uncheck all other default address cards
      document.querySelectorAll(".address-card").forEach(c => {
        c.classList.remove("address-card--default");
        const badge = c.querySelector(".badge--default");
        if (badge) badge.classList.add("d-none");
      });
    }

    if (addressId) {
      // Edit mode: update card
      const card = document.querySelector(`.address-card[data-id="${addressId}"]`);
      if (card) {
        card.querySelector(".address-card__name").textContent = fullname.value.trim();
        card.querySelector(".address-card__phone").textContent = phone.value.trim();
        card.querySelector(".address-card__detail").textContent = fullDetailString;

        if (isDefault) {
          card.classList.add("address-card--default");
          const badge = card.querySelector(".badge--default");
          if (badge) badge.classList.remove("d-none");
        } else {
          card.classList.remove("address-card--default");
          const badge = card.querySelector(".badge--default");
          if (badge) badge.classList.add("d-none");
        }
      }
      showToast("Cập nhật địa chỉ thành công!");
    } else {
      // Add mode: create card
      const newId = Date.now().toString();
      const newCard = document.createElement("div");
      newCard.className = `address-card ${isDefault ? "address-card--default" : ""}`;
      newCard.setAttribute("data-id", newId);
      newCard.innerHTML = `
        <div class="address-card__icon-wrapper">
          <svg class="address-card__location-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div class="address-card__content">
          <div class="address-card__header">
            <span class="address-card__name">${fullname.value.trim()}</span>
            <span class="address-card__separator">·</span>
            <span class="address-card__phone">${phone.value.trim()}</span>
            <span class="badge badge--default ${isDefault ? "" : "d-none"}">Mặc định</span>
          </div>
          <p class="address-card__detail">${fullDetailString}</p>
        </div>
        <div class="address-card__actions">
          <button class="address-card__btn js-btn-edit-address" aria-label="Chỉnh sửa" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          <button class="address-card__btn js-btn-delete-address" aria-label="Xóa" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      `;
      addressList.appendChild(newCard);
      showToast("Thêm địa chỉ mới thành công!");
    }

    syncAddressesToServer();
    closeModal();
  }
}

/**
 * Order History Tab status filtering
 */
function initOrderFilter() {
  const ordersListContainer = document.querySelector(".orders-list");
  if (!ordersListContainer) return;

  const subtitle = document.querySelector(".orders-header__info p");

  ordersListContainer.innerHTML = `<div style="text-align: center; padding: 24px 0; color: var(--soft);">Đang tải danh sách đơn hàng...</div>`;

  apiRequest("/api/user/orders")
    .then(data => {
      const orders = data.orders || [];
      
      if (subtitle) {
        subtitle.textContent = `${orders.length} đơn hàng của bạn`;
      }

      if (orders.length === 0) {
        ordersListContainer.innerHTML = `<div style="text-align: center; padding: 48px 0; color: var(--soft);">Bạn chưa có đơn hàng nào gần đây.</div>`;
        return;
      }

      // Display the most recent 3 orders
      const recentOrders = orders.slice(0, 3);

      const statusLabels = {
        pending: "Chờ xác nhận",
        confirmed: "Đã xác nhận",
        preparing: "Đang chuẩn bị",
        shipping: "Đang giao",
        delivered: "Đã giao",
        completed: "Hoàn thành",
        cancelled: "Đã hủy"
      };

      ordersListContainer.innerHTML = recentOrders.map(order => {
        const trackingCode = order.tracking_code || order.order_id.slice(0, 8).toUpperCase();
        const dateObj = new Date(order.created_at);
        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
        const itemCount = (order.items || []).reduce((acc, cur) => acc + cur.quantity, 0);
        const totalFormatted = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(order.total_amount);
        const statusLabel = statusLabels[order.status] || order.status;
        const statusClass = order.status;

        // Find first item's image for preview
        const firstItemImg = order.items?.[0]?.product_image || "../../assets/images/image-1.png";

        return `
          <a href="/src/pages/account/order-detail.html?id=${order.order_id}" class="order-card" data-status="${order.status}">
            <img class="order-card__image" src="${firstItemImg}" alt="Đơn hàng" />
            <div class="order-card__info">
              <h3 class="order-card__sku">Mã đơn #${trackingCode}</h3>
              <p class="order-card__date">${formattedDate} · ${itemCount} sản phẩm</p>
            </div>
            <div class="order-card__meta">
              <span class="order-card__price">${totalFormatted}</span>
              <span class="order-card__status order-card__status--${statusClass}">${statusLabel}</span>
            </div>
            <div class="order-card__arrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </a>
        `;
      }).join("");
    })
    .catch(err => {
      ordersListContainer.innerHTML = `<div style="text-align: center; padding: 24px 0; color: #d9534f;">Không thể tải danh sách đơn hàng: ${err.message}</div>`;
    });
}

/**
 * Wishlist Tab product cards interactions
 */
function initWishlistActions() {
  const grid = document.getElementById("wishlist-product-grid");
  if (!grid) return;

  const countSubtitle = document.querySelector(".wishlist-account-header__info p");

  // Load wishlist items
  function loadWishlist() {
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 48px 0; color: var(--soft);">Đang tải danh sách yêu thích...</div>`;
    
    apiRequest("/api/user/wishlist")
      .then(data => {
        const items = data.items || [];
        updateCounter(items.length);

        if (items.length === 0) {
          grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px 0; color: var(--soft);">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; color: #A18265;">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <p style="margin: 0; font-size: 0.9375rem;">Không tìm thấy sản phẩm nào trong danh sách yêu thích.</p>
            </div>
          `;
          return;
        }

        grid.innerHTML = items.map(product => {
          const priceFormatted = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(product.sale_price || product.base_price);
          return `
            <div class="product-card" data-product-id="${product.product_id}">
              <div class="product-card__img-wrapper">
                <img class="product-card__img" src="${product.images?.[0] || '/src/assets/images/placeholder.jpg'}" alt="${product.name}" />
                <button class="btn-icon product-card__btn-wishlist js-remove-wishlist active" type="button" aria-label="Xóa khỏi yêu thích">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
              <div class="product-card__info" style="padding: 14px;">
                <h3 class="product-card__title" style="margin: 0; font-size: 0.875rem; font-weight: 500; height: 38px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4;"><a href="/src/pages/products/detail.html?id=${product.product_id}" style="text-decoration:none; color:inherit;">${product.name}</a></h3>
                <div class="product-card__price-row" style="margin-top: 8px;">
                  <span class="product-card__price" style="font-family: 'DM Sans', sans-serif; font-weight: 700; color: var(--terracotta);">${priceFormatted}</span>
                </div>
              </div>
              <div class="product-card__actions" style="padding: 0 14px 14px; margin-top: auto;">
                <button class="btn btn--primary product-card__cart-btn js-add-cart-fast" type="button" style="width: 100%; padding: 8px 0; font-size: 0.8125rem;">
                  Thêm vào giỏ nhanh
                </button>
              </div>
            </div>
          `;
        }).join("");

        setupWishlistCarousel(grid);
      })
      .catch(err => {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 24px 0; color: #d9534f;">Không thể tải danh sách yêu thích: ${err.message}</div>`;
      });
  }

  function setupWishlistCarousel(gridEl) {
    if (!gridEl) return;
    const parent = gridEl.parentNode;
    
    // Clean up existing arrows
    parent.querySelectorAll(".wishlist-carousel-arrow").forEach(el => el.remove());
    
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "wishlist-carousel-arrow wishlist-carousel-arrow--prev";
    prevBtn.innerHTML = "‹";
    prevBtn.style.cssText = `
      position: absolute;
      top: calc(50% + 20px);
      left: -18px;
      transform: translateY(-50%);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #fff;
      border: 1px solid #FAF6F2;
      box-shadow: 0 4px 12px rgba(42,37,34,0.08);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      z-index: 10;
      color: #7D562D;
      transition: all 0.2s ease;
      line-height: 1;
    `;
    
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "wishlist-carousel-arrow wishlist-carousel-arrow--next";
    nextBtn.innerHTML = "›";
    nextBtn.style.cssText = `
      position: absolute;
      top: calc(50% + 20px);
      right: -18px;
      transform: translateY(-50%);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #fff;
      border: 1px solid #FAF6F2;
      box-shadow: 0 4px 12px rgba(42,37,34,0.08);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      z-index: 10;
      color: #7D562D;
      transition: all 0.2s ease;
      line-height: 1;
    `;
    
    parent.style.position = "relative";
    
    prevBtn.addEventListener("click", () => {
      gridEl.scrollBy({ left: -gridEl.clientWidth * 0.8, behavior: "smooth" });
    });
    
    nextBtn.addEventListener("click", () => {
      gridEl.scrollBy({ left: gridEl.clientWidth * 0.8, behavior: "smooth" });
    });
    
    // Hover styling
    const addHoverEffect = (btn) => {
      btn.addEventListener("mouseenter", () => {
        btn.style.background = "#FAF6F2";
        btn.style.color = "#C97B63";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "#fff";
        btn.style.color = "#7D562D";
      });
    };
    addHoverEffect(prevBtn);
    addHoverEffect(nextBtn);
    
    parent.appendChild(prevBtn);
    parent.appendChild(nextBtn);
    
    const updateArrows = () => {
      const hasOverflow = gridEl.scrollWidth > gridEl.clientWidth + 8;
      prevBtn.style.display = hasOverflow ? "flex" : "none";
      nextBtn.style.display = hasOverflow ? "flex" : "none";
      
      prevBtn.disabled = gridEl.scrollLeft <= 4;
      nextBtn.disabled = gridEl.scrollLeft >= (gridEl.scrollWidth - gridEl.clientWidth - 4);
      prevBtn.style.opacity = prevBtn.disabled ? "0.4" : "1";
      nextBtn.style.opacity = nextBtn.disabled ? "0.4" : "1";
    };
    
    gridEl.addEventListener("scroll", updateArrows);
    window.addEventListener("resize", updateArrows);
    setTimeout(updateArrows, 200);
  }

  // Delegate clicks on grid
  grid.addEventListener("click", async (e) => {
    const removeBtn = e.target.closest(".js-remove-wishlist");
    const addCartBtn = e.target.closest(".js-add-cart-fast");

    if (removeBtn) {
      const card = removeBtn.closest(".product-card");
      if (!card) return;
      const productId = card.getAttribute("data-product-id");

      try {
        await apiRequest(`/api/user/wishlist?product_id=${productId}`, { method: "DELETE" });
        
        card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        card.style.opacity = "0";
        card.style.transform = "scale(0.9)";

        setTimeout(() => {
          card.remove();
          const remainingCards = grid.querySelectorAll(".product-card");
          updateCounter(remainingCards.length);
          showToast("Đã xóa sản phẩm khỏi Wishlist!");
          if (remainingCards.length === 0) {
            grid.innerHTML = `
              <div style="grid-column: 1 / -1; text-align: center; padding: 48px 0; color: var(--soft);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px;">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <p style="margin: 0; font-size: 0.9375rem;">Không tìm thấy sản phẩm nào trong danh sách yêu thích.</p>
              </div>
            `;
          }
        }, 300);
      } catch (err) {
        showToast("Lỗi khi xóa khỏi Wishlist: " + err.message);
      }
    }

    if (addCartBtn) {
      const card = addCartBtn.closest(".product-card");
      if (!card) return;
      const productId = card.getAttribute("data-product-id");
      try {
        const product = await apiRequest(`/api/user/products/${productId}`);
        if (product && product.variants && product.variants.length > 0) {
          const matchedVariant = product.variants[0];
          addToCart({
            variant_id: matchedVariant.variant_id,
            product_id: product.product_id,
            product_name: product.name,
            product_image: getVariantImage(product, matchedVariant.color || "Mặc định"),
            quantity: 1,
            unit_price: product.sale_price || product.base_price,
            color: matchedVariant.color || "Mặc định",
            size: matchedVariant.size || "M"
          });
          showToast(`Đã thêm "${product.name}" vào giỏ hàng thành công!`);
        } else {
          showToast("Sản phẩm không có biến thể sẵn có.");
        }
      } catch (err) {
        showToast("Không thể thêm vào giỏ hàng: " + err.message);
      }
    }
  });

  function updateCounter(count) {
    if (!countSubtitle) return;
    if (count === 0) {
      countSubtitle.textContent = "Bạn chưa có sản phẩm yêu thích nào";
    } else {
      countSubtitle.textContent = `Những món bạn đã lưu (${count} sản phẩm)`;
    }
  }

  loadWishlist();
}

/**
 * Settings & Style Profile saving buttons
 */
function initSettingsAndStyleActions() {
  document.querySelectorAll("[data-social-action]").forEach(button => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    button.addEventListener("click", async () => {
      const row = button.closest("[data-social-provider]");
      const provider = row?.dataset.socialProvider;
      if (!provider) return;

      if (button.dataset.socialLinked === "true") {
        showToast("Tính năng hủy liên kết tài khoản sẽ được cập nhật trong phiên bản tiếp theo.");
        return;
      }

      try {
        await startProfileSocialOAuth(provider);
      } catch {
        showToast(`Không thể kết nối ${provider === "facebook" ? "Facebook" : "Google"}. Vui lòng thử lại.`);
      }
    });
  });

  const saveSettingsBtn = document.querySelector(".js-btn-save-settings");
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", () => {
      showToast("Đã lưu các cài đặt thành công!");
    });
  }

  const emptyContainer = document.getElementById("js-style-profile-empty");
  const filledContainer = document.getElementById("js-style-profile-filled");
  if (!emptyContainer || !filledContainer) return;

  // ── Translation maps ──
  const STYLE_MAP = {
    "Minimalist": "Tối giản", "Classic": "Cổ điển", "Romantic": "Lãng mạn",
    "Elegant": "Thanh lịch", "Boho": "Phóng khoáng", "Street": "Đường phố",
    "Sporty": "Thể thao", "Smart Casual": "Lịch sự năng động"
  };
  const SHAPE_MAP = {
    "Hourglass": "Đồng hồ cát", "Pear": "Quả lê", "Pearl": "Quả lê",
    "Apple": "Quả táo", "Rectangle": "Chữ nhật", "Inverted Triangle": "Tam giác ngược"
  };
  const TONE_MAP = { "Warm": "Ấm (Warm)", "Cool": "Mát (Cool)", "Neutral": "Trung tính (Neutral)" };
  const OCC_MAP = {
    "Office": "Công sở", "Casual": "Thường ngày", "Party": "Dự tiệc",
    "School": "Đi học", "Sport": "Thể thao", "Travel": "Du lịch", "Home": "Ở nhà"
  };
  const BUDGET_MAP = {
    "under_300k": "Dưới 300.000đ", "300k_700k": "300.000đ – 700.000đ",
    "700k_1.5m": "700.000đ – 1.500.000đ", "above_1.5m": "Trên 1.500.000đ"
  };
  const COLOR_HEX = {
    "Kem": "#E6D9CD", "Phấn": "#F5E1D3", "Hồng đào": "#E8C3B9",
    "Hồng đất": "#C97B63", "Xanh ô liu": "#A0AF9C", "Onyx": "#2C2A29",
    "Xám ấm": "#8F8A85", "Xanh khói": "#5B6C7A", "Camel": "#D3A273", "Đỏ rượu": "#732C2B"
  };

  // ── Style tips by style_tags ──
  const STYLE_TIPS = {
    "Minimalist": { style: "Áo sơ mi trắng, quần ống rộng, blazer đơn giản — ưu tiên đường nét gọn gàng và màu trung tính.", items: "Blazer oversized, áo blouse lụa, quần tây ống rộng, túi structured" },
    "Classic": { style: "Đầm bút chì, áo khoác trench, set đồ công sở — thiết kế timeless, chất liệu cao cấp.", items: "Trench coat, đầm bút chì, áo cashmere, giày pumps" },
    "Romantic": { style: "Đầm maxi, áo ren, váy xếp ly — soft colors, chi tiết femininely.", items: "Đầm hoa nhí, áo tay bồng, váy chữ A, sandals quai mảnh" },
    "Elegant": { style: "Đầm cocktail, blazer satin, phụ kiện minimal — sang trọng nhưng không phô trương.", items: "Đầm satin, clutch da, giày cao gót, trang sức ngọc trai" },
    "Boho": { style: "Đầm maxi, áo poncho, váy layering — tự nhiên, thoải mái, nhiều layer.", items: "Đầm maxi hoa, áo kimono, sandal đế bằng, túi macramé" },
    "Street": { style: "Áo oversize, jeans rách, jacket da — phong cách đường phố, năng động.", items: "Hoodie, sneaker, baggy jeans, bomber jacket" },
    "Sporty": { style: "Áo polo, jogger, sneaker — thoải mái, thể thao, functional.", items: "Legging, áo sport bra, sneaker, backpack" },
    "Smart Casual": { style: "Blazer + jeans, áo knit, loafers — lịch sự nhưng không quá trang trọng.", items: "Blazer linen, áo polo, chinos, loafer" }
  };

  // ── Body shape tips ──
  const BODY_TIPS = {
    "Hourglass": "Đầm ôm body, đường eo rõ ràng, tránh baggy quá rộng. Phù hợp với đầm bút chì, váy chữ A.",
    "Pear": "Áo kiểu bèo nhún, váy A-line, tránh ôm sát hông. Ưu tiên phần trên nổi bật.",
    "Apple": "Váy chữ A, đầm suông, tránh ôm sát bụng. Chọn áo có cấu trúc ở vai.",
    "Rectangle": "Đầm có belt, váy peplum, tạo đường cong bằng layering. Tránh trang phục quá rộng.",
    "Inverted Triangle": "Váy chữ A, quần ống rộng, tránh áo vai bành. Ưu tiên phần thân dưới nổi bật."
  };

  // ── Color tips by skin tone ──
  const COLOR_TIPS = {
    "Warm": "Nên ưu tiên tông màu ấm: Kem, Camel, Hồng đất, Xanh ô liu, Đỏ rượu. Tránh tông xanh lạnh quá đậm.",
    "Cool": "Nên ưu tiên tông màu mát: Trắng, Xám ấm, Xanh khói, Onyx, Phấn. Tránh nâu vàng quá nóng.",
    "Neutral": "Có thể mix cả tông ấm và mát. Kem, Xám ấm, Xanh khói đều phù hợp."
  };

  function parseArrays(q) {
    ["style_tags", "preferred_occasions", "favorite_brands", "favorite_colors"].forEach(key => {
      if (q[key] && typeof q[key] === "string" && q[key].startsWith("{")) {
        try { q[key] = q[key].replace(/^{|}$/g, "").split(",").map(s => s.trim().replace(/^"|"$/g, "")); } catch (e) {}
      }
    });
  }

  function fmt(v, suffix) { return v ? v + (suffix || "") : "—"; }

  function renderColorDots(colorsEl, colors) {
    if (!colorsEl) return;
    if (!colors || colors.length === 0) { colorsEl.innerHTML = '<span style="color:#8C857E;font-size:0.875rem;">—</span>'; return; }
    colorsEl.innerHTML = colors.map(c => {
      const parts = c.split("|");
      const name = parts[0];
      const hex = (parts.length > 1 ? parts[1] : COLOR_HEX[name]) || "#ccc";
      return '<span class="sp-prefs__color-dot" style="background:' + hex + ';" data-name="' + name + '"></span>';
    }).join("");
  }

  function renderChips(container, items, map) {
    if (!container) return;
    if (!items || items.length === 0) { container.innerHTML = '<span style="color:#8C857E;font-size:0.875rem;">—</span>'; return; }
    container.innerHTML = items.map(i => '<span class="sp-prefs__chip">' + (map[i] || i) + '</span>').join("");
  }

  function renderProducts(products, comboItems) {
    const grid = document.getElementById("js-sp-products-grid");
    if (!grid) return;

    // comboItems are already built with images/price from the fetch step
    const items = (comboItems || []).concat(products || []);

    if (items.length === 0) { grid.innerHTML = '<p style="color:#8C857E;font-size:0.875rem;">Không có sản phẩm gợi ý</p>'; return; }

    grid.innerHTML = items.slice(0, 4).map(p => {
      if (p.is_combo) {
        const imgs = p.images || [];
        const thumbsHtml = imgs.length > 0
          ? '<div class="sp-product-card__combo-thumbs">' +
              imgs.slice(0, 2).map(src =>
                '<img src="' + src + '" alt="" class="sp-product-card__combo-thumb" loading="lazy" />'
              ).join("") +
            '</div>'
          : '<div class="sp-product-card__combo-thumbs sp-product-card__combo-thumbs--empty">' +
              '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
            '</div>';

        return '<div class="sp-product-card sp-product-card--combo">' +
          '<div class="sp-product-card__combo-badge">Set</div>' +
          thumbsHtml +
          '<div class="sp-product-card__combo-info">' +
            '<span class="sp-product-card__name">' + (p.name || "Set đồ") + '</span>' +
            (p.price ? '<span class="sp-product-card__price">' + Number(p.price).toLocaleString("vi-VN") + "₫</span>" : '') +
            (p.reason ? '<span class="sp-product-card__combo-reason">' + p.reason + '</span>' : '') +
          '</div>' +
        '</div>';
      }
      const img = (p.images && p.images[0]) ? p.images[0] : "/src/assets/images/placeholder.jpg";
      const slug = p.slug || p.product_id;
      const price = p.sale_price || p.base_price;
      return '<a href="/src/pages/products/detail.html?id=' + encodeURIComponent(slug) + '" class="sp-product-card">' +
        '<img src="' + img + '" alt="' + (p.name || "") + '" class="sp-product-card__img" loading="lazy" />' +
        '<div class="sp-product-card__info">' +
          '<p class="sp-product-card__name">' + (p.name || "") + '</p>' +
          '<p class="sp-product-card__price">' + Number(price).toLocaleString("vi-VN") + "₫</p>" +
        '</div></a>';
    }).join("");
  }

  function populateProfile(q) {
    // 1. Overview
    const heading = document.getElementById("js-sp-heading");
    if (heading) {
      const tags = Array.isArray(q.style_tags) ? q.style_tags : [q.style_tags];
      heading.textContent = tags.map(t => STYLE_MAP[t] || t).join(", ") || "—";
    }

    const tagsContainer = document.getElementById("js-sp-style-tags");
    if (tagsContainer && Array.isArray(q.style_tags)) {
      tagsContainer.innerHTML = q.style_tags.map(t =>
        '<span class="sp-overview__tag">' + (STYLE_MAP[t] || t) + '</span>'
      ).join("");
    }

    const desc = document.getElementById("js-sp-description");
    if (desc) {
      const firstTag = (q.style_tags && q.style_tags[0]) || "";
      const tip = STYLE_TIPS[firstTag];
      desc.textContent = tip ? tip.style : "Hồ sơ phong cách được phân tích từ kết quả Style Quiz của bạn.";
    }

    // 2. Body
    document.getElementById("js-sp-height").textContent = fmt(q.height_cm, " cm");
    document.getElementById("js-sp-weight").textContent = fmt(q.weight_kg, " kg");
    document.getElementById("js-sp-shape").textContent = SHAPE_MAP[q.body_shape] || q.body_shape || "—";
    document.getElementById("js-sp-chest").textContent = fmt(q.chest_cm, " cm");
    document.getElementById("js-sp-waist").textContent = fmt(q.waist_cm, " cm");
    document.getElementById("js-sp-hip").textContent = fmt(q.hip_cm, " cm");
    document.getElementById("js-sp-tone").textContent = TONE_MAP[q.skin_tone] || q.skin_tone || "—";

    // 3. Preferences
    renderColorDots(document.getElementById("js-sp-colors"), q.favorite_colors);
    renderChips(document.getElementById("js-sp-occasions"), q.preferred_occasions, OCC_MAP);
    document.getElementById("js-sp-age").textContent = q.age_group ? "Nhóm tuổi " + q.age_group : "—";
    document.getElementById("js-sp-budget").textContent = BUDGET_MAP[q.budget_range] || "—";
    document.getElementById("js-sp-brands").textContent = (Array.isArray(q.favorite_brands) ? q.favorite_brands.join(", ") : q.favorite_brands) || "—";

    // 4. Tips
    const firstTag = (q.style_tags && q.style_tags[0]) || "";
    const styleTip = STYLE_TIPS[firstTag];
    document.getElementById("js-tip-style").textContent = styleTip ? styleTip.style : "—";
    document.getElementById("js-tip-body").textContent = BODY_TIPS[q.body_shape] || "Chọn trang phục tôn dáng, phù hợp với sở thích cá nhân.";
    document.getElementById("js-tip-colors").textContent = COLOR_TIPS[q.skin_tone] || "—";
    document.getElementById("js-tip-items").textContent = styleTip ? styleTip.items : "—";
  }

  // ── Fetch quiz + recommendations ──
  apiRequest("/api/user/style-quiz")
    .then(res => {
      if (!res.success || !res.quiz || Object.keys(res.quiz).length === 0) {
        emptyContainer.style.display = "";
        filledContainer.style.display = "none";
        return;
      }
      const q = res.quiz;
      parseArrays(q);

      emptyContainer.style.display = "none";
      filledContainer.style.display = "";

      populateProfile(q);

      // Fetch recommendations (combo images come pre-built from backend)
      return apiRequest("/api/user/recommendations/style-profile").catch(() => null);
    })
    .then(rec => {
      if (!rec || !rec.success) return;

      // Build product lookup from rec categories for regular products
      const regularProducts = [];
      if (rec.categories && Array.isArray(rec.categories)) {
        rec.categories.forEach(cat => {
          if (cat.products && Array.isArray(cat.products)) {
            cat.products.forEach(p => { if (!p.is_combo) regularProducts.push(p); });
          }
        });
      }

      const combos = rec.combos || [];
      const comboItems = combos.map(c => {
        // Backend formatGeneratedCombo already puts images + product_ids on each combo
        let imgs = c.images || [];
        const price = c.sale_price || c.base_price || 0;
        return {
          is_combo: true,
          name: c.name || c.combo_name || "Set phối đồ",
          reason: c.reason || c.description || "",
          images: imgs,
          price: price
        };
      });

      renderProducts(regularProducts, comboItems);
    })
    .catch(() => {
      emptyContainer.style.display = "";
      filledContainer.style.display = "none";
    });
}

/**
 * Global Toast Notification Helper
 */
export function showToast(message) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <svg class="toast__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <div class="toast__content">
      <p class="toast__message">${message}</p>
    </div>
  `;

  container.appendChild(toast);

  // Force reflow
  void toast.offsetWidth;

  // Show toast
  toast.classList.add("toast--show");

  // Remove toast after 4s
  setTimeout(() => {
    toast.classList.remove("toast--show");
    // Wait for fadeout animation transition
    setTimeout(() => {
      toast.remove();
      // Remove container if no toasts left
      if (container.children.length === 0) {
        container.remove();
      }
    }, 400);
  }, 4000);
}

export function showConfirmModal(message) {
  return new Promise(resolve => {
    const existing = document.querySelector(".confirm-modal-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "confirm-modal-overlay";
    overlay.innerHTML = `
      <div class="confirm-modal">
        <p class="confirm-modal__message">${message}</p>
        <div class="confirm-modal__actions">
          <button class="btn btn--outline confirm-modal__btn confirm-modal__btn--cancel" type="button">Hủy</button>
          <button class="btn btn--primary confirm-modal__btn confirm-modal__btn--ok" type="button">Đồng ý</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    void overlay.offsetWidth;
    overlay.classList.add("is-visible");

    const close = (result) => {
      overlay.classList.remove("is-visible");
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };

    overlay.querySelector(".confirm-modal__btn--ok").addEventListener("click", () => close(true));
    overlay.querySelector(".confirm-modal__btn--cancel").addEventListener("click", () => close(false));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(false); });
  });
}
