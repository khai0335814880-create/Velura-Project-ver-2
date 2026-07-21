# Đặc tả Định vị Chức năng & Kỹ thuật — Velura Admin Web

> Tài liệu phục vụ bảo vệ đồ án, được đối chiếu với mã nguồn hiện tại của `apps/admin-web`, `apps/api/src` và `database/migrations`. Các nhận định dưới đây mô tả **những gì code thực sự làm**, không lấy nội dung minh họa trên giao diện làm bằng chứng nghiệp vụ.

## 1. Phạm vi rà soát và cách đọc mức độ trưởng thành

### 1.1. Phạm vi

- Giao diện quản trị: HTML, CSS và JavaScript thuần, đóng gói bằng Vite trong `apps/admin-web`.
- Backend quản trị: Node.js ESM theo mô hình modular monolith, tách router — service — repository trong `apps/api/src`.
- Dữ liệu và giao dịch nghiệp vụ: PostgreSQL/Supabase, RPC, Row Level Security (RLS), audit log và email outbox trong `database/migrations`.
- Các màn hình đang hoạt động: đăng nhập/đổi mật khẩu, dashboard, tài khoản, sản phẩm/tồn kho/combo, đơn hàng/thanh toán, giá, khuyến mãi/voucher, đánh giá, đổi trả/CSKH/chat và nhật ký.
- Các trang `price-management.html`, `pricing-promotions.html`, `promotion-management.html` chỉ chuyển hướng sang màn hình mới; `register.html` thông báo đăng ký admin trực tiếp đã bị tắt.

### 1.2. Thang định vị

| Mức | Ý nghĩa |
|---|---|
| M0 — Giao diện | Chỉ có UI hoặc dữ liệu mẫu, chưa tạo thay đổi nghiệp vụ thật. |
| M1 — CRUD cơ bản | Đọc/ghi dữ liệu thật nhưng quy tắc vận hành, phân quyền hoặc kiểm soát xung đột còn mỏng. |
| M2 — Nghiệp vụ có kiểm soát | Có RBAC phía server, validation, trạng thái, optimistic locking và audit. |
| M3 — Sẵn sàng tích hợp vận hành | Có thêm side effect đáng tin cậy, tích hợp ngoài, quan sát hệ thống và khả năng mở rộng sản xuất. |

### 1.3. Kết luận tổng quan

Admin Web đạt mức **M2 — nghiệp vụ có kiểm soát** ở phần lớn module lõi. Điểm mạnh không nằm ở số lượng màn hình mà ở việc các mutation quan trọng đi qua backend/RPC, có kiểm tra vai trò, phiên bản dữ liệu và nhật ký. Hệ thống chưa nên được định vị là M3 hoàn chỉnh vì chưa tích hợp hãng vận chuyển/cổng hoàn tiền thật, ảnh sản phẩm chưa có quy trình upload riêng, nhiều bảng vẫn phân trang phía client và một số side effect phụ thuộc cấu hình SMTP/webhook.

| Module | Định vị | Điểm mạnh thật | Giới hạn chính |
|---|---|---|---|
| Auth & RBAC | M2 | Supabase Auth, guard giao diện, RBAC backend, RLS | Chưa có MFA; token ứng dụng còn lưu trong Web Storage |
| Dashboard | M2 | PostgreSQL aggregate theo kỳ, không dùng số mẫu/cache | Không realtime subscription; xuất CSV chứ không phải `.xlsx` |
| Tài khoản | M2 | Khóa/mở khóa, đổi vai trò, phê duyệt, version, audit, outbox | Chỉ super admin; chưa xóa user/MFA/session revocation toàn cục |
| Sản phẩm & tồn kho | M2 | CRUD không-xóa, biến thể, tồn kho, CSV dry-run/commit, cảnh báo | Ảnh chỉ nhận URL HTTPS; danh mục chỉ đọc; UI tải tối đa 1.000 dòng |
| Đơn hàng | M2 | State machine, hoàn tồn khi hủy, lịch sử, đối soát thủ công | Không có API hãng vận chuyển; hoàn tiền chỉ chuyển trạng thái DB |
| Giá | M2 | Lịch sử giá, validation, optimistic locking | Không có phê duyệt hai lớp/lập lịch thay đổi giá |
| Khuyến mãi/voucher/combo | M2 | Tạo/sửa/kích hoạt, ngân sách, quota, đồng bộ trạng thái voucher | Không tự kích hoạt theo giờ; chưa có engine phân bổ ngân sách nâng cao |
| Đánh giá | M2 | Duyệt/ẩn/phản hồi/escalate sang ticket | Không ML moderation; không gửi notification/email từ RPC admin |
| Đổi trả & CSKH | M1–M2 | Workflow, tạo đơn đổi, ticket, chat handoff, evidence, audit | Refund không gọi gateway; policy upload evidence còn rộng |
| Audit log | M2 | Actor/action/module/old-new/IP/time; chỉ đọc | Không SIEM, retention, export ký số hoặc log thất bại đầy đủ |

---

## 2. Kiến trúc kỹ thuật chung của Admin Web

### 2.1. Luồng dữ liệu chuẩn

```text
Admin Browser
  ├─ Supabase Auth: login, OAuth PKCE, reset/change password
  └─ Bearer access token
          ↓
Node API (/api/v1/admin/*)
  ├─ xác thực token và nạp hồ sơ users
  ├─ kiểm tra is_active + role/module/action
  ├─ validation + rate limit mutation
  └─ repository dùng caller JWT
          ↓
Supabase PostgREST / PostgreSQL RPC
  ├─ RLS và quyền execute
  ├─ transaction/state transition
  ├─ optimistic locking bằng version
  └─ audit_log / email_outbox / history
```

