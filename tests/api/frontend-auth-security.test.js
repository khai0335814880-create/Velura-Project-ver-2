import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

async function source(relativePath) {
  const normalizedPath = relativePath.startsWith("src/") ? `apps/admin-web/${relativePath}` : relativePath;
  return readFile(path.join(ROOT, normalizedPath), "utf8");
}

test("admin browser code delegates identity and RBAC to the backend", async () => {
  const [login, callback, admin, auth] = await Promise.all([
    source("src/pages/admin/login.html"),
    source("src/pages/admin/auth-callback.html"),
    source("src/scripts/admin.js"),
    source("src/scripts/auth.js")
  ]);

  const browserCode = `${login}\n${callback}\n${admin}`;
  assert.doesNotMatch(browserCode, /from\(["']users["']\)/i);
  assert.doesNotMatch(browserCode, /\/rest\/v1\/users/i);
  assert.doesNotMatch(browserCode, /select\(["']\*["']\)/i);
  assert.doesNotMatch(browserCode, /password_hash|otp_code/i);
  assert.doesNotMatch(browserCode, /Velura@123|reset123/i);
  assert.match(auth, /fetchAuthContext\s*\(/);
  assert.match(callback, /establishAuthoritativeSession\s*\(/);
});

test("Supabase OAuth: manual PKCE verifier, correct redirect_uri, raw exchange", async () => {
  const [login, callback] = await Promise.all([
    source("src/pages/admin/login.html"),
    source("src/pages/admin/auth-callback.html")
  ]);

  // Login must generate its own PKCE code_verifier using Web Crypto API,
  // store in a custom localStorage key, and redirect to Supabase authorize
  // with the code_challenge — NOT rely on the Supabase client's internal PKCE.
  assert.match(login, /generateCodeVerifier\(/);
  assert.match(login, /computeCodeChallenge\(/);
  assert.match(login, /localStorage\.setItem\(PKCE_STORAGE_KEY/);
  assert.match(login, /code_challenge_method=s256/);
  assert.match(login, /velura-oauth-pkce-code-verifier/);

  // Login must NOT use sessionStorage for the PKCE verifier.
  assert.doesNotMatch(login, /storage:\s*window\.sessionStorage/);

  // Callback must use direct fetch to /auth/v1/token?grant_type=pkce with
  // redirect_uri = origin + pathname (NOT window.location.href which includes
  // ?code=...&state=... and causes flow_state_not_found).
  assert.match(callback, /token\?grant_type=pkce/);
  assert.match(callback, /redirect_uri:\s*REDIRECT_URI/);
  assert.match(callback, /const REDIRECT_URI\s*=\s*window\.location\.origin\s*\+\s*window\.location\.pathname/);

  // Callback must read verifier from the same custom key as login.
  assert.match(callback, /velura-oauth-pkce-code-verifier/);
  assert.match(callback, /localStorage\.getItem\(VERIFIER_KEY\)/);

  // Callback must set accessToken from raw token response, not from Supabase client session.
  assert.match(callback, /setAccessToken\(/);
});

test("password changes use Supabase Auth and production password policy", async () => {
  const page = await source("src/pages/admin/change-password.html");
  assert.match(page, /client\.auth\.updateUser\(\{\s*password:/);
  assert.match(page, /client\.auth\.signInWithPassword/);
  assert.match(page, /value\.length\s*>=\s*12/);
  assert.doesNotMatch(page, /changePassword.*auth-core|mustChangePassword|Velura@123/i);
});

test("active seed directory contains no privilege hotfix SQL", async () => {
  const seedDirectory = path.join(ROOT, "database", "seed");
  const entries = await readdir(seedDirectory);
  assert.deepEqual(entries.filter((name) => name.endsWith(".sql")), []);
  const readme = await source("database/seed/README.md");
  assert.match(readme, /seed-admin-users\.mjs/);
});

test("account table rendering escapes untrusted database values", async () => {
  const admin = await source("src/scripts/admin.js");
  assert.match(admin, /function escapeHtml\s*\(/);
  assert.match(admin, /escapeHtml\(row\.full_name/);
  assert.match(admin, /escapeHtml\(row\.email/);
  assert.match(admin, /accountApi\.list\s*\(/);
  assert.doesNotMatch(admin, /db\.js|\bdb\.|allowDemoData/);
});

test("product administration uses the versioned API and encodes database values", async () => {
  const [products, api] = await Promise.all([
    source("src/scripts/products.js"),
    source("src/scripts/product-api.js")
  ]);
  assert.doesNotMatch(products, /from\s+["']\.\/db\.js["']|db\.getProducts|localStorage/);
  assert.match(products, /function escapeHtml\s*\(/);
  assert.match(products, /productApi\.list\s*\(/);
  assert.match(products, /productApi\.updateStock\s*\(/);
  assert.match(products, /productApi\.commitCsv\s*\(/);
  assert.doesNotMatch(products, /import-csv\/commit.*fetch|API_BASE_URL|getAccessToken\(/s);
  assert.match(api, /\/api\/v1\/admin\/products/);
  assert.match(api, /commitCsv\s*\(/);
  assert.doesNotMatch(api, /\/rest\/v1\/product/);
});

test("dashboard backend uses the canonical, service-only Supabase aggregation", async () => {
  const [dashboard, migration] = await Promise.all([
    source("apps/api/src/dashboard.js"),
    source("database/migrations/018_admin_dashboard_summary.sql")
  ]);
  assert.match(dashboard, /callRpc\("get_admin_dashboard_summary"/);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /revoke all on function .* from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function .* to service_role/i);
  assert.match(migration, /join current_orders o on o\.order_id = oi\.order_id/i);
  assert.match(migration, /count\(distinct product_id\)/i);
});

test("admin registration page has no demo account creation path", async () => {
  const register = await source("src/pages/admin/register.html");
  assert.doesNotMatch(register, /auth-core|Velura@123|Google OAuth Demo|register\(|loginWithGoogle/);
  assert.match(register, /Dang ky admin da tat trong production/);
});

test("order administration uses the typed API without mock database access", async () => {
  const source = await readFile(new URL("../../apps/admin-web/src/scripts/orders.js", import.meta.url), "utf8");
  const api = await readFile(new URL("../../apps/admin-web/src/scripts/order-api.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from ["']\.\/db\.js["']/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.match(source, /escapeHtml/);
  assert.match(source, /orderApi\.(list|get|changeStatus|cancel|resolvePayment)/);
  assert.match(api, /\/api\/v1\/admin\/orders/);
  assert.doesNotMatch(api, /\/rest\/v1\//);
});

test("A04-A06 admin pages use typed APIs and escape Supabase values", async () => {
  const entries = [
    ["src/scripts/reviews.js", "reviewApi", "escapeReviewHtml"],
    ["src/scripts/returns-cskh.js", "returnApi", "escapeServiceHtml"],
    ["src/scripts/pricing.js", "pricingApi", "escapePricingHtml"],
    ["src/scripts/promotions.js", "pricingApi", "escapePromotionHtml"]
  ];
  for (const [file, apiName, escapeName] of entries) {
    const browserSource = await source(file);
    assert.doesNotMatch(browserSource, /from\s+["']\.\/db\.js["']|\bdb\.|localStorage|\/rest\/v1\//);
    assert.match(browserSource, new RegExp(`${apiName}\\.`));
    assert.match(browserSource, new RegExp(`function ${escapeName}\\s*\\(`));
  }
});

test("source tree contains no hard-coded Supabase management or secret key", async () => {
  const candidates = [
    ".env.example",
    "apps/api/src/server.js",
    "apps/api/src/supabase.js"
  ];
  const combined = (await Promise.all(candidates.map(source))).join("\n");
  assert.doesNotMatch(combined, /sbp_[A-Za-z0-9]{20,}|sb_secret_[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(combined, /postgresql:\/\/[^\s]+:[^\s\[]+@/);
});

test("customer auth redesign preserves the live DOM and API contracts", async () => {
  const [signin, signup, forgot, client, authCss] = await Promise.all([
    source("apps/user-web/src/pages/auth/signin.html"),
    source("apps/user-web/src/pages/auth/signup.html"),
    source("apps/user-web/src/pages/auth/forgot-password.html"),
    source("apps/user-web/src/scripts/modules/auth-client.js"),
    source("apps/user-web/src/styles/pages/_auth-external.css")
  ]);

  for (const page of [signin, signup, forgot]) {
    assert.match(page, /class="velura-auth-page"/);
    assert.match(page, /scripts\/main\.js/);
    assert.doesNotMatch(page, /auth-external\.js|thành công! \(Demo\)/i);
  }

  for (const id of [
    "js-signin-form", "tab-phone", "tab-email", "panel-phone", "panel-email",
    "phone", "email-login", "password", "password-email", "btn-signin",
    "error-phone", "error-password", "error-email-login", "error-password-email",
    "lock-countdown", "lock-timer"
  ]) {
    assert.match(signin, new RegExp(`id="${id}"`));
  }

  for (const id of [
    "js-signup-form", "fullname", "phone-signup", "email-signup",
    "password-signup", "password-confirm", "phone-check-icon", "email-check-icon",
    "password-strength", "strength-fill", "strength-label", "btn-signup",
    "error-fullname", "error-phone-signup", "error-email-signup",
    "error-password-signup", "error-confirm"
  ]) {
    assert.match(signup, new RegExp(`id="${id}"`));
  }

  for (const id of ["js-forgot-form", "identity", "error-identity", "btn-forgot"]) {
    assert.match(forgot, new RegExp(`id="${id}"`));
  }

  assert.match(client, /\/api\/user\/auth\/signin/);
  assert.match(client, /\/api\/user\/auth\/signup/);
  assert.match(client, /\/api\/user\/auth\/otp-send/);
  assert.match(client, /\/api\/user\/auth\/otp-verify/);
  assert.doesNotMatch(client, /js-dev-login-phone|js-dev-login-email|dev-quick-login|Test Phone|Test Email/);
  assert.match(authCss, /\.velura-auth-page/);
});

test("customer member and guest flows require real auth sessions", async () => {
  const [client, session, api, cart, main, profile, product, rbac] = await Promise.all([
    source("apps/user-web/src/scripts/modules/auth-client.js"),
    source("apps/user-web/src/scripts/modules/auth-session.js"),
    source("apps/user-web/src/scripts/modules/api.js"),
    source("apps/user-web/src/scripts/modules/cart.js"),
    source("apps/user-web/src/scripts/main.js"),
    source("apps/user-web/src/scripts/modules/account-profile.js"),
    source("apps/user-web/src/scripts/modules/product-catalog.js"),
    source("apps/api/src/rbac.js")
  ]);

  assert.doesNotMatch(client, /createDevMemberSession|import\.meta\.env\.DEV|js-dev-login|Test Phone|Test Email/);
  assert.doesNotMatch(session, /createDevMemberSession|DEV_MEMBER_ID|is_dev_mock|member\.test@velura\.local|0901234567/);

  assert.match(session, /if \(!token\)/);
  assert.match(session, /hasRealAuthSession\s*\(/);
  assert.match(session, /getStoredUser\(\)\?\.user_id/);
  assert.match(session, /getCurrentRole\s*\(/);
  assert.match(session, /localStorage\.setItem\(STORAGE_KEYS\.role,\s*normalizedUser\.role\)/);
  assert.match(session, /localStorage\.setItem\(STORAGE_KEYS\.userId,\s*String\(normalizedUser\.user_id\)\)/);

  assert.match(api, /const isSafeAccountPage/);
  assert.match(api, /currentPath\.includes\("profile\.html"\)/);
  assert.match(api, /currentPath\.includes\("track-order\.html"\)/);
  assert.doesNotMatch(api, /localStorage\.removeItem\("velura_token"\)/);
  assert.match(cart, /body:\s*JSON\.stringify\(\{\s*phone,\s*password\s*\}\)/);
  assert.match(cart, /storeAuthSession\(authRes\)/);
  assert.doesNotMatch(cart, /login_id:\s*phone/);
  assert.match(cart, /renderCheckoutLayout\(getCurrentRole\(\)\)/);
  assert.match(cart, /showGuestOrderConfirmModal\(\s*\(\) => getCheckoutSnapshot\(\)\.shipping/);
  assert.match(cart, /hasRealAuthSession\(\)/);

  assert.match(main, /profile\.html/);
  assert.match(profile, /renderGuestProfileState\(\)/);
  assert.match(profile, /showGuestLoginModal\(\)/);
  assert.match(profile, /err\.status === 401 && !hasRealAuthSession\(\)/);
  assert.match(product, /member-lock-badge/);
  assert.match(product, /\/src\/pages\/auth\/signup\.html/);

  assert.match(rbac, /import \{ verifyJwt \} from "\.\/auth-helper\.js"/);
  assert.match(rbac, /const decodeVeluraToken = dependencies\.verifyJwt \|\| verifyJwt/);
  assert.match(rbac, /const decoded = decodeVeluraToken\(token\)/);
  assert.match(rbac, /authUser:\s*\{\s*id:\s*profile\.user_id/);
});

test("customer wishlist uses users.wishlist JSON and not a dedicated wishlist table", async () => {
  const [wishlistRoute, legacyWishlistRoute, schema] = await Promise.all([
    source("apps/api/src/user/wishlist.js"),
    source("apps/api/src/v1-wishlist-routes.js"),
    source("database/database_user/schema.sql")
  ]);

  const combinedRoutes = `${wishlistRoute}\n${legacyWishlistRoute}`;
  assert.match(wishlistRoute, /selectOne\("users"/);
  assert.match(wishlistRoute, /updateRows\("users"/);
  assert.match(wishlistRoute, /wishlist:\s*normalizeWishlist/);
  assert.doesNotMatch(combinedRoutes, /["']Wishlists["']/);
  assert.doesNotMatch(combinedRoutes, /insertRow\(|deleteRows\(/);
  assert.match(schema, /wishlist\s+JSONB\s+NOT NULL DEFAULT '\[\]'/i);
  assert.doesNotMatch(schema, /CREATE TABLE\s+Wishlists/i);
});

test("profile birthday is database-backed and shared with banner A1", async () => {
  const [profilePage, profileScript, offerScript, authScript, profileApi] = await Promise.all([
    source("apps/user-web/src/pages/account/profile.html"),
    source("apps/user-web/src/scripts/modules/account-profile.js"),
    source("apps/user-web/src/scripts/modules/monthly-offers.js"),
    source("apps/user-web/src/scripts/modules/auth-client.js"),
    source("apps/api/src/user/profile.js")
  ]);

  assert.doesNotMatch(profilePage, /value=["']15\/04\/2000["']/);
  assert.match(profilePage, /name=["']dob["'][^>]*value=["']["']/);
  assert.match(profileScript, /dobInput\.value\s*=\s*formatProfileDate\(profile\.date_of_birth\)/);
  assert.match(profileScript, /cacheLiveProfile\(updated\)/);
  assert.match(profileScript, /velura:profile-updated/);
  assert.match(offerScript, /apiRequest\(["']\/api\/user\/profile["']/);
  assert.match(offerScript, /sessionStorage\.setItem\(PENDING_BIRTHDAY_KEY/);
  assert.doesNotMatch(offerScript, /localStorage\.setItem\(PENDING_BIRTHDAY_KEY/);
  assert.match(authScript, /getSafePostAuthRedirect\(\)/);
  assert.match(profileApi, /validateDateOfBirth\(date_of_birth\)/);
  assert.match(profileApi, /user_id:\s*`eq\.\$\{profile\.user_id\}`/);
  const rbac = await source("apps/api/src/rbac.js");
  assert.match(rbac, /"date_of_birth",\s*"gender"/);
});
