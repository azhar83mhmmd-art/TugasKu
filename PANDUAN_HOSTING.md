# 🎓 KelasKu — Panduan Hosting di Vercel + Supabase

Panduan lengkap langkah demi langkah. Estimasi waktu: **15–20 menit**.

---

## ❓ Mengapa Versi Lama Error?

Versi lama menggunakan **Node.js + Express + Socket.io** yang membutuhkan server
yang berjalan terus-menerus (24/7). Vercel **tidak mendukung** ini karena Vercel
adalah platform *serverless* — hanya bisa meng-host file statis.

**Solusi versi baru ini:**
- ✅ Frontend murni (HTML + CSS + JS)
- ✅ Database: **Supabase** (gratis, PostgreSQL cloud)
- ✅ Real-time: **Supabase Realtime** (WebSocket built-in, menggantikan Socket.io)
- ✅ Bisa di-host di Vercel tanpa error

---

## 📋 Yang Kamu Butuhkan

- Akun **GitHub** (gratis) → https://github.com
- Akun **Supabase** (gratis) → https://supabase.com
- Akun **Vercel** (gratis) → https://vercel.com

---

## LANGKAH 1 — Buat Project Supabase

1. Buka https://supabase.com → klik **Start your project**
2. Daftar / login dengan GitHub
3. Klik **New project**
4. Isi:
   - **Organization**: pilih yang ada atau buat baru
   - **Name**: `kelasku` (bebas)
   - **Database Password**: buat password kuat (catat!)
   - **Region**: pilih **Southeast Asia (Singapore)** agar cepat
5. Klik **Create new project**
6. Tunggu sekitar 1–2 menit sampai project siap

---

## LANGKAH 2 — Buat Tabel Database (Schema)

1. Di dashboard Supabase, klik menu **SQL Editor** (ikon database di sidebar kiri)
2. Klik **New query**
3. Buka file `schema.sql` dari folder project ini
4. **Copy semua isinya** → paste ke SQL Editor
5. Klik tombol **Run** (Ctrl+Enter)
6. Pastikan muncul pesan **"Success. No rows returned"**

> ⚠️ Jika ada error tentang "publication already exists", itu normal — abaikan saja.

---

## LANGKAH 3 — Ambil API Keys Supabase

1. Di dashboard Supabase, klik **Project Settings** (ikon gear di kiri bawah)
2. Klik tab **API**
3. Salin dua nilai ini:
   - **Project URL** → contoh: `https://abcxyz.supabase.co`
   - **Project API keys → anon (public)** → string panjang

---

## LANGKAH 4 — Isi Konfigurasi di app.js

Buka file `app.js`, cari baris ini di bagian atas:

```javascript
const SUPABASE_URL  = 'GANTI_DENGAN_SUPABASE_URL_KAMU';
const SUPABASE_ANON = 'GANTI_DENGAN_SUPABASE_ANON_KEY_KAMU';
```

Ganti dengan nilai yang kamu salin tadi:

```javascript
const SUPABASE_URL  = 'https://abcxyz.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

> 🔐 Aman: anon key boleh di-expose ke frontend karena dilindungi Row Level Security (RLS).

---

## LANGKAH 5 — Upload ke GitHub

### Cara 1: Via Website GitHub (Mudah)

1. Buka https://github.com → login
2. Klik tombol **+** (pojok kanan atas) → **New repository**
3. Isi **Repository name**: `kelasku`
4. Pilih **Public**
5. Klik **Create repository**
6. Di halaman repository, klik **uploading an existing file**
7. Drag & drop semua file berikut ke halaman itu:
   - `index.html`
   - `style.css`
   - `app.js`
   - `schema.sql`
   - `vercel.json`
8. Klik **Commit changes**

### Cara 2: Via Git CLI

```bash
git init
git add .
git commit -m "Initial KelasKu"
git remote add origin https://github.com/USERNAME/kelasku.git
git push -u origin main
```

---

## LANGKAH 6 — Deploy ke Vercel

1. Buka https://vercel.com → login dengan GitHub
2. Klik **Add New → Project**
3. Temukan repository `kelasku` → klik **Import**
4. Di halaman konfigurasi:
   - **Framework Preset**: pilih **Other**
   - Sisanya biarkan default
5. Klik **Deploy**
6. Tunggu sekitar 30 detik
7. Vercel akan memberikan URL seperti: `https://kelasku-xxx.vercel.app`

✅ **Selesai! Website kamu sudah live!**

---

## LANGKAH 7 — Verifikasi Real-time Bekerja

1. Buka website dari dua tab browser / dua perangkat berbeda
2. Login di keduanya (buat akun berbeda)
3. Di satu tab, buat tugas baru (sebagai guru)
4. Di tab lain, tugas harus **langsung muncul** tanpa refresh
5. Di sidebar bawah harus muncul **"Real-time aktif"** dengan titik hijau berkedip

---

## 🔧 Troubleshooting

### ❌ "Real-time tidak aktif" / dot merah
→ Pastikan kamu sudah menjalankan bagian `alter publication supabase_realtime...` di schema.sql

### ❌ "Gagal login / tidak bisa daftar"
→ Cek SUPABASE_URL dan SUPABASE_ANON di app.js, jangan ada spasi atau kutip berlebih

### ❌ Error di Vercel saat deploy
→ Pastikan file `vercel.json` ada di folder yang sama dengan `index.html`

### ❌ Data tidak muncul
→ Buka Supabase → Table Editor → cek apakah tabel sudah terbuat

### ❌ "Row Level Security error"
→ Jalankan ulang bagian policy di schema.sql

---

## 💡 Tips Penggunaan

| Akun | Cara Daftar |
|------|------------|
| **Guru** | Daftar → pilih "Guru/Admin" → masukkan kode `GURU2024` |
| **Siswa** | Daftar → pilih "Siswa" → tidak perlu kode |

---

## 🔄 Cara Update Kode Setelah Deploy

1. Edit file di komputer
2. Push ke GitHub (file otomatis ter-deploy ulang di Vercel)

Atau edit langsung di GitHub website → Vercel otomatis re-deploy.

---

## 📱 Akses dari HP

Cukup buka URL Vercel dari browser HP. Website sudah responsif untuk mobile!

---

*KelasKu — Vercel Edition*
