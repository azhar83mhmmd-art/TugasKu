/* ===================================================
   KelasKu — Server Backend
   Node.js + Express + Socket.io
   Jalankan di Termux: node server.js
   =================================================== */

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const fs         = require('fs');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT    = process.env.PORT || 3200;
const DB_FILE = path.join(__dirname, 'db.json');

// ===== AKUN GURU TETAP =====
const GURU_ACCOUNTS = [
  { username: 'qwerty', password: 'qwerty123', nama: 'Guru KelasKu', role: 'admin', avatar: 'G' }
];

// ===== DATABASE (file JSON) =====
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const init = { users: [], tugas: [], pengumpulan: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    console.error('DB read error:', e.message);
    return { users: [], tugas: [], pengumpulan: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.static(__dirname));  // Sajikan index.html, app.js, style.css

// ===== REST API =====

// --- AUTH ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username dan password wajib diisi!' });

  // Cek guru dulu
  const guru = GURU_ACCOUNTS.find(g => g.username === username && g.password === password);
  if (guru) return res.json({ user: { ...guru, password: undefined } });

  // Cek siswa
  const db = readDB();
  const siswa = db.users.find(u => u.username === username && u.password === password);
  if (!siswa)
    return res.status(401).json({ error: 'Username atau password salah!' });

  res.json({ user: { ...siswa, password: undefined } });
});

app.post('/api/signup', (req, res) => {
  const { nama, username, password } = req.body;
  if (!nama || !username || !password)
    return res.status(400).json({ error: 'Semua kolom wajib diisi!' });
  if (username.length < 3)
    return res.status(400).json({ error: 'Username minimal 3 karakter!' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password minimal 6 karakter!' });

  // Cek bentrok dengan guru
  if (GURU_ACCOUNTS.find(g => g.username === username.toLowerCase()))
    return res.status(400).json({ error: 'Username sudah dipakai, coba username lain!' });

  const db = readDB();
  if (db.users.find(u => u.username === username.toLowerCase()))
    return res.status(400).json({ error: 'Username sudah dipakai, coba username lain!' });

  const newUser = {
    username: username.toLowerCase(),
    password,
    nama,
    role: 'siswa',
    avatar: nama.charAt(0).toUpperCase()
  };
  db.users.push(newUser);
  writeDB(db);

  // Broadcast daftar siswa terbaru ke semua client
  io.emit('users_updated', db.users.map(u => ({ ...u, password: undefined })));

  res.json({ ok: true, message: `Akun siswa "${nama}" berhasil dibuat!` });
});

// --- USERS ---
app.get('/api/users', (req, res) => {
  const db = readDB();
  // Kembalikan siswa saja (tanpa password)
  res.json(db.users.map(u => ({ ...u, password: undefined })));
});

// --- TUGAS ---
app.get('/api/tugas', (req, res) => {
  const db = readDB();
  res.json(db.tugas);
});

app.post('/api/tugas', (req, res) => {
  const db = readDB();
  const t = req.body;
  if (!t.id || !t.judul || !t.mapel || !t.deadline || !t.deskripsi)
    return res.status(400).json({ error: 'Data tugas tidak lengkap!' });

  db.tugas.unshift(t);
  writeDB(db);

  // Broadcast ke semua client
  io.emit('tugas_updated', db.tugas);
  res.json({ ok: true });
});

app.delete('/api/tugas/:id', (req, res) => {
  const db = readDB();
  const id = req.params.id;
  db.tugas = db.tugas.filter(t => t.id !== id);
  db.pengumpulan = db.pengumpulan.filter(p => p.tugasId !== id);
  writeDB(db);

  io.emit('tugas_updated', db.tugas);
  io.emit('pengumpulan_updated', db.pengumpulan);
  res.json({ ok: true });
});

// --- PENGUMPULAN ---
app.get('/api/pengumpulan', (req, res) => {
  const db = readDB();
  res.json(db.pengumpulan);
});

app.post('/api/pengumpulan', (req, res) => {
  const db = readDB();
  const { tugasId, siswaId, status, catatan } = req.body;
  if (!tugasId || !siswaId || !status)
    return res.status(400).json({ error: 'Data tidak lengkap!' });

  const existing = db.pengumpulan.find(p => p.tugasId === tugasId && p.siswaId === siswaId);
  if (existing) {
    existing.status  = status;
    existing.waktu   = new Date().toISOString();
    existing.catatan = catatan || existing.catatan;
  } else {
    db.pengumpulan.push({
      tugasId, siswaId, status, catatan: catatan || '',
      waktu: new Date().toISOString()
    });
  }
  writeDB(db);

  io.emit('pengumpulan_updated', db.pengumpulan);
  res.json({ ok: true });
});

// --- KICK SISWA (hapus akun) ---
app.delete('/api/users/:username', (req, res) => {
  const db = readDB();
  const username = req.params.username;

  // Jangan bisa hapus akun guru
  if (GURU_ACCOUNTS.find(g => g.username === username))
    return res.status(403).json({ error: 'Tidak bisa menghapus akun guru!' });

  db.users = db.users.filter(u => u.username !== username);
  db.pengumpulan = db.pengumpulan.filter(p => p.siswaId !== username);
  writeDB(db);

  // Broadcast: siswa di-kick (force logout jika sedang online)
  io.emit('user_kicked', { username });
  io.emit('users_updated', db.users.map(u => ({ ...u, password: undefined })));
  io.emit('pengumpulan_updated', db.pengumpulan);
  res.json({ ok: true });
});

// ===== SOCKET.IO =====
io.on('connection', (socket) => {
  const addr = socket.handshake.address;
  console.log(`[+] Client terhubung: ${socket.id} (${addr})`);

  // Kirim data awal saat client connect
  const db = readDB();
  socket.emit('init_data', {
    users:       db.users.map(u => ({ ...u, password: undefined })),
    tugas:       db.tugas,
    pengumpulan: db.pengumpulan
  });

  socket.on('disconnect', () => {
    console.log(`[-] Client terputus: ${socket.id}`);
  });
});

// ===== JALANKAN SERVER =====
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════╗');
  console.log('║        KelasKu Server Running         ║');
  console.log(`║   http://localhost:${PORT}               ║`);
  console.log('║                                       ║');
  console.log('║  Untuk akses dari HP lain di WiFi:    ║');
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  Object.values(nets).flat().filter(n => n.family === 'IPv4' && !n.internal).forEach(n => {
    const ip = n.address.padEnd(15);
    console.log(`║  http://${ip}:${PORT}          ║`);
  });
  console.log('╚═══════════════════════════════════════╝');
  console.log('');
});
