# A01 Production Readiness - Supabase Migration Guide

## Trạng thái hiện tại

- Supabase Auth (GoTrue): WORKING (200)
- Google OAuth: WORKING (302 redirect)
- Manual PKCE: WORKING (exchange succeeds)
- SSO Login: WORKING (user logged in as member)

## Cần làm thủ công

### Bước 1: Áp Migration

1. Vào **Supabase Dashboard** → project `gtyuajboeffmfskofoyh`
2. Vào **SQL Editor**
3. Copy TOÀN BỘ nội dung file `database/migrations/001_uc_a01_account_rbac.sql`
4. Paste vào SQL Editor và nhấn **Run**

Migration sẽ:
- Thêm columns vào `users` (auth_user_id, lock_type, version, is_verified, etc.)
- Thêm columns vào `approval_admin_request` (target_version, version)
- Tạo table `email_outbox`
- Tạo trigger `velura_handle_new_auth_user` (tự tạo user row khi auth user mới)
- Tạo các RPC functions (admin_lock_user, admin_unlock_user, admin_change_user_role, admin_review_role_request)
- Setup RLS policies
- Grant permissions

### Bước 2: Tạo Super Admin

Sau khi migration xong, chạy trong SQL Editor:

```sql
-- Tạo/Tạo lại super_admin
INSERT INTO public.users (user_id, auth_user_id, email, full_name, role, admin_role, is_active, is_verified, version)
SELECT id, id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 
       'admin', 'super_admin', true, true, 1
FROM auth.users 
WHERE email = 'YOUR_GOOGLE_EMAIL'
ON CONFLICT (user_id) DO UPDATE 
SET role = 'admin', admin_role = 'super_admin', is_active = true, version = version + 1;
```

**Lưu ý**: Nếu `is_verified` column không tồn tại, chạy lệnh này trước:
```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
```

### Bước 3: Verify

Sau khi hoàn thành, báo lại cho agent để verify:
- Migration đã áp thành công
- Tài khoản super_admin đã được tạo
- Ready để test toàn bộ A01 RBAC
