# KelasKu — Vercel Edition

Platform manajemen tugas & PR kelas digital — **100% frontend, siap deploy ke Vercel**.

## ⚡ Cara Deploy ke Vercel

### Metode 1: Drag & Drop (Paling Mudah)
1. Buka [vercel.com](https://vercel.com) dan login
2. Klik tombol **"Add New Project"**
3. Pilih **"Deploy Without Git"** atau tab **"Import"**
4. **Drag & drop folder ini** ke halaman Vercel
5. Klik **Deploy** — selesai! ✅

### Metode 2: Via GitHub
1. Upload folder ini ke repository GitHub
2. Di Vercel, klik **"Add New Project"** → Import dari GitHub
3. Pilih repo → klik **Deploy**

### Metode 3: Via Vercel CLI
```bash
npm install -g vercel
cd folder-ini
vercel
```

---

## 📁 Struktur File

```
kelasku/
├── index.html    ← Halaman utama (satu file HTML)
├── style.css     ← Semua styling
├── app.js        ← Semua logika aplikasi
├── vercel.json   ← Konfigurasi Vercel
└── README.md     ← File ini
```

> ⚠️ Tidak ada `server.js` atau `package.json` — tidak dibutuhkan!

---

## 🔧 Arsitektur

| Fitur | Teknologi |
|---|---|
| Penyimpanan data | `localStorage` (browser) |
| Real-time antar tab | `BroadcastChannel API` + polling fallback |
| Backend | ❌ Tidak ada (pure frontend) |
| Database | ❌ Tidak ada |
| Framework | ❌ Tidak ada (vanilla JS) |

---

## ⚠️ Catatan Penting

- **Data disimpan di browser** (localStorage) — data berbeda di tiap browser/device
- **Real-time** hanya berfungsi antar **tab dalam browser yang sama**
- Jika ingin data tersinkron antar perangkat/user berbeda, dibutuhkan backend (tidak kompatibel Vercel)

---

## 🔐 Akun & Login

- Semua akun dibuat sendiri via halaman **Daftar**
- Untuk akun **Guru/Admin**: masukkan kode `GURU2024`
- Tidak ada akun bawaan/demo

---

## 🚀 Fitur Lengkap

- ✅ Login & signup (siswa + guru)
- ✅ Manajemen tugas (buat, hapus, lihat detail)
- ✅ Pengumpulan tugas dengan upload file
- ✅ Countdown & status deadline (merah/kuning/hijau)
- ✅ Dashboard statistik
- ✅ Leaderboard & sistem poin
- ✅ Laporan pengumpulan (admin)
- ✅ Kick/hapus siswa (admin)
- ✅ AI Chatbot asisten (bahasa Indonesia)
- ✅ Notifikasi deadline
- ✅ Filter & pencarian tugas
- ✅ Real-time sync antar tab
- ✅ Responsif mobile & desktop
