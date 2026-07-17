import { apiRequest } from "./api.js";
import { showToast } from "./account-profile.js";
import { mergeCartOnLogin } from "./cart.js";
import {
  clearAuthSession,
  storeAuthSession
} from "./auth-session.js";
import { syncFavoriteOutfitsOnLogin } from "./chatbot.js";
import { isValidPhone } from "../utils/phone-validator.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function setError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg || "";
  el.style.display = msg ? "block" : "none";
}

function clearErrors(...ids) { ids.forEach(id => setError(id, "")); }

function setLoading(btn, loading, label = "Đang xử lý...") {
  btn.disabled = loading;
  btn.textContent = loading ? label : btn.dataset.label;
}

function validatePassword(pw) {
  return pw && pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[\d\W]/.test(pw);
}

function completeAuthentication(
  data,
  {
    mergeCart = true,
    message = "Đăng nhập thành công!",
    redirectDelay = 1200
  } = {}
) {
  storeAuthSession(data);
  migrateStyleQuizOnLogin().catch(console.error);
  if (mergeCart) mergeCartOnLogin();
  showToast(message);
  setTimeout(() => { window.location.href = getSafePostAuthRedirect(); }, redirectDelay);
}

function getSafePostAuthRedirect() {
  const requested = new URLSearchParams(window.location.search).get("redirect");
  if (!requested) return "/index.html";
  try {
    const destination = new URL(requested, window.location.origin);
    if (destination.origin !== window.location.origin || !destination.pathname.startsWith("/")) {
      return "/index.html";
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/index.html";
  }
}

function bindPasswordToggle(inputId) {
  const btn = document.querySelector(`[data-toggle="${inputId}"]`);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;
  btn.addEventListener("click", () => {
    input.type = input.type === "password" ? "text" : "password";
  });
}

function bindStrengthMeter(inputId, barId, labelId, wrapperId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener("input", () => {
    const pw = input.value;
    const wrap = document.getElementById(wrapperId);
    const fill = document.getElementById(barId);
    const lbl = document.getElementById(labelId);
    if (!wrap || !fill || !lbl) return;
    if (!pw) { wrap.hidden = true; return; }
    wrap.hidden = false;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[\d]/.test(pw)) score++;
    if (/[\W]/.test(pw)) score++;
    const levels = [
      { pct: "20%", color: "#d9534f", text: "Rất yếu" },
      { pct: "40%", color: "#f0ad4e", text: "Yếu" },
      { pct: "60%", color: "#f0c040", text: "Trung bình" },
      { pct: "80%", color: "#5cb85c", text: "Mạnh" },
      { pct: "100%", color: "#2d7a2d", text: "Rất mạnh" },
    ];
    const lvl = levels[score - 1] || levels[0];
    fill.style.width = lvl.pct;
    fill.style.background = lvl.color;
    lbl.textContent = lvl.text;
    lbl.style.color = lvl.color;
  });
}

// Debounce helper
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function checkDuplicate(type, value, errorId, iconId) {
  if (!value) return;
  try {
    const res = await apiRequest(`/api/user/auth/check-exists?${type}=${encodeURIComponent(value)}`);
    const icon = document.getElementById(iconId);
    if (res.exists) {
      setError(errorId, type === "email" ? "Email này đã được sử dụng." : "Số điện thoại này đã được đăng ký.");
      if (icon) { icon.textContent = "✗"; icon.style.color = "#d9534f"; icon.hidden = false; }
    } else {
      setError(errorId, "");
      if (icon) { icon.textContent = "✓"; icon.style.color = "#5cb85c"; icon.hidden = false; }
    }
  } catch { /* silent */ }
}

// ─── Style Quiz Migration ───────────────────────────────────────────────────

