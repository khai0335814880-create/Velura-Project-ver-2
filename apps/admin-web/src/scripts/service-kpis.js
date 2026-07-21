const ACTIVE_RETURN_STATUSES = new Set(["pending", "approved", "shipping_back", "received"]);
const ACTIVE_TICKET_STATUSES = new Set(["open", "processing"]);
const TERMINAL_RETURN_STATUSES = new Set(["completed", "rejected"]);
const TERMINAL_TICKET_STATUSES = new Set(["resolved", "closed"]);
const RETURN_PENDING_SLA_MS = 48 * 60 * 60 * 1000;

function vietnamDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isActiveReturn(row, now) {
  if (!ACTIVE_RETURN_STATUSES.has(row?.status)) return false;
  if (row.status !== "pending") return true;
  const createdAt = new Date(row.created_at);
  return !Number.isNaN(createdAt.getTime()) && now.getTime() - createdAt.getTime() <= RETURN_PENDING_SLA_MS;
}

export function computeServiceKpis({ returns = [], tickets = [], now = new Date() } = {}) {
  const referenceTime = now instanceof Date ? now : new Date(now);
  const today = vietnamDateKey(referenceTime);
  const activeTickets = tickets.filter((row) => ACTIVE_TICKET_STATUSES.has(row?.status));

  const returnsCompletedToday = returns.filter((row) =>
    TERMINAL_RETURN_STATUSES.has(row?.status) && vietnamDateKey(row.resolved_at) === today
  ).length;
  const ticketsCompletedToday = tickets.filter((row) =>
    TERMINAL_TICKET_STATUSES.has(row?.status) && vietnamDateKey(row.resolved_at) === today
  ).length;

  return {
    returnsInProgress: returns.filter((row) => isActiveReturn(row, referenceTime)).length,
    ticketsInProgress: activeTickets.length,
    highPriorityTickets: activeTickets.filter((row) => row.priority === "high").length,
    completedToday: returnsCompletedToday + ticketsCompletedToday
  };
}
