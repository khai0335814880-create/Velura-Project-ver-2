import test from "node:test";
import assert from "node:assert/strict";
import { computeServiceKpis } from "../../apps/admin-web/src/scripts/service-kpis.js";

test("service KPIs separate active returns, tickets, priority and Vietnam-day completions", () => {
  const now = new Date("2026-07-21T16:30:00.000Z"); // 23:30 in Vietnam
  const summary = computeServiceKpis({
    now,
    returns: [
      { status: "pending", created_at: "2026-07-21T10:00:00.000Z" },
      { status: "pending", created_at: "2026-07-18T10:00:00.000Z" },
      { status: "pending", created_at: "2026-07-17T10:00:00.000Z" },
      { status: "completed", resolved_at: "2026-07-21T01:00:00.000Z" },
      { status: "completed", resolved_at: "2026-07-20T01:00:00.000Z" }
    ],
    tickets: [
      { status: "open", priority: "high" },
      { status: "processing", priority: "normal" },
      { status: "closed", priority: "high", resolved_at: "2026-07-21T15:00:00.000Z" },
      { status: "resolved", priority: "high", resolved_at: "2026-07-20T16:30:00.000Z" }
    ]
  });

  assert.deepEqual(summary, {
    returnsInProgress: 3,
    ticketsInProgress: 1,
    highPriorityTickets: 0,
    completedToday: 2
  });
});