export async function migrateStyleQuizOnLogin() {
  const guestSessionId = localStorage.getItem("velura_guest_session_id");
  
  let payload = {};
  
  // Try to load cached guest quiz from localStorage
  const localQuizStr = localStorage.getItem("velura_guest_quiz_data");
  if (localQuizStr) {
    try {
      payload = JSON.parse(localQuizStr);
    } catch (e) {
      console.error("Failed to parse local guest quiz data on login migration:", e);
    }
  }
  
  // Fallback to sessionStorage if localStorage payload is empty
  if (!payload || Object.keys(payload).length === 0) {
    const height_cm = sessionStorage.getItem("quiz-height");
    const weight_kg = sessionStorage.getItem("quiz-weight");
    const chest_cm = sessionStorage.getItem("quiz-vong1");
    const waist_cm = sessionStorage.getItem("quiz-vong2");
    const hip_cm = sessionStorage.getItem("quiz-vong3");
    const body_shape = sessionStorage.getItem("quiz-body-shape");
    const styleStr = sessionStorage.getItem("quiz-main-style");
    const context = sessionStorage.getItem("quiz-context");
    const budget = sessionStorage.getItem("quiz-budget");
    
    let style_tags = null;
    if (styleStr) {
      try {
        style_tags = JSON.parse(styleStr);
      } catch (e) {
        style_tags = [styleStr];
      }
    }
    
    payload = {};
    if (height_cm) payload.height_cm = parseInt(height_cm, 10);
    if (weight_kg) payload.weight_kg = parseInt(weight_kg, 10);
    if (chest_cm) payload.chest_cm = parseInt(chest_cm, 10);
    if (waist_cm) payload.waist_cm = parseInt(waist_cm, 10);
    if (hip_cm) payload.hip_cm = parseInt(hip_cm, 10);
    if (body_shape) payload.body_shape = body_shape;
    if (style_tags) payload.style_tags = style_tags;
    if (context) payload.preferred_occasions = [context];
    if (budget) payload.budget_range = budget;
  }
  
  try {
    const res = await apiRequest("/api/user/style-quiz/migrate", {
      method: "POST",
      body: payload
    });
    if (res.success && res.migrated) {
      console.log("Style Quiz migrated successfully on login!");
      localStorage.setItem("velura_guest_quiz_completed", "true");
    }
  } catch (err) {
    console.error("Failed to migrate Style Quiz on login:", err);
  } finally {
    // Clean up local storage and session storage style quiz items
    localStorage.removeItem("velura_guest_quiz_data");
    const keysToRemove = [
      "quiz-height", "quiz-weight", "quiz-vong1", "quiz-vong2", "quiz-vong3",
      "quiz-body-shape", "quiz-main-style", "quiz-context", "quiz-colors", "quiz-budget"
    ];
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  }
}

// ─── OTP Modal ──────────────────────────────────────────────────────────────

