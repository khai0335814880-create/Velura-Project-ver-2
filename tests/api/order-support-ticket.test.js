import test from "node:test";
import assert from "node:assert/strict";
import { buildFailedDeliverySupportTicket } from "../../apps/api/src/user/orders.js";

const userId = "11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222222";

test("creates a linked high-priority ticket for failed delivery", () => {
  const ticket = buildFailedDeliverySupportTicket({ order_id: orderId, user_id: userId, tracking_code: "VLR-FAILED-001", status: "failed_delivery" }, { user_id: userId }, "33333333-3333-4333-8333-333333333333", "2026-07-22T14:30:00.000Z");
  assert.equal(ticket.source_order_id, orderId);
  assert.equal(ticket.priority, "high");
  assert.equal(ticket.status, "open");
  assert.match(ticket.title, /VLR-FAILED-001/);
});

test("rejects an order that is not failed delivery", () => {
  assert.throws(() => buildFailedDeliverySupportTicket({ order_id: orderId, user_id: userId, status: "shipping" }, { user_id: userId }), (error) => error.status === 422);
});

test("rejects another account", () => {
  assert.throws(() => buildFailedDeliverySupportTicket({ order_id: orderId, user_id: userId, status: "failed_delivery" }, { user_id: "44444444-4444-4444-8444-444444444444" }), (error) => error.status === 403);
});