Frontend không nắm service-role key và không trực tiếp update bảng nghiệp vụ. Ngoại lệ hợp lệ là luồng xác thực dùng Supabase Auth; dữ liệu quản trị được gọi qua API Node. Cấu trúc này tạo hai lớp bảo vệ: route/service phía API và policy/RPC phía database.

### 2.2. Cơ chế chống ghi đè

Các entity quan trọng có cột `version`. Giao diện gửi `expectedVersion`; RPC chỉ update khi phiên bản trong DB còn khớp. Nếu admin khác đã thay đổi bản ghi trước, hệ thống trả `409 VERSION_CONFLICT` thay vì âm thầm ghi đè. Cơ chế này có ở tài khoản, sản phẩm/biến thể, đơn/thanh toán, đánh giá, đổi trả, ticket, giá, promotion và voucher.

### 2.3. Audit và side effect

`audit_log` lưu người thao tác, vai trò, hành động, module, đối tượng, giá trị trước/sau, địa chỉ IP và thời điểm. Một số nghiệp vụ còn tạo lịch sử chuyên biệt như `order_status_history` và `price_history`.

Email không được gửi trực tiếp bên trong transaction. RPC ghi `email_outbox`; worker nền claim theo lô rồi gửi bằng Nodemailer/SMTP hoặc webhook. Nếu không cấu hình service-role, interval hoặc nhà cung cấp email, thư vẫn có thể được tạo trong outbox nhưng worker không phát đi.

### 2.4. Hiệu năng hiện tại

API đã hỗ trợ `limit/offset`, lọc và sắp xếp. Tuy nhiên nhiều trang tải trước 100–1.000 dòng, sau đó tìm kiếm/lọc/chia trang 10 dòng ở browser. Đây là cách triển khai đơn giản, phản hồi tốt với bộ dữ liệu đồ án, nhưng không phải server-side pagination/caching hoàn chỉnh cho hàng trăm nghìn bản ghi.

---

## 3. Bảo mật, Đăng nhập & Phân quyền (Auth & RBAC)

### 3.1. Định vị Chức năng & Phạm vi

**Admin có thể:**

- Đăng nhập bằng email/mật khẩu của Supabase Auth.
- Đi qua OAuth callback theo PKCE; client Supabase dùng chung storage key để giữ code verifier qua redirect.
- Yêu cầu email đặt lại mật khẩu và đổi mật khẩu bằng Supabase Auth.
- Đăng xuất; token ứng dụng và session cục bộ được xóa.
- Chỉ nhìn thấy menu và trang phù hợp với vai trò: super admin, admin chỉ xem, operator sản phẩm, đơn hàng, giá/khuyến mãi, đánh giá, hoặc CSKH/đổi trả.
- Không tự đăng ký admin từ giao diện production; quyền admin được super admin cấp trong module tài khoản.

**Giá trị vận hành:** giảm quyền thừa, giới hạn phạm vi sai sót của từng nhân sự và không biến việc ẩn/hiện menu thành lớp bảo mật duy nhất.

### 3.2. Giới hạn Chức năng

- Chưa có MFA/TOTP/WebAuthn, bắt buộc đổi mật khẩu định kỳ, IP allowlist hoặc quản lý thiết bị tin cậy.
- Access token phụ của ứng dụng được giữ trong `sessionStorage`; Supabase client vẫn persist session trong `localStorage`. XSS vì vậy vẫn là rủi ro cần kiểm soát bằng CSP và vệ sinh đầu ra.
- Frontend route guard chỉ mang tính UX; nếu tắt JavaScript hoặc gọi API trực tiếp thì backend/RLS mới là lớp quyết định.
- Không có màn hình liệt kê/thu hồi từng phiên đăng nhập trên thiết bị khác.
- Mã có nhánh tương thích custom JWT bên cạnh Supabase token. Khi triển khai production nên thống nhất một nguồn danh tính và quản trị chặt `JWT_SECRET` để giảm bề mặt xác thực.
- Supabase JS được nạp từ CDN ở trang auth; cần CSP/SRI hoặc tự host nếu yêu cầu chuỗi cung ứng nghiêm ngặt.

### 3.3. Định vị Kỹ thuật

- `supabase-client.js` tạo Supabase client với `flowType: "pkce"`, auto refresh và storage key theo project ref.
- Sau khi đăng nhập, `establishAuthoritativeSession()` gửi access token tới `GET /api/auth/me`. Session giao diện được dựng từ hồ sơ/role do backend trả về, không tin role do client tự gán.
- `checkAuth()` xác minh lại context khi vào trang, redirect nếu trang không thuộc `allowedPages` và ẩn menu không phù hợp.
- `buildAuthContext()` phía API xác minh Supabase user, đọc hồ sơ `users`, xác định `roleCode`, `isAdmin`, `is_active`.
- `requireAdmin()` chặn user thường và admin bị khóa. `requirePermission(module, action)` kiểm tra ma trận module/action; các service chuyên biệt kiểm tra thêm danh sách reader/operator.
- RLS và quyền RPC là hàng rào database; mutation trực tiếp trên các bảng chính bị revoke, caller JWT được chuyển qua repository.
- Mutation admin có fixed-window rate limit theo user ID hoặc IP và trả `429` khi vượt ngưỡng.

**Phát biểu an toàn khi bảo vệ:** “Frontend có route guard để điều hướng, nhưng quyền thực thi được kiểm tra lại tại API và database; ẩn menu không được xem là bảo mật.”

---

## 4. Dashboard & Thống kê vận hành

### 4.1. Định vị Chức năng & Phạm vi

**Admin có thể:**