function showOtpModal(identity, onSuccess, onResend, purpose = "") {
  const existing = document.querySelector(".otp-modal-container");
  if (existing) existing.remove();

  const ttl = 5 * 60; // 5 minutes in seconds
  let secondsLeft = ttl;
  let resendCooldown = 60;
  let timerInterval, resendInterval;

  const modal = document.createElement("div");
  modal.className = "otp-modal-container";
  modal.innerHTML = `
    <div class="otp-backdrop"></div>
    <div class="otp-card" role="dialog" aria-modal="true" aria-labelledby="otp-title">
      <h3 id="otp-title" class="otp-card__title">Xác minh tài khoản</h3>
      <p class="otp-card__desc">Nhập mã OTP 6 chữ số được gửi tới<br/><strong>${identity}</strong></p>
      <p class="otp-card__notice" style="color:#d9534f;font-size:0.8rem;margin-bottom:8px;">
        ⚠️ Dev mode: xem mã OTP trong console terminal của API server
      </p>
      <div class="otp-timer-row">
        <span>Mã hết hạn sau: </span>
        <strong id="otp-timer-display">05:00</strong>
      </div>
      <div class="otp-inputs" id="otp-inputs">
        ${[0,1,2,3,4,5].map(i => `<input type="text" class="otp-digit" maxlength="1" inputmode="numeric" data-index="${i}" aria-label="Chữ số OTP thứ ${i+1}" />`).join("")}
      </div>
      <div class="field__error" id="otp-error" aria-live="polite"></div>
      <button class="btn btn--login" id="btn-verify-otp" style="margin-top:16px;">Xác nhận</button>
      <div style="margin-top:12px;text-align:center;">
        <button class="otp-resend-btn" id="btn-resend-otp" disabled>
          Gửi lại OTP (<span id="resend-countdown">60</span>s)
        </button>
      </div>
      <button class="otp-cancel-btn" id="btn-cancel-otp">Hủy</button>
    </div>`;
  document.body.appendChild(modal);

  const digits = modal.querySelectorAll(".otp-digit");
  const verifyBtn = document.getElementById("btn-verify-otp");
  const cancelBtn = document.getElementById("btn-cancel-otp");
  const resendBtn = document.getElementById("btn-resend-otp");
  const timerEl = document.getElementById("otp-timer-display");
  const resendCountEl = document.getElementById("resend-countdown");

  // Auto-focus first digit
  digits[0].focus();

  // Digit input navigation
  digits.forEach((d, i) => {
    d.addEventListener("input", () => {
      d.value = d.value.replace(/\D/g, "").slice(-1);
      if (d.value && i < 5) digits[i + 1].focus();
      if (getOtp().length === 6) verifyBtn.click();
    });
    d.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !d.value && i > 0) digits[i - 1].focus();
    });
    d.addEventListener("paste", e => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
      pasted.split("").forEach((ch, j) => { if (digits[j]) digits[j].value = ch; });
      if (digits[Math.min(pasted.length, 5)]) digits[Math.min(pasted.length, 5)].focus();
      if (pasted.length === 6) setTimeout(() => verifyBtn.click(), 100);
    });
  });

  function getOtp() { return [...digits].map(d => d.value).join(""); }

  // Countdown timer
  timerInterval = setInterval(() => {
    secondsLeft--;
    const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const s = String(secondsLeft % 60).padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      timerEl.textContent = "00:00";
      timerEl.style.color = "#d9534f";
      setError("otp-error", "Mã OTP đã hết hạn. Vui lòng gửi lại.");
      verifyBtn.disabled = true;
    }
  }, 1000);

  // Resend countdown
  resendInterval = setInterval(() => {
    resendCooldown--;
    if (resendCountEl) resendCountEl.textContent = resendCooldown;
    if (resendCooldown <= 0) {
      clearInterval(resendInterval);
      resendBtn.disabled = false;
      resendBtn.textContent = "Gửi lại OTP";
    }
  }, 1000);

  // Verify
  verifyBtn.addEventListener("click", async () => {
    const otp = getOtp();
    if (otp.length !== 6) { setError("otp-error", "Vui lòng nhập đủ 6 chữ số."); return; }
    const prev = verifyBtn.textContent;
    verifyBtn.textContent = "Đang xác minh..."; verifyBtn.disabled = true;
    try {
      const data = await apiRequest("/api/user/auth/otp-verify", {
        method: "POST", body: JSON.stringify({ identity, otp_code: otp, purpose })
      });
      clearInterval(timerInterval); clearInterval(resendInterval);
      modal.remove();
      // Attach OTP used so callers (e.g. forgot-password) can save it for reset-password
      onSuccess({ ...data, _otp_used: otp });
    } catch (err) {
      setError("otp-error", err.message || "Mã OTP không chính xác.");
      verifyBtn.textContent = prev; verifyBtn.disabled = false;
    }
  });

  // Resend
  resendBtn.addEventListener("click", async () => {
    if (onResend) {
      try { await onResend(); } catch { /* silent */ }
    }
    // Reset timer
    secondsLeft = ttl; resendCooldown = 60;
    resendBtn.disabled = true;
    timerEl.style.color = "";
    verifyBtn.disabled = false;
    setError("otp-error", "");
    digits.forEach(d => d.value = ""); digits[0].focus();
    clearInterval(timerInterval); clearInterval(resendInterval);
    timerInterval = setInterval(() => { /* same logic handled by closure */ }, 1000);
    showToast("Mã OTP mới đã được gửi.");
  });

  // Cancel
  cancelBtn.addEventListener("click", () => {
    clearInterval(timerInterval); clearInterval(resendInterval);
    modal.remove();
  });
}

