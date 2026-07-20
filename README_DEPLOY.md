# Velura Production Deployment

Tài liệu này là checklist bàn giao cho người triển khai. Dự án gồm ba dịch vụ độc lập; không dùng `npm start` ở thư mục gốc để chạy production vì lệnh đó khởi động môi trường development.

## 1. Kiến trúc triển khai

| Dịch vụ | Loại | Build command | Start/Publish |
| --- | --- | --- | --- |
| User Web | Static site | `npm ci && npm run build:user` | Publish `apps/user-web/dist` |
| Admin Web | Static site | `npm ci && npm run build:admin` | Publish `apps/admin-web/dist` |
| API | Node.js service | `npm ci --omit=dev` | `node apps/api/src/server.js` |

API phải là process chạy liên tục trên Render, Railway, VPS/PM2 hoặc nền tảng Node tương đương. User Web và Admin Web nên được deploy như hai static site riêng hoặc đặt sau cùng một reverse proxy.

Sau khi API khởi động, kiểm tra:

```text
GET https://api.yourdomain.com/health
```

Response phải có `ok: true` và `service: "velura-api"`.

## 2. Biến môi trường bắt buộc

Không commit file `.env`. Khai báo secrets trực tiếp trong dashboard của hosting provider.

### User Web và Admin Web — build time

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
VITE_API_BASE_URL=https://api.yourdomain.com
```

Các biến `VITE_*` được đóng gói vào JavaScript phía trình duyệt. Tuyệt đối không đặt service-role key hoặc database password dưới tiền tố `VITE_`.

### API — runtime

```dotenv
NODE_ENV=production
PORT=8787
API_ORIGIN=https://api.yourdomain.com
CORS_ORIGIN=https://user.yourdomain.com,https://admin.yourdomain.com
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
VELURA_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Hosting provider có thể tự cấp `PORT`; khi đó dùng giá trị do provider cung cấp. `CORS_ORIGIN` phải liệt kê chính xác origin của cả User Web và Admin Web, phân tách bằng dấu phẩy và không thêm path.

Các biến SMTP, Gemini, Mistral và n8n là bắt buộc khi bật tính năng tương ứng. Xem `.env.example` để có danh sách đầy đủ.

### Migration/operations only

```dotenv
SUPABASE_DB_URL=postgresql://postgres.your-project-ref:[PERCENT_ENCODED_PASSWORD]@aws-0-your-region.pooler.supabase.com:6543/postgres
```

Không cần đưa `SUPABASE_DB_URL` vào runtime của frontend. Không tự động chạy lại toàn bộ migration trong mỗi lần web deploy. Với database production, chỉ áp dụng forward migration đã review và backup trước khi thay đổi schema.

## 3. Supabase Auth URLs

Sau khi có domain thật, vào Supabase Dashboard > Authentication > URL Configuration.

Đặt Site URL thành domain User Web, ví dụ:

```text
https://user.yourdomain.com
```

Thêm các Redirect URLs chính xác mà code hiện sử dụng:

```text
https://user.yourdomain.com/src/pages/auth/auth-callback.html
https://admin.yourdomain.com/pages/admin/auth-callback.html
https://admin.yourdomain.com/pages/admin/change-password.html
```

Nếu deploy preview/staging, thêm riêng từng origin preview cần dùng. Không dùng wildcard rộng cho production nếu không cần thiết.

Sau khi cấu hình, kiểm tra tối thiểu:

1. User đăng nhập bằng email/password.
2. User OAuth đăng nhập và quay lại User Web.
3. Admin OAuth đăng nhập và quay lại Admin Web.
4. Luồng quên/đổi mật khẩu.
5. Đăng xuất và đăng nhập lại sau khi refresh trang.

## 4. Storage

Bucket production cần thiết hiện tại là `return-evidence`. Trước mỗi lần chuyển project, so sánh bucket visibility, object count, object paths và tổng dung lượng giữa project nguồn/đích.

Inventory được xác minh ngày 2026-07-17:

```text
Old return-evidence: 17 objects, 13,918,931 bytes
New return-evidence: 17 objects, 13,918,931 bytes
Missing in new: 0
Extra in new: 0
```

## 5. Release checklist

Chạy từ repository root:

```bash
npm ci
npm run check:config
npm test
npm run build
npm run smoke:api
```

Trước khi release, xác nhận thêm:

- `npm audit --omit=dev` không còn production vulnerability chưa được chấp nhận.
- `.env` không được Git track.
- Không có service-role key, database URL hoặc SMTP password trong source/build artifact.
- `VITE_API_BASE_URL` trỏ đúng API production.
- `CORS_ORIGIN` chứa đúng hai web origins.
- Supabase Auth redirect URLs đã được cập nhật.
- `/health`, đăng nhập, upload evidence và một mutation nghiệp vụ đều hoạt động trên staging.

## 6. Rollback

- Web/API: rollback về artifact hoặc deployment thành công gần nhất trên hosting provider.
- Database: tạo forward-fix migration; không sửa hoặc xóa migration đã áp dụng trên production.
- Nếu migration có rủi ro dữ liệu, backup trước khi chạy và ghi lại migration version đã triển khai.