- Chọn hôm nay, tuần, tháng hoặc khoảng ngày tùy chỉnh.
- Xem hàng đợi vận hành: đơn pending/lỗi thanh toán, đổi trả mở, ticket CSKH, sản phẩm tồn thấp, review chờ duyệt/tiêu cực.
- Xem doanh thu, số đơn, AOV, tỷ lệ hoàn tất, doanh thu khuyến mãi và so sánh với kỳ trước.
- Xem doanh thu theo ngày, đóng góp theo danh mục, sản phẩm bán chạy, chiến dịch/voucher nổi bật và audit gần nhất.
- Làm mới thủ công và đi từ cảnh báo sang module xử lý.
- Xuất báo cáo điều hành, kinh doanh hoặc tổng hợp.

**Giá trị vận hành:** tập trung ngoại lệ cần xử lý và KPI thương mại trong cùng một màn hình, giúp admin ưu tiên công việc thay vì kiểm tra từng bảng.

### 4.2. Giới hạn Chức năng

- Không dùng Supabase Realtime subscription; số liệu là snapshot tại thời điểm gọi API, chỉ đổi khi tải trang, đổi kỳ hoặc bấm làm mới.
- Không có cache/warehouse/OLAP; truy vấn aggregate trực tiếp phù hợp dữ liệu đồ án nhưng cần materialized view/cache khi dữ liệu lớn.
- “Xuất Excel” hiện tạo file CSV UTF-8 bằng `Blob`, không tạo workbook `.xlsx`, không có biểu đồ/pivot hay chữ ký báo cáo.
- Biểu đồ là các thanh HTML/CSS tự dựng, không dùng Chart.js/D3; chưa có drill-down truy vấn chi tiết từ từng điểm dữ liệu.
- Hàng đợi trên dashboard là tổng hợp số lượng và link module, chưa phải hệ thống giao việc/SLA/escalation tự động.
- Không có dự báo doanh thu hay anomaly detection bằng AI.

### 4.3. Định vị Kỹ thuật

- Frontend gọi `GET /api/admin/dashboard?range=...` hoặc `?from=...&to=...` với Bearer token.
- Backend giới hạn khoảng tùy chỉnh, chuẩn hóa mốc ngày theo `Asia/Ho_Chi_Minh`, rồi gọi RPC `get_admin_dashboard_summary(p_from, p_to)`.
- RPC dùng CTE và SQL aggregate trực tiếp trên `orders`, `order_item`, `variant`, `review`, `return_exchange`, `support_ticket`, `promotion`, `voucher`, `audit_log`.
- Doanh thu/AOV bỏ đơn `cancelled` và `returned`; số liệu kỳ trước được tính trong cùng RPC. Best seller dùng snapshot order item kết hợp tồn hiện tại.
- RPC chỉ grant execute cho `service_role`; endpoint yêu cầu admin và permission `dashboard:read`.
- Kết quả có `generatedAt` và phần `meta.definitions` để UI giải thích công thức.

---

## 5. Quản lý Tài khoản & Phân quyền (Account Management)

### 5.1. Định vị Chức năng & Phạm vi

**Super admin có thể:**

- Xem danh sách member/admin, trạng thái hoạt động, vai trò, thông tin liên hệ và lần đăng nhập gần nhất.
- Tìm theo tên/email/số điện thoại; lọc nhóm tài khoản và trạng thái.
- Khóa tạm thời có ngày hết hạn hoặc khóa vĩnh viễn; mở khóa với lý do.
- Chuyển member thành admin, đổi role admin hoặc hạ quyền về member.
- Duyệt/từ chối yêu cầu nâng quyền và xem hạn hiệu lực của yêu cầu.
- Xem audit theo tài khoản và toàn module.

**Giá trị vận hành:** hỗ trợ onboarding/offboarding nhân sự, xử lý tài khoản có rủi ro và tách trách nhiệm theo nghiệp vụ.

### 5.2. Giới hạn Chức năng

- Chỉ `super_admin` truy cập module; chưa có quyền account-reader riêng hoặc phê duyệt hai người cho việc cấp super admin.
- Không có tạo/xóa tài khoản Auth trực tiếp, import user hàng loạt, merge tài khoản hoặc anonymize dữ liệu theo yêu cầu pháp lý.
- Khóa hồ sơ làm backend từ chối admin/user theo `is_active`, nhưng code không thể hiện màn hình thu hồi mọi refresh token/phiên Supabase ngay lập tức trên tất cả thiết bị.
- Không có chính sách tự khóa theo số lần đăng nhập sai trong module này.
- UI chỉ tải tối đa 100 tài khoản/yêu cầu/log rồi phân trang client; dữ liệu vượt giới hạn không hiện dù API có `offset`.

### 5.3. Định vị Kỹ thuật

- API: `/api/v1/admin/accounts`, `/account-role-requests`, `/account-audit-logs`, cùng action `lock`, `unlock`, `role`, `approve/reject`.
- Search dùng PostgREST `ILIKE` trên `full_name`, `email`, `phone`; API có `limit/offset/order`.
- Validation yêu cầu UUID, version dương; lý do khóa/mở khóa phải trên 10 từ, tối đa 1.000 ký tự. Khóa tạm yêu cầu thời điểm tương lai; khóa vĩnh viễn không được có expiry.
- RPC `admin_lock_user`, `admin_unlock_user`, `admin_change_user_role`, `admin_review_role_request` khóa bản ghi, so version, cập nhật dữ liệu và ghi audit trong luồng DB.
- `account-maintenance` định kỳ gọi `velura_expire_admin_requests` để hết hạn yêu cầu chờ duyệt.
- Các action tài khoản enqueue email; worker gửi qua SMTP/Nodemailer hoặc webhook nếu được cấu hình. Do đó nên nói “hệ thống có cơ chế email outbox”, không khẳng định “email luôn được gửi” nếu môi trường demo chưa cấu hình provider.