// ─── Sign In ─────────────────────────────────────────────────────────────────

function bindSignin() {
  const form = document.getElementById("js-signin-form");
  if (!form) return;

  // Store original button label
  const btn = document.getElementById("btn-signin");
  if (btn) btn.dataset.label = btn.textContent;

  // Password toggle
  bindPasswordToggle("password");
  bindPasswordToggle("password-email");

  // Lockout countdown state
  let lockTimer = null;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors("error-phone", "error-password", "error-email-login", "error-password-email");

    const isPhone = document.getElementById("tab-phone")?.classList.contains("tab--active");
    const phone = document.getElementById("phone")?.value.trim() || "";
    const emailLogin = document.getElementById("email-login")?.value.trim() || "";
    const password = isPhone
      ? document.getElementById("password")?.value || ""
      : document.getElementById("password-email")?.value || "";

    if (isPhone) {
      if (!phone) { setError("error-phone", "Vui lòng nhập số điện thoại."); return; }
      if (!isValidPhone(phone)) { setError("error-phone", "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)."); return; }
    }
    if (!isPhone && !emailLogin) { setError("error-email-login", "Vui lòng nhập email."); return; }
    if (!password) { setError(isPhone ? "error-password" : "error-password-email", "Vui lòng nhập mật khẩu."); return; }

    const payload = isPhone ? { phone, password } : { email: emailLogin, password };
    const identity = isPhone ? phone : emailLogin;
    setLoading(btn, true);

    try {
      const data = await apiRequest("/api/user/auth/signin", { method: "POST", body: JSON.stringify(payload) });

      if (data.otp_required) {
        setLoading(btn, false);
        showOtpModal(identity, (d) => {
          storeAuthSession(d);
          migrateStyleQuizOnLogin().catch(console.error);
          mergeCartOnLogin();
          syncFavoriteOutfitsOnLogin().catch(console.error);
          showToast("Đăng nhập thành công!");
          setTimeout(() => { window.location.href = getSafePostAuthRedirect(); }, 1200);
        }, () => apiRequest("/api/user/auth/otp-send", { method: "POST", body: JSON.stringify({ identity }) }));
        return;
      }

      storeAuthSession(data);
      migrateStyleQuizOnLogin().catch(console.error);
      mergeCartOnLogin();
      syncFavoriteOutfitsOnLogin().catch(console.error);
      showToast("Đăng nhập thành công!");
      setTimeout(() => { window.location.href = getSafePostAuthRedirect(); }, 1200);
    } catch (err) {
      setLoading(btn, false);
      if (err.status === 403) {
        // Locked account
        const countdown = document.getElementById("lock-countdown");
        if (countdown) {
          countdown.removeAttribute("hidden");
          countdown.style.display = "flex";
        }
        let seconds = 15 * 60;
        if (err.message) {
          const match = err.message.match(/trong (\d+) phút/);
          if (match) {
            seconds = parseInt(match[1], 10) * 60;
          }
        }
        startLockCountdown(seconds, btn);
      } else {
        setError(isPhone ? "error-password" : "error-password-email", err.message || "Thông tin đăng nhập không chính xác.");
      }
    }
  });
}

