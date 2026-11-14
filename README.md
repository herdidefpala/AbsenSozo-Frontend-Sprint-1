# AbsenSozo — Frontend Sprint 1

## Yang sudah tersedia
- React + Vite + Tailwind CSS
- Login karyawan dan administrator melalui Supabase Auth
- Employee dashboard
- Check-in dengan foto kamera, lokasi GPS, dan penyimpanan Supabase
- Admin dashboard dengan data absensi Supabase
- Sidebar dan topbar responsive
- Design system navy corporate
- Routing dasar

## Menjalankan project
1. Install Node.js versi LTS.
2. Extract ZIP.
3. Buka folder project di VS Code.
4. Jalankan:
   ```bash
   npm install
   npm run dev
   ```
5. Buka URL lokal yang ditampilkan Vite.

## Preview route
- `/` — Login
- `/employee` — Dashboard karyawan
- `/admin` — Dashboard admin

## Deploy ke Vercel
1. Hubungkan repository Git ke Vercel. Folder project saat ini belum memiliki repository Git; buat repository (sebaiknya private) lalu push source code. `.env.local` sudah diabaikan Git.
2. Import repository tersebut di Vercel. Pilih framework **Vite**, build command `npm run build`, dan output directory `dist`.
3. Tambahkan environment variables berikut di Vercel untuk Preview dan Production:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   Gunakan URL dan publishable key dari project Supabase yang sama. Jangan gunakan `service_role` atau secret key di frontend.
4. Setelah domain Vercel tersedia, tambahkan domain production (dan preview jika diperlukan) ke Supabase Authentication → URL Configuration → Site URL / Redirect URLs.
5. Push perubahan untuk memicu deploy. `vercel.json` mengarahkan route React (`/employee`, `/admin`) kembali ke aplikasi SPA saat halaman dibuka langsung.

## Setup Supabase
1. Pastikan `.env.local` berisi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY`. Formatnya tersedia di `.env.example`. Gunakan publishable key; jangan pernah menaruh service-role key di frontend.
2. Jalankan seluruh SQL pada `supabase/schema.sql` melalui Supabase SQL Editor. Jika schema sebelumnya sudah dijalankan, jalankan ulang file ini agar trigger pendaftaran baru ikut dibuat. Script ini membuat tabel profil/absensi, private bucket foto, trigger waktu check-in WIB, Row Level Security, dan trigger pembuatan profil setelah signup.
3. Di Supabase Authentication, aktifkan konfirmasi email dan atur Site URL serta Redirect URLs untuk `http://localhost:5173` (tambahkan domain deploy saat production).
4. Buat akun administrator melalui Supabase Dashboard → Authentication → Users, lalu tambahkan profil admin melalui SQL Editor menggunakan UID dari Auth Users:
   ```sql
   insert into public.employee_profiles (user_id, employee_code, full_name, department, role)
   values
     ('<ADMIN_AUTH_USER_UUID>', 'ADM-001', 'Nama Admin', 'Administrasi', 'admin');
   ```
5. Karyawan dapat memilih **Daftar sebagai karyawan** pada halaman login. Akun baru perlu mengonfirmasi email; profil dibuat otomatis dengan role `employee`. Kode karyawan harus unik.
6. Jalankan ulang `npm run dev`, lalu login menggunakan email/password. Pilihan role di layar login hanya mencocokkan akun, bukan memberi hak admin.

## Integrasi dan batasan
- Foto disimpan di bucket private `attendance-photos`, dengan path per user. Record absensi dan koordinat disimpan di `attendance_records`.
- RLS membatasi data karyawan ke pemilik akun, sementara administrator dapat membaca ringkasan seluruh karyawan.
- Check-in hanya dapat dibuat sekali per user per hari. Timestamp dan tanggal WIB ditetapkan oleh trigger database.
- Koordinat GPS berasal dari browser dan saat ini hanya direkam; belum ada geofence, validasi jarak kantor, atau verifikasi anti-spoofing di server. Implementasikan aturan kantor di backend sebelum absensi dipakai operasional.
- Kamera dan GPS memerlukan izin browser dan secure context (HTTPS, atau localhost).
- Akun administrator dibuat di Supabase Dashboard; pemulihan password belum tersedia di aplikasi.
- Pendaftaran mandiri membuat profil berdasarkan nama, kode karyawan, dan departemen yang diisi pengguna. Konfirmasi email membuktikan akses ke email, bukan status kepegawaiannya; untuk penggunaan operasional pertimbangkan persetujuan admin atau validasi kode terhadap daftar karyawan resmi.

## Catatan
Dashboard admin membaca tabel absensi langsung. Jadwal dan batas keterlambatan masih menggunakan aturan sederhana pukul 08:00 WIB. Uji kebijakan akses dan geofence di project Supabase sebelum penggunaan operasional.
