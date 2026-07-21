import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createReviewService } from "../../apps/api/src/reviews/review-service.js";

const REVIEW_ID = "40000000-0000-4000-8000-000000000001";

test("review operator reads and unhides through the caller token", async () => {
  let received;
  const service = createReviewService({ repository: {
    list: async (filters, token) => { received = { filters, token }; return { rows: [], count: 0 }; },
    unhide: async (_id, input, token) => ({ ...input, token })
  } });
  await service.list(context("admin_operator_danhgia_review"), new URLSearchParams("rating=5&limit=20"));
  assert.equal(received.filters.rating, "5");
  assert.equal(received.token, "jwt-token");
  const result = await service.unhide(context("admin_operator_danhgia_review"), REVIEW_ID, { expectedVersion: 2 });
  assert.equal(result.expectedVersion, 2);
});

test("unrelated role cannot read reviews and hide requires a reason", async () => {
  const service = createReviewService({ repository: { list: async () => ({}), hide: async () => ({}) } });
  await assert.rejects(() => service.list(context("admin_operator_sanpham"), new URLSearchParams()), (error) => error.status === 403);
  await assert.rejects(() => service.hide(context("admin_operator_danhgia_review"), REVIEW_ID, { reason: "short", expectedVersion: 1 }), (error) => error.status === 422);
});

function context(roleCode) { return { authUser: { id: "auth-1" }, roleCode, accessToken: "jwt-token" }; }


test("review workflow persists only approved or hidden states", () => {
  const userFlow = readFileSync(new URL("../../apps/api/src/user/reviews.js", import.meta.url), "utf8");
  const adminUi = readFileSync(new URL("../../apps/admin-web/src/scripts/reviews.js", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../../database/migrations/20260721133000_review_two_state_workflow.sql", import.meta.url), "utf8");
  assert.doesNotMatch(userFlow, /status: "pending"|AUTO-MODERATION Queue/);
  assert.match(userFlow, /status: finalStatus/);
  assert.doesNotMatch(adminUi, /Chờ duyệt|Cần xử lý gấp|Đã xử lý|value="pending"/);
  assert.ok(migration.includes("status::text in ('approved', 'rejected')"));
});