function startLockCountdown(seconds, btn) {
  const timerEl = document.getElementById("lock-timer");
  if (!timerEl) return;
  if (btn) btn.disabled = true;

  const interval = setInterval(() => {
    seconds--;
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
    if (seconds <= 0) {
      clearInterval(interval);
      const countdown = document.getElementById("lock-countdown");
      if (countdown) {
        countdown.setAttribute("hidden", "");
        countdown.style.display = "none";
      }
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
    }
  }, 1000);
}

// ─── Sign Up ─────────────────────────────────────────────────────────────────

function bindSignup() {
  const form = document.getElementById("js-signup-form");
  if (!form) return;

  const btn = document.getElementById("btn-signup");
  if (btn) btn.dataset.label = btn.textContent;

  bindPasswordToggle("password-signup");
  bindPasswordToggle("password-confirm");
  bindStrengthMeter("password-signup", "strength-fill", "strength-label", "password-strength");

  // Real-time duplicate checks
  const phoneInput = document.getElementById("phone-signup");
  const emailInput = document.getElementById("email-signup");
  if (phoneInput) {
    phoneInput.addEventListener("input", debounce(() => {
      const phoneVal = phoneInput.value.trim();
      if (!phoneVal) {
        setError("error-phone-signup", "");
        const icon = document.getElementById("phone-check-icon");
        if (icon) icon.hidden = true;
        return;
      }
      if (!isValidPhone(phoneVal)) {
        setError("error-phone-signup", "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).");
        const icon = document.getElementById("phone-check-icon");
        if (icon) { icon.textContent = "✗"; icon.style.color = "#d9534f"; icon.hidden = false; }
      } else {
        setError("error-phone-signup", "");
        checkDuplicate("phone", phoneVal, "error-phone-signup", "phone-check-icon");
      }
    }, 600));
  }
  if (emailInput) {
    emailInput.addEventListener("input", debounce(() => {
      if (emailInput.value.trim().includes("@"))
        checkDuplicate("email", emailInput.value.trim(), "error-email-signup", "email-check-icon");
    }, 600));
  }

  // Confirm password match check
  const confirmInput = document.getElementById("password-confirm");
  const pwInput = document.getElementById("password-signup");
  if (confirmInput && pwInput) {
    confirmInput.addEventListener("input", () => {
      if (confirmInput.value && confirmInput.value !== pwInput.value)
        setError("error-confirm", "Mật khẩu xác nhận không khớp.");
      else setError("error-confirm", "");
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors("error-fullname", "error-phone-signup", "error-email-signup", "error-password-signup", "error-confirm");

    const fullname = document.getElementById("fullname")?.value.trim() || "";
    const phone = phoneInput?.value.trim() || "";
    const email = emailInput?.value.trim() || "";
    const password = pwInput?.value || "";
    const confirm = confirmInput?.value || "";

    let hasError = false;
    if (!fullname) { setError("error-fullname", "Họ và tên là bắt buộc."); hasError = true; }
    if (!phone) {
      setError("error-phone-signup", "Số điện thoại là bắt buộc.");
      hasError = true;
    } else if (!isValidPhone(phone)) {
      setError("error-phone-signup", "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).");
      hasError = true;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("error-email-signup", "Email không đúng định dạng."); hasError = true; }
    if (!validatePassword(password)) {
      setError("error-password-signup", "Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số/ký tự đặc biệt.");
      hasError = true;
    }
    if (password !== confirm) { setError("error-confirm", "Mật khẩu xác nhận không khớp."); hasError = true; }
    if (hasError) return;

    setLoading(btn, true);
    const identity = email || phone;

    try {
      const data = await apiRequest("/api/user/auth/signup", {
        method: "POST", body: JSON.stringify({ full_name: fullname, phone, email: email || undefined, password })
      });
      setLoading(btn, false);
      if (data.otp_required) {
        showOtpModal(identity, (d) => {
          storeAuthSession(d);
          migrateStyleQuizOnLogin().catch(console.error);
          mergeCartOnLogin();
          syncFavoriteOutfitsOnLogin().catch(console.error);
          showToast("Đăng ký tài khoản thành công! Chào mừng bạn đến với Velura 🎉");
          setTimeout(() => { window.location.href = "/index.html"; }, 1500);
        }, () => apiRequest("/api/user/auth/otp-send", { method: "POST", body: JSON.stringify({ identity }) }));
      }
    } catch (err) {
      setLoading(btn, false);
      if (err.message?.includes("Số điện thoại")) setError("error-phone-signup", err.message);
      else if (err.message?.includes("Email")) setError("error-email-signup", err.message);
      else showToast(err.message || "Đăng ký thất bại.");
    }
  });
}

// ─── Forgot Password ─────────────────────────────────────────────────────────

function bindForgotPassword() {
  const form = document.getElementById("js-forgot-form");
  if (!form) return;

  const btn = document.getElementById("btn-forgot");
  if (btn) btn.dataset.label = btn.textContent;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors("error-identity");
    const identity = document.getElementById("identity")?.value.trim() || "";
    if (!identity) { setError("error-identity", "Vui lòng nhập email hoặc số điện thoại."); return; }
    const isEmail = identity.includes("@");
    if (!isEmail && !isValidPhone(identity)) {
      setError("error-identity", "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).");
      return;
    }
    setLoading(btn, true);

    try {
      await apiRequest("/api/user/auth/otp-send", { method: "POST", body: JSON.stringify({ identity }) });
      setLoading(btn, false);

      // Show OTP modal — on success the otp_code is stored, then redirect to reset page
      showOtpModal(identity, (d) => {
        sessionStorage.setItem("velura_reset_identity", identity);
        // Store the OTP that was verified so reset-password can use it
        sessionStorage.setItem("velura_reset_otp", d._otp_used || "");
        showToast("Xác minh thành công! Tạo mật khẩu mới ngay.");
        setTimeout(() => { window.location.href = "/src/pages/auth/reset-password.html"; }, 1200);
      }, () => apiRequest("/api/user/auth/otp-send", { method: "POST", body: JSON.stringify({ identity }) }), "reset-password");
    } catch (err) {
      setLoading(btn, false);
      setError("error-identity", err.message || "Không tìm thấy tài khoản.");
    }
  });
}