---

## 6. Quản lý Sản phẩm, Biến thể, Tồn kho & Combo

### 6.1. Định vị Chức năng & Phạm vi

**Admin sản phẩm có thể:**

- Xem/tìm/lọc sản phẩm theo tên, SKU, danh mục, trạng thái và mức tồn.
- Tạo sản phẩm với SKU, danh mục, giá, mô tả, brand/collection, tag phong cách, tone màu, occasion, body shape, SEO, ảnh URL và trạng thái ban đầu.
- Sửa metadata sản phẩm; đổi trạng thái theo luồng `on_sale`, `hidden`, `out_of_stock`, `discontinued`.
- Tạo biến thể màu/size; điều chỉnh tăng/giảm tồn, reserved quantity và ngưỡng tồn thấp.
- Xem danh sách tồn thấp; trạng thái tự đổi sang `out_of_stock` khi tổng tồn về 0 và quay lại `on_sale` khi có hàng.
- Import CSV theo hai bước kiểm tra trước và commit, tối đa 500 dòng; export danh sách CSV.
- Tạo sản phẩm combo và thêm/sửa/xóa các dòng thành phần combo.
- Xem audit sản phẩm.

**Giá trị vận hành:** tạo một nguồn catalog thống nhất, hạn chế overselling, hỗ trợ nhập lô và giữ lịch sử thay đổi thay vì sửa bảng thủ công.

### 6.2. Giới hạn Chức năng

- **Không có xóa vật lý sản phẩm.** API không expose `DELETE /products/:id`; trạng thái `hidden/discontinued` là cơ chế ngừng bán.
- Không có UI CRUD danh mục; màn hình chỉ đọc danh sách category đã tồn tại.
- Ảnh sản phẩm không upload lên Supabase Storage từ module catalog. Form chỉ nhận URL tuyệt đối HTTPS và lưu `text[]`; chưa resize, nén, tạo thumbnail, CDN transform hoặc xóa object cũ.
- Chưa có quản lý nhiều kho/vị trí/bin, lô hàng, serial, nhà cung cấp, nhập kho/kiểm kê hoặc cost of goods.
- Điều chỉnh tồn là số delta theo biến thể, chưa có phiếu nhập/xuất và quy trình duyệt.
- CSV commit xử lý từng dòng; có báo lỗi theo dòng nhưng chưa thể hiện rollback toàn bộ lô như một transaction duy nhất.
- UI tải tối đa 1.000 sản phẩm rồi lọc/phân trang phía client.
- Cảnh báo tồn thấp chỉ được enqueue email khi logic update phát hiện vượt ngưỡng và môi trường có người nhận/provider; chưa có notification center hay chống gửi lặp theo cooldown rõ ràng.

### 6.3. Định vị Kỹ thuật

- API versioned cung cấp list/detail/categories/variants/low-stock/audit, create/patch, change-status, update-stock, bulk-stock, import dry-run/commit và combo-items.
- Search dùng `ILIKE` trên `name` và `sku`; filter category/status/stock được đẩy một phần xuống PostgREST, còn UI có lớp lọc client.
- Service kiểm tra SKU bằng pattern, UUID category, giá không âm, sale price hợp lệ, enum trạng thái và URL ảnh HTTPS. Product update không được đổi status; phải dùng endpoint chuyên biệt.
- RPC product/stock thực thi rule, optimistic lock và audit; mutation trực tiếp bảng product/variant/category bị revoke cho client.
- Mỗi `order_item` lưu `product_name`, `unit_price`, quantity/subtotal và variant ID tại thời điểm mua. Vì vậy tên/giá của đơn cũ không bị đổi theo catalog hiện tại.
- Quan hệ return item tới order item dùng `ON DELETE RESTRICT`; không cho xóa sản phẩm vật lý qua luồng admin là lựa chọn phù hợp để bảo toàn tham chiếu.
- Combo item có API `DELETE` riêng; đó là xóa quan hệ thành phần combo, không phải xóa sản phẩm catalog.

**Câu trả lời hội đồng — “Xóa sản phẩm có làm hỏng đơn cũ không?”**

> “Trong code hiện tại admin không xóa vật lý sản phẩm; em chuyển sản phẩm sang `hidden` hoặc `discontinued`. Dòng đơn hàng đã lưu snapshot tên và đơn giá tại thời điểm mua, nên hóa đơn cũ vẫn đọc được dù catalog sau đó thay đổi. Đây là soft deactivation, không phải hard delete.”

---

## 7. Quản lý Đơn hàng & Đối soát Thanh toán

### 7.1. Định vị Chức năng & Phạm vi

**Admin đơn hàng có thể:**

- Xem/tìm đơn theo người nhận, điện thoại hoặc tracking code; lọc trạng thái, phương thức thanh toán, ngày và sắp xếp.
- Xem chi tiết địa chỉ, tiền hàng, giảm giá, tổng tiền, item snapshot, payment và lịch sử trạng thái.
- Chuyển trạng thái theo state machine: `pending → confirmed → preparing → shipping → delivered → completed`; xử lý `failed_delivery → shipping/cancelled`.
- Hủy ở các trạng thái được phép với lý do.
- Khi chuyển `shipping`, nhập tracking code bắt buộc.
- Xử lý payment bị `failed/discrepancy`: đánh dấu paid hoặc failed với lý do.
- Xem audit, lọc nhóm cần chú ý và export danh sách CSV.

**Giá trị vận hành:** ngăn nhảy trạng thái tùy tiện, giữ trace xử lý và gom các ngoại lệ giao hàng/thanh toán cho operator.

