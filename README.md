# KelasKu — Setup di Termux

Platform manajemen tugas kelas digital dengan server real-time menggunakan **Node.js + Socket.io**.

---

## 📁 Struktur File

```
kelasku/
├── server.js       ← Server utama (Express + Socket.io)
├── app.js          ← Logic frontend (client)
├── index.html      ← Halaman utama
├── style.css       ← Tampilan
├── package.json    ← Daftar dependensi
├── db.json         ← Database (dibuat otomatis)
└── README.md       ← Panduan ini
```

---

## 🔧 Instalasi di Termux

### 1. Install Node.js
```bash
pkg update && pkg upgrade
pkg install nodejs
```

### 2. Buat folder & masuk ke folder
```bash
mkdir kelasku
cd kelasku
```

### 3. Salin semua file ke folder ini
Salin `server.js`, `app.js`, `index.html`, `style.css`, `package.json` ke folder `kelasku/`.

### 4. Install dependensi
```bash
npm install
```

### 5. Jalankan server
```bash
node server.js
```

---

## 🌐 Akses Aplikasi

Setelah server berjalan, akan tampil alamat seperti ini:

```
╔═══════════════════════════════════════╗
║        KelasKu Server Running         ║
║   http://localhost:3000               ║
║                                       ║
║  Untuk akses dari HP lain di WiFi:    ║
║  http://192.168.1.5:3000              ║
╚═══════════════════════════════════════╝
```

- **HP yang menjalankan Termux** → buka `http://localhost:3000`
- **HP lain (siswa/guru)** → buka `http://192.168.1.5:3000` (IP sesuai yang tampil)
- Semua HP harus terhubung ke **WiFi yang sama**

---

## 🔑 Akun

### Guru (sudah tersedia)
| Username | Password |
|----------|----------|
| `guru`   | `guru123` |

### Siswa
Daftar sendiri melalui halaman **Sign Up** di aplikasi.

---

## ⚡ Fitur Real-time

- Guru buat tugas → **langsung muncul** di semua siswa yang sedang login
- Siswa kumpulkan tugas → **langsung update** di dashboard guru
- Guru kick siswa → **langsung logout** dari HP siswa tersebut
- Siswa baru daftar → **langsung muncul** di leaderboard

---

## 🔄 Menjalankan Ulang Server

Jika Termux ditutup, jalankan ulang:
```bash
cd kelasku
node server.js
```

Agar server tetap berjalan di background Termux:
```bash
# Install tmux
pkg install tmux

# Buat sesi baru
tmux new -s kelasku

# Jalankan server
node server.js

# Keluar dari tmux tanpa matikan server: tekan Ctrl+B lalu D
# Kembali ke sesi: tmux attach -t kelasku
```

---

## 🗃️ Database

Data disimpan di file `db.json` secara otomatis.
Untuk **reset semua data**, hapus file `db.json` dan restart server:
```bash
rm db.json
node server.js
```