// ─── Reset Password ───────────────────────────────────────────────────────────

function bindResetPassword() {
  const form = document.getElementById("js-reset-form");
  if (!form) return;

  const btn = document.getElementById("btn-reset");
  if (btn) btn.dataset.label = btn.textContent;

  const identity = sessionStorage.getItem("velura_reset_identity");
  const otpCode = sessionStorage.getItem("velura_reset_otp");

  if (!identity) {
    showToast("Phiên xác minh đã hết hạn. Vui lòng thực hiện lại.");
    setTimeout(() => { window.location.href = "/src/pages/auth/forgot-password.html"; }, 1800);
    return;
  }

  bindPasswordToggle("password-new");
  bindPasswordToggle("password-confirm-reset");
  bindStrengthMeter("password-new", "reset-strength-fill", "reset-strength-label", "reset-password-strength");

  const pwInput = document.getElementById("password-new");
  const confirmInput = document.getElementById("password-confirm-reset");
  if (confirmInput && pwInput) {
    confirmInput.addEventListener("input", () => {
      if (confirmInput.value && confirmInput.value !== pwInput.value)
        setError("error-confirm-reset", "Mật khẩu xác nhận không khớp.");
      else setError("error-confirm-reset", "");
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors("error-password-new", "error-confirm-reset");

    const password = pwInput?.value || "";
    const confirm = confirmInput?.value || "";

    let hasError = false;
    if (!validatePassword(password)) {
      setError("error-password-new", "Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số/ký tự đặc biệt.");
      hasError = true;
    }
    if (password !== confirm) { setError("error-confirm-reset", "Mật khẩu xác nhận không khớp."); hasError = true; }
    if (hasError) return;

    setLoading(btn, true);
    try {
      await apiRequest("/api/user/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ identity, otp_code: otpCode || "123456", password })
      });
      sessionStorage.removeItem("velura_reset_identity");
      sessionStorage.removeItem("velura_reset_otp");
      showToast("Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.");
      setTimeout(() => { window.location.href = "/src/pages/auth/signin.html"; }, 1500);
    } catch (err) {
      setLoading(btn, false);
      setError("error-password-new", err.message || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.");
    }
  });
}

// ─── Header Auth UI ───────────────────────────────────────────────────────────

function applyHeaderAuthUI() {
  const token = localStorage.getItem("velura_token");
  const raw = localStorage.getItem("velura_user");

  const signinBtns = document.querySelectorAll(".js-menu-signin-btn");
  const signupBtns = document.querySelectorAll(".js-menu-signup-btn");
  const profileBtns = document.querySelectorAll(".js-menu-profile-btn");
  const logoutBtns = document.querySelectorAll(".js-menu-logout-btn");

  // If header hasn't been injected yet, return false so caller can retry
  if (signinBtns.length === 0 && profileBtns.length === 0) {
    return false;
  }

  const isLoggedIn = raw && (() => {
    try {
      const user = JSON.parse(raw);
      return !!(token || user.is_dev_mock);
    } catch {
      return false;
    }
  })();

  if (isLoggedIn) {
    try {
      const user = JSON.parse(raw);

      // Update dropdown visibility
      signinBtns.forEach(btn => btn.style.display = "none");
      signupBtns.forEach(btn => btn.style.display = "none");
      profileBtns.forEach(btn => btn.style.display = "block");
      logoutBtns.forEach(btn => btn.style.display = "block");

      const notifEl = document.getElementById("js-header-notifications");
      if (notifEl) {
        notifEl.style.display = "inline-flex";
        import("./notifications.js").then(({ updateNotificationsUI }) => {
          updateNotificationsUI().catch(console.error);
        });
      }

      // Fallback: Update legacy signin links if any exist outside dropdown
      document.querySelectorAll("a[href*='signin.html']").forEach(link => {
        if (!link.classList.contains("user-dropdown-item")) {
          link.href = "/src/pages/account/profile.html";
          const name = (user.full_name || "").split(" ").pop() || "Tài khoản";
          link.innerHTML = `<span style="font-weight:500;font-size:0.875rem;">${name}</span>`;
        }
      });
    } catch (e) {
      console.error("Lỗi parse thông tin user:", e);
    }
  } else {
    // Not logged in
    signinBtns.forEach(btn => btn.style.display = "block");
    signupBtns.forEach(btn => btn.style.display = "block");
    profileBtns.forEach(btn => btn.style.display = "none");
    logoutBtns.forEach(btn => btn.style.display = "none");

    const notifEl = document.getElementById("js-header-notifications");
    if (notifEl) notifEl.style.display = "none";
  }

  // Bind logout listener
  logoutBtns.forEach(btn => {
    if (btn.dataset.listenerBound === "true") return;
    btn.dataset.listenerBound = "true";

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      clearAuthSession();
      showToast("Đã đăng xuất thành công.");
      setTimeout(() => {
        window.location.href = "/index.html";
      }, 1000);
    });
  });

  return true;
}

