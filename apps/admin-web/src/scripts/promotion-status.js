export function getCampaignLifecycle(row, now = new Date()) {
  const start = new Date(row?.start_date);
  const end = new Date(row?.end_date);
  const current = now instanceof Date ? now : new Date(now);
  if ([start, end, current].some((value) => Number.isNaN(value.getTime()))) {
    return { code: "invalid", label: "Sai thời gian", badge: "danger", canToggle: false, toggleTitle: "Cần chỉnh sửa thời gian chiến dịch" };
  }
  if (current < start) return { code: "scheduled", label: "Sắp diễn ra", badge: "pending", canToggle: false, toggleTitle: "Chỉ có thể kích hoạt khi chiến dịch bắt đầu" };
  if (current > end) return { code: "expired", label: "Đã kết thúc", badge: "neutral", canToggle: false, toggleTitle: "Chiến dịch đã kết thúc; hãy chỉnh sửa thời gian nếu muốn chạy lại" };
  if (row.is_active) return { code: "running", label: "Đang chạy", badge: "success", canToggle: true, toggleTitle: "Tạm dừng chiến dịch" };
  return { code: "paused", label: "Tạm dừng", badge: "warning", canToggle: true, toggleTitle: "Kích hoạt chiến dịch" };
}
