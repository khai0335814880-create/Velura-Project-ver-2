import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveDashboardPeriod } from "../../apps/api/src/dashboard.js";

test("dashboard week is seven complete Vietnam calendar days", () => {
  const params = new URLSearchParams("range=week");
  const period = resolveDashboardPeriod(params, new Date("2026-07-12T02:30:00.000Z"));
  assert.equal(period.days, 7);
  assert.equal(period.from.toISOString(), "2026-07-05T17:00:00.000Z");
  assert.equal(period.to.toISOString(), "2026-07-12T17:00:00.000Z");
});

test("dashboard custom range includes the full ending business day", () => {
  const params = new URLSearchParams("from=2026-06-21&to=2026-06-27");
  const period = resolveDashboardPeriod(params);
  assert.equal(period.range, "custom");
  assert.equal(period.days, 7);
  assert.equal(period.from.toISOString(), "2026-06-20T17:00:00.000Z");
  assert.equal(period.to.toISOString(), "2026-06-27T17:00:00.000Z");
});

test("dashboard rejects partial and invalid custom ranges", () => {
  assert.throws(() => resolveDashboardPeriod(new URLSearchParams("from=2026-06-21")), /đủ ngày/);
  assert.throws(() => resolveDashboardPeriod(new URLSearchParams("from=2026-02-30&to=2026-03-01")), /không phải ngày hợp lệ/);
});


test("dashboard operational KPIs use exact filter semantics", () => {
  const sql = readFileSync(new URL("../../database/migrations/018_admin_dashboard_summary.sql", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../../apps/admin-web/src/scripts/dashboard.js", import.meta.url), "utf8");
  assert.match(sql, /return_exchange where status::text = 'pending'/);
  assert.match(sql, /support_ticket where status::text = 'processing'/);
  assert.match(sql, /status::text = 'approved'.*approved_reviews/);
  assert.match(sql, /status::text = 'rejected'.*hidden_reviews/);
  assert.doesNotMatch(ui, /data\.business\.pendingReviews/);
  assert.doesNotMatch(ui, /Đánh giá cần duyệt|Đánh giá tiêu cực|đánh giá tiêu cực|urgentReviews|Hạn trong tuần này|Xem tất cả/);
  assert.match(ui, /nhóm cảnh báo/);
});
