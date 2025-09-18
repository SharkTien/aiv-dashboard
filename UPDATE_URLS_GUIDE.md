# Hướng dẫn cập nhật URL từ IP về Vercel Domain

## Tổng quan
Tài liệu này hướng dẫn cách cập nhật toàn bộ URL từ IP address `103.110.85.200:3000` về Vercel domain `https://aiv-dashboard-ten.vercel.app`.

## Các file đã được cập nhật

### 1. Source Code Files
- ✅ `src/middleware.ts` - Cập nhật ALLOWED origins
- ✅ `src/app/api/utm/links/route.ts` - Cập nhật generateTrackingLink function
- ✅ `src/app/api/forms/by-code/[code]/submit/route.ts` - Cập nhật ALLOWED_ORIGINS
- ✅ `backup.html` - Đã có đúng URL Vercel
- ✅ `cicd_report.tex` - Cập nhật webhook URL

### 2. Environment Variables (Cần cập nhật trên server)
Cần cập nhật file `.env` trên server với các giá trị sau:

```env
ALLOWED_ORIGINS=https://www.aiesec.vn,https://aiv-dashboard-ten.vercel.app,http://localhost:3000
BACKEND_HOST=https://aiv-dashboard-ten.vercel.app
NEXT_PUBLIC_APP_URL=https://aiv-dashboard-ten.vercel.app
```

## Các bước thực hiện

### Bước 1: Cập nhật Environment Variables trên Server
```bash
# SSH vào server
ssh root@103.110.85.200

# Backup file .env hiện tại
cp /root/apps/aiv-dashboard/.env /root/apps/aiv-dashboard/.env.backup

# Cập nhật file .env
nano /root/apps/aiv-dashboard/.env

# Thay đổi các dòng sau:
ALLOWED_ORIGINS=https://www.aiesec.vn,https://aiv-dashboard-ten.vercel.app,http://localhost:3000
BACKEND_HOST=https://aiv-dashboard-ten.vercel.app
NEXT_PUBLIC_APP_URL=https://aiv-dashboard-ten.vercel.app
```

### Bước 2: Cập nhật Database
```bash
# Kết nối MySQL
mysql -u root -p

# Chọn database
USE aivdb;

# Chạy script cập nhật
source /root/apps/aiv-dashboard/update-urls.sql;
```

### Bước 3: Restart Application
```bash
# Restart PM2
pm2 restart aiv-dashboard

# Kiểm tra status
pm2 status
pm2 logs aiv-dashboard --lines 50
```

### Bước 4: Test Application
```bash
# Test API endpoints
curl https://aiv-dashboard-ten.vercel.app/api/test

# Test UTM tracking
curl "https://aiv-dashboard-ten.vercel.app/api/utm/track?id=1&url=https://example.com"
```

## Kiểm tra kết quả

### 1. Kiểm tra Environment Variables
```bash
# Trên server, kiểm tra env vars
pm2 show aiv-dashboard
```

### 2. Kiểm tra Database
```sql
-- Kiểm tra UTM links đã được cập nhật
SELECT id, tracking_link, created_at 
FROM utm_links 
WHERE tracking_link LIKE '%aiv-dashboard-ten.vercel.app%'
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Kiểm tra Application Logs
```bash
# Xem logs để đảm bảo không có lỗi
pm2 logs aiv-dashboard --lines 100
```

## Lưu ý quan trọng

1. **HTTPS Required**: Vercel domain sử dụng HTTPS, đảm bảo tất cả requests đều sử dụng HTTPS
2. **CORS Configuration**: Đã cập nhật ALLOWED_ORIGINS để bao gồm Vercel domain
3. **Database Migration**: Script SQL sẽ cập nhật tất cả existing UTM links
4. **Backup**: Luôn backup database trước khi chạy migration script

## Rollback Plan (Nếu cần)

Nếu cần rollback về IP address:

```bash
# Restore .env backup
cp /root/apps/aiv-dashboard/.env.backup /root/apps/aiv-dashboard/.env

# Restart application
pm2 restart aiv-dashboard

# Rollback database (nếu cần)
# Chạy script rollback tương tự nhưng ngược lại
```

## Troubleshooting

### Lỗi CORS
- Kiểm tra ALLOWED_ORIGINS trong .env
- Đảm bảo domain được include trong middleware.ts

### Lỗi Database Connection
- Kiểm tra DATABASE_HOST và các config khác trong .env
- Restart application sau khi cập nhật .env

### Lỗi UTM Tracking
- Kiểm tra generateTrackingLink function
- Verify database đã được cập nhật đúng

## Kết quả mong đợi

Sau khi hoàn thành:
- ✅ Tất cả UTM links sử dụng Vercel domain
- ✅ Application hoạt động bình thường với HTTPS
- ✅ CORS được cấu hình đúng
- ✅ Database được cập nhật đồng bộ
