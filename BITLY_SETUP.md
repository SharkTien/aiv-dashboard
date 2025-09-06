# Short.io URL Shortener Setup

## 1. Tạo Short.io Account
1. Đăng ký tài khoản tại [short.io](https://short.io)
2. Đăng nhập vào dashboard
3. Verify email nếu cần

## 2. Tạo API Key
1. Vào **Settings** → **API Keys**
2. Click **Create API Key**
3. Chọn permissions: **Full access** hoặc **Create links**
4. Copy API key

## 3. Cấu hình Environment Variables
Thêm vào file `.env.local`:
```
SHORT_IO_API_KEY=your_short_io_api_key_here
SHORT_IO_DOMAIN=short.io
```

## 4. Restart Server
```bash
npm run dev
```

## 5. Test
- Tạo UTM link trong UTM Generator
- Click "Shorten" button
- Kiểm tra shortened URL có format `short.io/xxxxx`

## Lưu ý
- Short.io free plan: 1000 links/month, unlimited clicks
- Có thể dùng custom domain với paid plans
- API key cần được bảo mật, không commit vào git
- Short.io có analytics tốt hơn Bitly
