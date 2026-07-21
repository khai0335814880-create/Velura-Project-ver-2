# 🛍️ Velura Fashion Shop

> **Đồ án môn học** — Ứng dụng thương mại điện tử thời trang tích hợp AI  
> Đại học Kinh tế — Luật (UEL), TP. Hồ Chí Minh

[![Node.js](https://img.shields.io/badge/Node.js-≥22-green?logo=node.js)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-blue?logo=vite)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-orange?logo=supabase)](https://supabase.com/)

---

## 📋 Tổng quan

**Velura** là một nền tảng thương mại điện tử thời trang cao cấp, được xây dựng bằng **Vanilla JavaScript** + **Vite** cho frontend và **Node.js HTTP API** + **Supabase PostgreSQL** cho backend. Dự án bao gồm:

- 🛒 **Trang khách hàng (User Web)** — Duyệt sản phẩm, giỏ hàng, thanh toán, đánh giá, blog thời trang
- 🤖 **Chatbot AI** — Tư vấn phong cách với RAG + Gemini AI, gợi ý sản phẩm thông minh
- ⚙️ **Trang quản trị (Admin Web)** — Quản lý sản phẩm, đơn hàng, tài khoản, khuyến mãi, thống kê
- 🗄️ **Backend API** — RESTful API với RBAC, audit logs, xử lý đơn hàng, hệ thống email

---

## 👥 Thành viên nhóm

| STT | Họ và tên | Vai trò |
|:---:|-----------|---------|
| 1 | **Nguyễn Trần Dạ Uyên** | Nhà sáng lập & Giám đốc sáng tạo |
| 2 | **Trần Diễm Quỳnh** | Trưởng phòng phong cách |
| 3 | **Nguyễn Như Khải** | Trưởng phòng công nghệ |
| 4 | **Nguyễn Tô Hoàng Gia** | Giám đốc thiết kế |
| 5 | **Nguyễn Phan Ngọc Hân** | Giám đốc vận hành |
| 6 | **Đoàn Phương Ninh** | Thành viên nhóm sáng tạo |

---

## 🏗️ Công nghệ sử dụng

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript, Vite 5.x |
| Backend API | Node.js ≥22 (native HTTP, zero-framework) |
| Database | PostgreSQL (Supabase hosted), pgvector |
| Auth | Supabase Auth (Email/Password + Google OAuth) |
| AI/Chatbot | Google Gemini API, RAG embeddings, n8n workflow |
| Deployment | Cloudflare Tunnel, Vite static build |
| Testing | Node.js built-in test runner (116 tests) |
| Package Manager | npm workspaces (monorepo) |

---

## 📁 Cấu trúc thư mục

```text
Velura-project/
├── apps/
│   ├── api/                    # Backend API (Node.js HTTP server)
│   │   └── src/
│   │       ├── server.js       # Entry point (port 8787)
│   │       ├── chatbot/        # Chatbot AI + RAG service
│   │       ├── orders/         # Quản lý đơn hàng
│   │       ├── products/       # Quản lý sản phẩm
│   │       ├── pricing/        # Quản lý giá & khuyến mãi
│   │       ├── returns/        # Xử lý đổi trả
│   │       ├── reviews/        # Đánh giá sản phẩm
│   │       └── user/           # Xác thực & tài khoản
│   ├── admin-web/              # Trang quản trị (Vite)
│   │   ├── src/
│   │   │   ├── pages/admin/    # Các trang quản trị
│   │   │   ├── scripts/        # JavaScript modules
│   │   │   └── styles/         # CSS stylesheets
│   │   └── vite.config.js
│   └── user-web/               # Trang khách hàng (Vite)
│       ├── src/
│       │   ├── pages/          # Trang sản phẩm, blog, chatbot...
│       │   ├── scripts/        # JavaScript modules
│       │   ├── styles/         # CSS stylesheets
│       │   ├── assets/         # Hình ảnh, icons
│       │   └── components/     # HTML components (header, footer...)
│       └── vite.config.js
├── database/
│   ├── migrations/             # SQL migration files (001→021)
│   ├── database_user/          # Schema + seed data cho User DB
│   └── seed/                   # Scripts seed dữ liệu mẫu
├── packages/
│   ├── shared-types/           # Shared enums/constants
│   ├── utils/                  # Shared helpers
│   └── validation/             # Shared validation
├── tests/
│   ├── api/                    # 16 file test (116 test cases)
│   └── e2e/                    # End-to-end tests
├── docs/                       # Tài liệu kiến trúc & nghiệp vụ
├── infra/                      # Docker, Nginx configs
├── scripts/                    # Scripts tiện ích (dev, seed, migrate)
├── .env.example                # Template biến môi trường
├── package.json                # Root monorepo config
└── README.md                   # File này
```

---

## 🚀 Hướng dẫn Cài đặt & Chạy Local (Cho Giảng viên & Hội đồng chấm)

Dự án sử dụng biến môi trường cho Supabase, AI, SMTP và các dịch vụ bên ngoài. File `.env.example` chỉ chứa cấu trúc và giá trị mẫu; người chạy dự án phải tự cung cấp thông tin hợp lệ trong file `.env` local hoặc trên dashboard của nền tảng deploy.

### 1. Yêu cầu hệ thống
- **Node.js** phiên bản `>= 22` (Khuyến nghị sử dụng Node.js 22 LTS).
- **npm** phiên bản `>= 10` (đi kèm sẵn khi cài đặt Node.js).
- **Git** để clone mã nguồn.

### 2. Các bước cài đặt và cấu hình

#### Bước 1: Clone dự án và truy cập thư mục
```bash
git clone https://github.com/khai0335814880-create/Velura-Project-ver-2.git
cd Velura-Project-ver-2
```

#### Bước 2: Cài đặt toàn bộ thư viện (Dependencies)
```bash
npm install
```

#### Bước 3: Cấu hình biến môi trường (`.env`)
Sao chép file cấu hình mẫu thành `.env`, sau đó thay các placeholder bằng thông tin của môi trường bạn được cấp. Không commit hoặc chia sẻ file `.env`.

* **Trên Windows (cmd / PowerShell):**
  ```powershell
  copy .env.example .env
  ```
* **Trên macOS / Linux:**
  ```bash
  cp .env.example .env
  ```

> [!NOTE]
> File `.env.example` không chứa secret thật. Trước khi chạy, cần cấu hình tối thiểu Supabase URL, publishable key, service-role key cho API và các biến dịch vụ được sử dụng. Các cổng development mặc định là `8787` cho API, `3001` cho User Shop và `5174` cho Admin Panel.

#### Bước 4: Thiết lập và Khởi tạo Cơ sở dữ liệu (Database Setup)
Chạy các lệnh sau theo thứ tự để đồng bộ schema cơ sở dữ liệu và dữ liệu mẫu (admin, blogs...):

```bash
# 1. Chạy migrations để tự động dựng cấu trúc bảng, RLS và RPCs
npm run db:migrate

# 2. Tạo các tài khoản quản trị (Admin) mẫu trong hệ thống
npm run db:seed:admins

# 3. Tạo dữ liệu bài viết mẫu cho blog thời trang
npm run db:seed:blogs
```

#### Bước 5: Khởi động dự án
Khởi động đồng thời cả 3 cổng dịch vụ (API + Admin + User) chỉ với một lệnh duy nhất:
```bash
npm start
```
*(hoặc sử dụng `npm run dev`)*

Hệ thống sẽ chạy song song trên local:
- 🔗 **API Server:** `http://localhost:8787` (Backend API)
- 🔗 **User Shop:** `http://localhost:3001` (Giao diện mua sắm của khách hàng)
- 🔗 **Admin Panel:** `http://localhost:5174` (Giao diện quản lý của Admin)

---

## 🔑 Tài khoản Thử nghiệm (Test Accounts)

Sau khi chạy lệnh `npm run db:seed:admins`, cơ sở dữ liệu sẽ được điền sẵn thông tin phân quyền cho các tài khoản quản trị sau:

| STT | Tài khoản quản trị | Email | Vai trò (RBAC) |
|:---:|--------------------|-------|----------------|
| 1 | **Phạm Thu Hương** | `admin@velura.vn` | `super_admin` (Quyền cao nhất) |
| 2 | **Trần Minh Tuấn** | `product@velura.vn` | `admin_operator_sanpham` (Quản lý sản phẩm) |
| 3 | **Lê Gia Linh** | `order@velura.vn` | `admin_operator_donhang` (Quản lý đơn hàng) |
| 4 | **Ngô Thanh Sơn** | `price@velura.vn` | `admin_operator_gia_km` (Quản lý giá và khuyến mãi) |
| 5 | **Vũ Thanh Mai** | `cskh@velura.vn` | `admin_operator_cskh_dt` (Chăm sóc khách hàng & đổi trả) |
| 6 | **Đỗ Minh Anh** | `review@velura.vn` | `admin_operator_danhgia_review` (Kiểm duyệt đánh giá) |

### Hướng dẫn Đăng nhập:
1. **Trang Khách hàng (User Shop):** Bạn có thể tự do đăng ký tài khoản khách hàng mới trực tiếp tại trang đăng ký `/pages/auth/signup.html` hoặc đăng nhập bằng tài khoản cá nhân.
2. **Trang Quản trị (Admin Panel):** Sử dụng các tài khoản email trên để đăng nhập qua Google OAuth/Supabase SSO liên kết hoặc đăng nhập bằng tài khoản được cấp quyền tương ứng để trải nghiệm phân quyền RBAC cực kỳ chặt chẽ trong hệ thống.

---

## ✨ Tính năng chính

### 🛒 Trang Khách hàng (User Web)
- Đăng ký / Đăng nhập (Email + Google OAuth)
- Duyệt sản phẩm theo danh mục, bộ sưu tập
- Xem chi tiết sản phẩm, đánh giá, hình ảnh
- Giỏ hàng và thanh toán (thành viên + khách)
- Quản lý đơn hàng, lịch sử mua hàng
- Yêu cầu đổi trả sản phẩm
- Blog thời trang & Style Quiz AI
- **Chatbot AI** tư vấn phong cách với RAG

### ⚙️ Trang Quản trị (Admin Web)
- Dashboard thống kê tổng quan
- Quản lý sản phẩm (CRUD, nhập/xuất CSV)
- Quản lý đơn hàng & trạng thái
- Quản lý tài khoản người dùng (RBAC)
- Quản lý khuyến mãi & mã giảm giá
- Xử lý đổi trả & CSKH
- Quản lý đánh giá sản phẩm
- Nhật ký hoạt động (Audit logs)

### 🤖 Chatbot AI
- Tìm kiếm sản phẩm bằng ngôn ngữ tự nhiên
- Gợi ý outfit theo phong cách, dịp, ngân sách
- Hiển thị card sản phẩm với hình ảnh, giá, nút thêm giỏ hàng
- RAG embedding với pgvector cho độ chính xác cao

---

## 🌐 Deployment (Production)

Mã nguồn chính thức của phiên bản này được lưu tại:

- [khai0335814880-create/Velura-Project-ver-2](https://github.com/khai0335814880-create/Velura-Project-ver-2)

Domain production sẽ được cập nhật sau khi hoàn tất triển khai User Web, Admin Web và API. Xem [README_DEPLOY.md](./README_DEPLOY.md) để biết đầy đủ lệnh build, biến môi trường, Supabase Auth Redirect URL và checklist kiểm tra sau deploy.

---

## 🧪 Kiểm thử

```bash
# Chạy toàn bộ 116 bài test
npm test

# Smoke test API endpoints
npm run smoke:api

# Build production
npm run build
```

---

## 📝 Các lệnh NPM hữu ích

| Lệnh | Mô tả |
|-------|--------|
| `npm start` | Khởi động tất cả (API + Admin + User) |
| `npm run dev` | Tương tự `npm start` |
| `npm run dev:api` | Chạy API server; tự bỏ qua nếu API Velura đã chạy |
| `npm run dev:admin` | Chỉ chạy Admin web |
| `npm run dev:user` | Chạy User web và tự khởi động API nếu cần |
| `npm run build` | Build production cả User + Admin |
| `npm test` | Chạy 116 unit tests |
| `npm run db:migrate` | Chạy database migrations |
| `npm run db:seed:admins` | Seed tài khoản admin |
| `npm run ai:embed:products` | Tạo AI embeddings cho sản phẩm |

---

## 📄 Giấy phép

Dự án này được phát triển cho mục đích học tập tại Đại học Kinh tế — Luật (UEL).

---

> **Velura** — *Thanh lịch có thể đồng hành qua nhiều mùa* ✨