### 7.2. Giới hạn Chức năng

- Không tích hợp API GHTK, Viettel Post, GHN…; tracking code chỉ là dữ liệu text. Giao diện hiện còn điền mặc định mã đơn làm tracking code, nên không được mô tả là “tạo vận đơn thật”.
- Không có webhook tự đồng bộ trạng thái từ hãng vận chuyển trong module admin.
- Xử lý payment discrepancy là quyết định thủ công trong DB, không gọi cổng thanh toán để capture/void/refund.
- Khi hủy đơn đã trả tiền, payment chuyển `refund_pending`; chưa có bằng chứng admin workflow này phát lệnh hoàn tiền thật cho provider.
- Không chỉnh sửa item, địa chỉ, phí ship hay voucher của đơn đã tạo; không split/merge shipment.
- UI tải tối đa 1.000 đơn rồi phân trang client; audit tab gọi log cho nhiều đơn riêng lẻ, có thể tốn request khi dữ liệu lớn.

### 7.3. Định vị Kỹ thuật

- API `/api/v1/admin/orders` hỗ trợ `q/status/from/to/paymentMethod/limit/offset/order`.
- Search là PostgREST `ILIKE` trên `shipping_name`, `shipping_phone`, `tracking_code`.
- Service kiểm tra role reader/operator, UUID, transition, tracking code và lý do 10–500 ký tự.
- RPC `admin_change_order_status` khóa đơn, so version, cập nhật trạng thái/tracking, ghi `order_status_history`, audit và enqueue email thay đổi trạng thái.
- RPC `admin_cancel_order` chỉ cho hủy `pending/confirmed/preparing/failed_delivery`, hoàn `stock_quantity`, giảm `reserved_quantity`, chuyển payment paid sang `refund_pending`, ghi history/audit và enqueue email hủy.
- RPC `admin_resolve_payment` chỉ xử lý payment failed/discrepancy, kiểm tra cả order version và payment version.
- Email chỉ được phát nếu customer có email và outbox worker/provider đang hoạt động.

---

## 8. Quản lý Giá (Pricing)

### 8.1. Định vị Chức năng & Phạm vi

**Admin giá có thể:**

- Xem giá gốc, giá bán, phần trăm giảm, trạng thái sản phẩm và số biến thể.
- Tìm theo SKU/tên; lọc danh mục, đang giảm, giá bất hợp lệ hoặc thiếu giá bán.
- Đổi đồng thời base price và sale price, bắt buộc ghi lý do.
- Xem lịch sử thay đổi giá và audit.

**Giá trị vận hành:** tách thao tác giá khỏi chỉnh catalog chung, có lý do và lịch sử để truy vết sai lệch.

### 8.2. Giới hạn Chức năng

- Không có effective date/lập lịch thay đổi giá trong tương lai.
- Không có phê duyệt bốn mắt, price floor theo chi phí, biên lợi nhuận tối thiểu, bảng giá theo kênh/khu vực/nhóm khách.
- Không có rollback một nút; muốn quay lại phải tạo thay đổi giá mới.
- UI chỉ tải 100 sản phẩm và 100 bản ghi lịch sử, sau đó chia trang client.

### 8.3. Định vị Kỹ thuật

- `POST /api/v1/admin/products/:id/change-price` nhận `newBasePrice`, `newSalePrice`, `reason`, `expectedVersion`.
- Service từ chối giá âm, sale price cao hơn base price và lý do ngoài 10–500 ký tự.
- RPC `admin_change_product_price` cập nhật sản phẩm bằng optimistic lock, thêm `price_history` và `audit_log`.
- Reader/operator chỉ gồm super admin và operator giá/khuyến mãi; quyền này được kiểm tra tại service và RLS/RPC.

---

## 9. Khuyến mãi, Voucher & Combo

### 9.1. Định vị Chức năng & Phạm vi

**Admin giá/khuyến mãi có thể:**

- Tạo campaign theo loại flash sale, combo/product/bulk discount hoặc seasonal sale; đặt thời gian, ngân sách và giới hạn voucher.
- Sửa tên/mô tả/ngân sách; kích hoạt hoặc tạm dừng campaign.
- Tạo voucher fixed amount, percentage hoặc free shipping; cấu hình code, giá trị, trần giảm, đơn tối thiểu, quota tổng/mỗi user, danh mục/nhóm khách và kỳ hiệu lực.
- Bật/tắt voucher; không thể bật voucher thuộc campaign đang pause.
- Khi pause campaign, các voucher liên kết bị deactive; khi activate, chúng được activate lại theo migration hiện tại.
- Xem thống kê tổng campaign, ngân sách, lượng discount đã phát hành, voucher active/expired/used.
- Quản lý combo như một product `is_combo` và các item thành phần; bật/tắt trạng thái bán combo.
- Export snapshot promotion/voucher/combo/statistics thành JSON.

**Giá trị vận hành:** gom rule ưu đãi, quota và ngân sách, giảm nguy cơ voucher tiếp tục chạy khi campaign đã dừng.

### 9.2. Giới hạn Chức năng

- Tạo campaign mặc định ở trạng thái inactive và cần thao tác activate; không có scheduler/cron tự bật đúng `start_date` hay tự pause ở `end_date` trong Admin API.
- Cờ `is_active` và khoảng thời gian cùng tồn tại; tầng checkout phải kiểm tra cả hai. Không nên khẳng định chỉ đặt ngày là chiến dịch tự chạy.
- Validation tạo promotion ở service mới kiểm tra có start/end và type; chưa thấy kiểm tra mạnh `start < end`, budget không âm hoặc overlap campaign tại lớp này.
- Không có delete campaign/voucher; dùng pause/toggle.
- Không có A/B testing, coupon segmentation động, fraud detection hoặc phê duyệt ngân sách.
- Statistics được tính từ tối đa 500 promotion và 500 voucher ở repository, không phải kho phân tích toàn lịch sử.
- Kích hoạt lại campaign hiện bật lại toàn bộ voucher liên kết; chưa lưu ý định “voucher nào đã bị tắt riêng trước đó”.
- Ảnh combo cũng chỉ là URL HTTPS, không upload file.

