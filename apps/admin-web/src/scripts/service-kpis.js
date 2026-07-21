const RETURN_WORK_QUEUE_STATUS = "pending";
const TICKET_IN_PROGRESS_STATUS = "processing";
const TERMINAL_RETURN_STATUSES = new Set(["completed", "rejected"]);
const TERMINAL_TICKET_STATUSES = new Set(["resolved", "closed"]);

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

export function computeServiceKpis({ returns = [], tickets = [], now = new Date() } = {}) {
  const referenceTime = now instanceof Date ? now : new Date(now);
  const today = vietnamDateKey(referenceTime);
  const processingTickets = tickets.filter((row) => row?.status === TICKET_IN_PROGRESS_STATUS);

  const returnsCompletedToday = returns.filter((row) =>
    TERMINAL_RETURN_STATUSES.has(row?.status) && vietnamDateKey(row.resolved_at) === today
  ).length;
  const ticketsCompletedToday = tickets.filter((row) =>
    TERMINAL_TICKET_STATUSES.has(row?.status) && vietnamDateKey(row.resolved_at) === today
  ).length;

  return {
    returnsInProgress: returns.filter((row) => row?.status === RETURN_WORK_QUEUE_STATUS).length,
    ticketsInProgress: processingTickets.length,
    highPriorityTickets: processingTickets.filter((row) => row.priority === "high").length,
    completedToday: returnsCompletedToday + ticketsCompletedToday
  };
}