/**
 * Update header auth UI. If header is not yet in the DOM (happens when the
 * vite-plugin-html-inject hasn't finished), retry with a MutationObserver.
 * Exported so other modules (e.g. after a successful login) can call it.
 */
export function updateHeaderAuthUI() {
  // Try immediately
  if (applyHeaderAuthUI()) return;

  // Header not ready yet — observe DOM and retry when it appears
  const observer = new MutationObserver(() => {
    if (applyHeaderAuthUI()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Safety timeout — give up after 3 seconds to avoid memory leaks
  setTimeout(() => {
    observer.disconnect();
    applyHeaderAuthUI(); // One final attempt
  }, 3000);
}

// ─── Social OAuth (Google / Facebook via Supabase Auth) ─────────────────────

const SUPABASE_URL = "https://gtyuajboeffmfskofoyh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_boQ_U1tSUZLbI7_0-NQvcg_3s_TEjfm";
const SUPABASE_AUTH = SUPABASE_URL + "/auth/v1";
const PKCE_KEY = "velura-oauth-pkce-code-verifier";
const CALLBACK_URL = window.location.origin + "/src/pages/auth/auth-callback.html";

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function computeCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const array = new Uint8Array(digest);
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function startSocialOAuth(provider) {
  const verifier = generateCodeVerifier();
  const challenge = await computeCodeChallenge(verifier);
  localStorage.setItem(PKCE_KEY, verifier);
  const url = SUPABASE_AUTH + "/authorize?provider=" + provider
    + "&code_challenge=" + encodeURIComponent(challenge)
    + "&code_challenge_method=s256"
    + "&redirect_to=" + encodeURIComponent(CALLBACK_URL);
  window.location.href = url;
}

function bindSocialLogin() {
  const googleBtn = document.getElementById("btn-google-login");
  const facebookBtn = document.getElementById("btn-facebook-login");

  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      try {
        await startSocialOAuth("google");
      } catch {
        showToast("Không thể kết nối Google. Vui lòng thử lại.");
      }
    });
  }

  if (facebookBtn) {
    facebookBtn.addEventListener("click", async () => {
      try {
        await startSocialOAuth("facebook");
      } catch {
        showToast("Không thể kết nối Facebook. Vui lòng thử lại.");
      }
    });
  }
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function initAuthClient() {
  // Enforce strict guest session (clear localStorage if new browser session)
  const token = localStorage.getItem("velura_token");
  if (!token) {
    const hasSessionCookie = document.cookie.includes("velura_session_active=1");
    if (!hasSessionCookie) {
      localStorage.removeItem("velura_cart");
      localStorage.removeItem("velura_guest_wishlist");
      localStorage.removeItem("velura_guest_session_id");
      localStorage.removeItem("velura_quiz_answers");
      localStorage.removeItem("velura_style_profile_results");
      localStorage.removeItem("velura_guest_quiz_completed");
      document.cookie = "velura_session_active=1; path=/";
    }
  }

  bindSignin();
  bindSignup();
  bindForgotPassword();
  bindResetPassword();
  bindSocialLogin();
  updateHeaderAuthUI();

  // Bind Account Dropdown Item Listeners
  const logoutBtn = document.querySelector(".js-dropdown-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearAuthSession();
      showToast("Đăng xuất thành công!");
      setTimeout(() => {
        window.location.href = "/src/pages/auth/signin.html";
      }, 1000);
    });
  }

  const dropdownTrigger = document.querySelector(".header-account-dropdown .btn-icon-wrapper");
  if (dropdownTrigger) {
    dropdownTrigger.addEventListener("click", (e) => {
      // Toggle dropdown behavior on mobile devices / fallback
      const hasSession = localStorage.getItem("velura_token");
      if (!hasSession) {
        window.location.href = "/src/pages/auth/signin.html";
      } else if (window.innerWidth <= 768) {
        // Toggle active class on mobile for click events
        const menu = document.querySelector(".account-dropdown-menu");
        if (menu) {
          const isVisible = menu.style.visibility === "visible";
          menu.style.opacity = isVisible ? "0" : "1";
          menu.style.visibility = isVisible ? "hidden" : "visible";
          menu.style.pointerEvents = isVisible ? "none" : "auto";
        }
      } else {
        window.location.href = "/src/pages/account/profile.html";
      }
    });
  }
}