### 9.3. Định vị Kỹ thuật

- API `/promotions` và `/vouchers` có list/detail/create/patch/activate/pause/toggle; `expectedVersion` dùng cho mutation cập nhật.
- RPC promotion/voucher ghi audit; voucher code được kiểm tra trùng ở DB.
- Migration `015_deactivate_vouchers_on_promo_pause.sql` tạo side effect đồng bộ `voucher.is_active` khi campaign đổi trạng thái.
- Statistics hiện aggregate bằng JavaScript trên các rows đã tải từ Supabase; dashboard lại dùng SQL aggregate riêng.
- Combo tái sử dụng product/variant/combo_item thay vì tạo một hệ thống bundle tách biệt.

---

## 10. Quản lý Đánh giá (Review Moderation)

### 10.1. Định vị Chức năng & Phạm vi

**Admin review có thể:**

- Xem/tìm/lọc review theo trạng thái, sản phẩm/nội dung, rating và cờ khẩn.
- Xem nội dung, ảnh, sản phẩm, đơn hàng, người dùng và phản hồi hiện có.
- Duyệt review để hiển thị; ẩn review với lý do; có thể đổi lại từ rejected sang approved theo endpoint phù hợp.
- Gửi phản hồi thương hiệu.
- Escalate review nghiêm trọng thành support ticket ưu tiên cao; review đồng thời bị ẩn và gắn cờ khẩn.
- Xem audit và export CSV.

**Giá trị vận hành:** bảo vệ chất lượng nội dung công khai, biến phản ánh tiêu cực thành case CSKH có thể theo dõi thay vì bỏ sót.

### 10.2. Giới hạn Chức năng

- Không xóa vật lý review; trạng thái `rejected` là ẩn.
- Không có AI toxicity/spam/image moderation, blacklist, duplicate detection hay batch moderation.
- Không thấy RPC admin moderation tạo notification/email cho người viết review. Các notification ở user route là luồng khác, vì vậy không nên khẳng định mọi thao tác admin tự báo khách.
- Không có SLA/escalation nhiều cấp ngoài việc tạo support ticket.
- UI tải tối đa 100 review và 100 audit log rồi phân trang client.

### 10.3. Định vị Kỹ thuật

- Search dùng PostgREST `ILIKE` trên `comment` và tên product join; filter status/rating/date được service/repository chuẩn hóa.
- Các RPC `admin_approve_review`, `admin_hide_review`, `admin_reply_review`, `admin_escalate_review` kiểm tra version và ghi audit.
- Escalate tạo record `support_ticket` priority high, cập nhật review `rejected`, `is_flagged_urgent` và trả `ticket_id`.
- RLS cho operator review đọc product kể cả khi product đã hidden, giúp moderation review cũ không mất ngữ cảnh.

---

## 11. Đổi trả, Hoàn tiền, Ticket CSKH & Chat Handoff

### 11.1. Định vị Chức năng & Phạm vi

#### A. Đổi trả

- Xem/lọc yêu cầu theo loại refund/exchange, trạng thái, nội dung và bằng chứng.
- Duyệt hoàn tiền với số tiền; duyệt đổi hàng; từ chối có lý do/bằng chứng.
- Theo workflow `pending → approved → shipping_back → received → completed`; hoặc `pending/received → rejected` theo rule.
- Lưu tracking hàng hoàn, kết quả kiểm tra, ghi chú, thời điểm giải quyết và audit.
- Khi duyệt đổi, tạo một order thay thế, copy địa chỉ/phương thức thanh toán và snapshot item từ đơn gốc.

#### B. Ticket CSKH

- Xem/lọc ticket, độ ưu tiên, thông tin guest/member và CSAT nếu có.
- Assign người xử lý, phản hồi, đóng ticket; lưu admin reply và audit.

#### C. Chat handoff

- Xem phiên chatbot theo trạng thái AI/requested/assigned/closed.
- Xem toàn bộ message text, attachment và product card liên quan.
- CSKH tiếp nhận phiên, gửi tin nhắn human agent và đóng phiên.
- Khi chatbot yêu cầu handoff, hệ thống có thể tạo support ticket và enqueue email cảnh báo tới địa chỉ hỗ trợ đã cấu hình.

**Giá trị vận hành:** nối luồng sau bán, phản hồi và chatbot về một khu vực xử lý; case AI không giải quyết được có đường chuyển sang người thật.

### 11.2. Giới hạn Chức năng

- “Duyệt hoàn tiền” chỉ ghi `refund_amount/status` cho return; không gọi cổng VNPay/MoMo/Stripe và không chứng minh tiền đã về tài khoản khách.
- Đơn đổi được tạo trong DB nhưng chưa tạo vận đơn chiều đi/chiều về với hãng vận chuyển.
- Chưa có rule tự động kiểm tra số tiền refund không vượt phần hàng đủ điều kiện/tổng đơn ở service; hiện chỉ yêu cầu số dương.
- Không thấy email/notification cho từng transition đổi trả/ticket trong repository admin hiện tại.
- Upload bằng chứng dùng bucket public `return-evidence`, giới hạn 5 MB và MIME ảnh, nhưng migration cho phép public upload/read. Đây là boundary bảo mật cần siết sang authenticated/owner hoặc signed URL trước production.
- Không có antivirus/content moderation cho ảnh, lifecycle xóa object hoặc xóa orphan file.
- Ticket chỉ giữ một trường `admin_reply`, chưa phải conversation thread nhiều lượt đầy đủ như helpdesk chuyên nghiệp.
- Chat không dùng realtime subscription ở màn hình admin; messages được tải lại theo thao tác, chưa có presence/typing/read receipt/routing theo hàng đợi.
- UI tải 1.000 returns/tickets/logs/chat sessions; không server-side pagination ở màn hình.

