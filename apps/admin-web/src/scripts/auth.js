import {
  buildAppSession,
  fetchAuthContext,
  getAccessToken,
  getSession as getSupabaseSession,
  setSession,
  signOut
} from "./supabase-auth.js";

var ROLE_PAGES = {
  super_admin: ["dashboard","accounts","products","orders","reviews","returns-cskh","pricing","promotions","logs"],
  admin_viewer: ["dashboard"],
  admin_operator_sanpham: ["products","dashboard"],
  admin_operator_donhang: ["orders","dashboard"],
  admin_operator_gia_km: ["pricing","dashboard","promotions"],
  admin_operator_danhgia_review: ["reviews","dashboard"],
  admin_operator_cskh_dt: ["returns-cskh","dashboard"],
  member: ["welcome"],
  guest: ["welcome"]
};

function getSession() {
  return getSupabaseSession();
}

function getCurrentPage() {
  var path = window.location.pathname;
  var file = path.split("/").pop().replace(".html", "");
  return file;
}

function avatarFallback(session) {
  var name = String(session?.name || "Admin").trim();
  return name.split(/\s+/).filter(Boolean).map(function(part) {
    return part.charAt(0);
  }).join("").slice(0, 2).toUpperCase() || "AD";
}

function renderProfileAvatar(element, session) {
  if (!element) return;

  var fallback = avatarFallback(session);
  var avatar = String(session?.avatar || "").trim();
  element.replaceChildren();

  try {
    var url = new URL(avatar);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported avatar URL");

    var image = document.createElement("img");
    image.src = url.href;
    image.alt = "";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", function() {
      element.replaceChildren();
      element.textContent = fallback;
    }, { once: true });
    element.appendChild(image);
  } catch {
    element.textContent = avatar && avatar.length <= 4 ? avatar : fallback;
  }
}

async function checkAuth() {
  var token = getAccessToken();
  if (!token) { window.location.replace("./login.html"); return null; }

  var session;
  try {
    session = buildAppSession(await fetchAuthContext(token));
    setSession(session);
  } catch {
    await signOut();
    window.location.replace("./login.html");
    return null;
  }

  var page = getCurrentPage();
  var rc = session.roleCode || "member";
  var allowed = ROLE_PAGES[rc] || ROLE_PAGES.member;

  if (!allowed.includes(page)) {
    window.location.replace("./" + (allowed[0] || "login") + ".html");
    return null;
  }

  return session;
}

async function logout() {
  await signOut();
  window.location.href = "./login.html";
}

function updateSidebarForRole(session) {
  if (!session) return;
  var rc = session.roleCode || "member";
  var allowed = ROLE_PAGES[rc] || ROLE_PAGES.member;

  var sidebar = document.querySelector(".admin-sidebar__nav");
  if (!sidebar) return;

  var allItems = sidebar.querySelectorAll(".admin-menu-item, .admin-menu-group");
  allItems.forEach(function(item) {
    var href = item.getAttribute("href") || "";
    var summary = item.querySelector("summary");
    var subNav = item.querySelector(".admin-menu-subnav");

    if (summary && subNav) {
      var subLinks = subNav.querySelectorAll("a");
      var hasAllowed = false;
      subLinks.forEach(function(link) {
        var subHref = link.getAttribute("href") || "";
        var subPage = subHref.replace("./", "").replace(".html", "");
        if (allowed.includes(subPage)) { hasAllowed = true; link.style.display = ""; }
        else { link.style.display = "none"; }
      });
      item.style.display = hasAllowed ? "" : "none";
    } else if (href) {
      var itemPage = href.replace("./", "").replace(".html", "");
      item.style.display = allowed.includes(itemPage) ? "" : "none";
    }
  });

  // Update profile
  var profile = document.querySelector(".admin-profile__copy strong");
  if (profile) profile.textContent = session.name;
  var roleEl = document.querySelector(".admin-profile__copy small");
  if (roleEl) roleEl.textContent = session.role;
  var avatarEl = document.querySelector(".admin-profile__avatar");
  renderProfileAvatar(avatarEl, session);

  // Add logout
  if (!document.querySelector("[data-admin-logout]")) {
    var actions = document.querySelector(".admin-topbar__actions");
    if (actions) {
      var logoutBtn = document.createElement("button");
      logoutBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
      logoutBtn.type = "button";
      logoutBtn.dataset.adminLogout = "";
      logoutBtn.textContent = "Đăng xuất";
      actions.appendChild(logoutBtn);
    }
  }
}

export { checkAuth, logout, updateSidebarForRole, getCurrentPage, getSession, renderProfileAvatar, ROLE_PAGES };