### 11.3. Định vị Kỹ thuật

- Return API có list/detail/approve-refund/approve-exchange/reject/update-status; support API có list/detail/assign/respond/close.
- Return service kiểm tra role CSKH, status enum và version. Repository hiện thực một số action bằng PostgREST update + audit, một số qua RPC.
- `approveExchange` đọc order gốc và return items, tạo order mới tổng 0, copy `product_name`, `variant_id`, `unit_price`, quantity và gắn `exchange_order_id`.
- Evidence upload đi qua `/api/user/upload/evidence`, sau đó lưu public URL vào `evidence_images text[]`.
- Chat admin route nằm trong module chatbot; chỉ `super_admin` và `admin_operator_cskh_dt` được xem/tiếp nhận handoff. Agent reply được lưu thành `chat_message` có sender type tương ứng.
- Handoff có thể enqueue `chatbot_handoff_alert` vào email outbox nếu `SUPPORT_ALERT_TO` được cấu hình.

---

## 12. Nhật ký Hệ thống (Audit Log Viewer)

### 12.1. Định vị Chức năng & Phạm vi

**Admin có thể:**

- Xem actor, vai trò, action, module, target, giá trị trước/sau, IP và timestamp.
- Tìm/lọc theo module, kết quả và nội dung hiển thị; xem chi tiết thay đổi.
- Đối chiếu actor ID với danh sách tài khoản để hiển thị tên.
- Làm mới và xem các KPI số thao tác/thất bại/module.

**Giá trị vận hành:** phục vụ truy vết “ai làm gì, với bản ghi nào, trước và sau ra sao”, hỗ trợ điều tra sai lệch và bảo vệ trách nhiệm thao tác.

### 12.2. Giới hạn Chức năng

- Màn hình chỉ đọc; không có retention policy, archive lạnh, legal hold hay ký hash chống sửa log.
- Chưa tích hợp SIEM/alerting; không cảnh báo tự động khi có pattern bất thường.
- Audit chủ yếu ghi mutation thành công trong RPC/repository. Request bị validation/RBAC từ chối không nhất thiết tạo audit row, nên bộ lọc “failure” không phải nhật ký bảo mật toàn diện.
- UI tải tối đa 1.000 log và tài khoản rồi lọc/phân trang client.
- Không có export chuyên dụng ở màn hình log hiện tại.

### 12.3. Định vị Kỹ thuật

- `GET /api/v1/admin/audit-logs` chỉ cho active admin, validate module pattern, hỗ trợ `limit/offset`.
- Repository select danh sách cột an toàn từ `audit_log` và dùng caller access token/RLS.
- Các module còn có endpoint audit hẹp theo target/module; dashboard lấy 8 log gần nhất trong RPC summary.

---

## 13. Những điểm không nên tuyên bố quá mức

| Không nên nói | Nên nói chính xác |
|---|---|
| “Admin kết nối thẳng Supabase để CRUD.” | “Admin gọi Node API; API kiểm tra quyền rồi dùng PostgREST/RPC dưới RLS.” |
| “Ẩn menu nên user thường không vào được admin.” | “Menu/route guard là UX; backend và RLS mới cưỡng chế quyền.” |
| “Dashboard realtime.” | “Dashboard query dữ liệu hiện tại mỗi lần tải/làm mới; chưa subscribe realtime.” |
| “Xuất Excel.” | “Xuất CSV mở được bằng Excel.” |
| “Upload ảnh sản phẩm lên Storage.” | “Catalog hiện lưu URL ảnh HTTPS; chỉ evidence đổi trả có luồng upload Storage.” |
| “Xóa sản phẩm.” | “Ngừng bán bằng `hidden/discontinued`; không hard delete product.” |
| “Tạo vận đơn.” | “Lưu tracking code; chưa kết nối API hãng vận chuyển.” |
| “Hoàn tiền tự động.” | “Ghi nhận refund/refund_pending trong DB; chưa gọi payment gateway.” |
| “Email luôn gửi.” | “RPC enqueue email; worker chỉ gửi khi SMTP/webhook được cấu hình.” |
| “Phân trang server.” | “API có limit/offset, nhưng UI hiện chủ yếu tải trước rồi phân trang client.” |
| “Khuyến mãi tự chạy đúng giờ.” | “Có start/end và trạng thái active; thao tác activate/pause hiện là chủ động.” |
| “Audit ghi mọi sự kiện bảo mật.” | “Audit bao phủ mutation nghiệp vụ chính; request bị từ chối chưa chắc được ghi.” |

---

## 14. Bộ câu hỏi hội đồng và câu trả lời ngắn

### 14.1. Nếu admin sửa cùng một sản phẩm thì sao?

> “Mỗi bản ghi có version. Client gửi expectedVersion; nếu người khác đã sửa trước, RPC trả 409 conflict thay vì ghi đè. Admin phải tải lại dữ liệu mới.”

### 14.2. User thường gọi thẳng API admin được không?

> “Không. API xác minh token, kiểm tra profile là admin đang active và kiểm tra module/action theo role. Database còn có RLS và giới hạn RPC, nên bỏ qua giao diện vẫn không có quyền.”

### 14.3. Hủy đơn có hoàn tồn không?

> “Có. RPC hủy duyệt từng order item, tăng stock quantity và giảm reserved quantity. Nếu payment đã paid thì đánh dấu refund_pending; phần chuyển tiền thật qua gateway chưa nằm trong phạm vi.”

### 14.4. Dashboard tính doanh thu thế nào?

> “Backend gọi một RPC PostgreSQL theo khoảng ngày, múi giờ Việt Nam. Doanh thu và AOV loại đơn cancelled/returned, đồng thời tính kỳ trước để so sánh. Đây là snapshot khi tải, không phải realtime stream.”

### 14.5. Vì sao không xóa sản phẩm?

> “Để bảo toàn lịch sử và tham chiếu, admin chỉ ẩn hoặc ngừng kinh doanh. Order item còn lưu snapshot tên và đơn giá, nên hóa đơn cũ không bị thay đổi theo catalog.”

### 14.6. Email có bảo đảm gửi ngay không?

> “Transaction chỉ ghi email vào outbox để không làm hỏng nghiệp vụ khi mail server lỗi. Worker nền gửi lại qua SMTP/webhook. Nếu môi trường chưa cấu hình provider thì outbox có thể tồn tại nhưng thư chưa được phát.”

### 14.7. Hệ thống hoàn tiền thật chưa?

> “Chưa. Admin duyệt và ghi nhận số tiền/trạng thái hoàn trong DB; tích hợp refund API, webhook đối soát và idempotency với cổng thanh toán là bước production tiếp theo.”

### 14.8. Điểm yếu bảo mật cần ưu tiên sửa?

> “Ưu tiên MFA cho admin, siết policy bucket evidence khỏi public upload, bổ sung CSP/giảm phụ thuộc CDN, thu hồi phiên khi khóa tài khoản và ghi audit cho request bị từ chối.”

---

## 15. Lộ trình nâng cấp hợp lý sau đồ án

### P0 — Trước khi demo/triển khai thật

1. Siết `return-evidence` thành authenticated upload theo owner/role; dùng signed URL và validate MIME bằng nội dung file.
2. Xác nhận SMTP/webhook hoạt động và hiển thị trạng thái outbox thất bại cho super admin.
3. Bỏ tracking code mặc định bằng order ID; bắt admin nhập mã vận đơn thật.
4. Chuẩn hóa encoding tiếng Việt ở các file đang hiển thị mojibake.
5. Thêm integration test cho soft-deactivation product và khả năng đọc đơn cũ.

### P1 — Khả năng vận hành

1. Chuyển bảng lớn sang server-side pagination/filter/sort; trả count hoặc cursor.
2. Tích hợp hãng vận chuyển và payment refund webhook có idempotency.
3. Thêm notification cho review/return/ticket transitions và timeline hội thoại CSKH nhiều lượt.
4. Thêm upload/resize/cleanup ảnh sản phẩm qua Storage.
5. Thêm scheduler promotion, nhưng checkout vẫn phải kiểm tra `is_active + start/end + quota + budget` atomically.

### P2 — Quản trị nâng cao

1. MFA/WebAuthn, session management, IP/device policy và two-person approval cho cấp quyền/giá lớn.
2. SIEM/alerting, immutable audit archive và retention policy.
3. Warehouse/materialized views cho dashboard; export `.xlsx`/PDF đúng nghĩa.
4. Multi-warehouse inventory, purchase order, stock ledger và cost/margin guard.

---

## 16. Bằng chứng mã nguồn trọng yếu

- Auth/route guard: `apps/admin-web/src/scripts/supabase-auth.js`, `supabase-client.js`, `auth.js`.
- Ma trận quyền backend: `apps/api/src/rbac.js` và service constants của từng module.
- Dashboard: `apps/admin-web/src/scripts/dashboard.js`, `apps/api/src/dashboard.js`, `database/migrations/018_admin_dashboard_summary.sql`.
- Account/RBAC: `apps/api/src/accounts/*`, `database/migrations/001_uc_a01_account_rbac.sql`.
- Product/inventory: `apps/api/src/products/*`, `database/migrations/002_uc_a02_products_inventory.sql`.
- Order workflow: `apps/api/src/orders/*`, `database/migrations/003_uc_a03_order_operations.sql`.
- Review/return/support/pricing RPC: `database/migrations/005_uc_a04_a05_a06_rpcs.sql`.
- Promotion-voucher trigger: `database/migrations/015_deactivate_vouchers_on_promo_pause.sql`.
- Evidence Storage: `database/migrations/016_fix_evidence_images_type.sql`, `017_create_return_evidence_bucket.sql`.
- Chat handoff: `apps/api/src/chatbot/*`, `database/migrations/012_chat_tables.sql`, `013_uc_chatbot_blog_n8n_production.sql`.
- Email outbox worker: `apps/api/src/email/outbox-worker.js`.
- Audit viewer: `apps/admin-web/src/scripts/logs.js`, `apps/api/src/audit-logs/*`.

## 17. Kết luận định vị

Velura Admin Web không chỉ là bộ màn hình CRUD. Phần lõi đã có các thuộc tính quan trọng của một hệ thống quản trị có kiểm soát: xác thực tập trung, RBAC theo module, RLS, state machine, optimistic locking, snapshot dữ liệu lịch sử, audit và email outbox. Phạm vi hiện tại phù hợp để bảo vệ ở mức **prototype nghiệp vụ trưởng thành/M2**. Khi trình bày, cần chủ động giới hạn rõ các tích hợp “last mile” chưa có — payment refund, vận chuyển, realtime, ảnh catalog, MFA và server-side pagination — thay vì gọi chúng là production-ready.
