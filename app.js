/* ===================================================
   KelasKu — Manajemen Tugas Kelas
   JavaScript Utama — Logika Aplikasi
   =================================================== */
const socket = io(); // Inisialisasi koneksi real-time
// ===== STATE APLIKASI =====
let currentUser = null;
let tugas = [];
let pengumpulan = [];
let notifikasi = [];
let filterStatus = 'semua';
let countdownIntervals = [];

// ===== FUNGSI UTILITAS =====

function getDateOffset(hari, jam, menit) {
  const d = new Date();
  d.setDate(d.getDate() + hari);
  d.setHours(jam, menit, 0, 0);
  return d.toISOString();
}

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
       + ' ' + d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
}

function getCountdown(deadlineISO) {
  const now = new Date();
  const dl = new Date(deadlineISO);
  const diff = dl - now;
  if (diff <= 0) return { text: 'Kadaluarsa', type: 'expired' };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h < 24) {
    const type = h < 6 ? 'urgent' : 'warning';
    return { text: h > 0 ? `${h}j ${m}m lagi` : `${m}m lagi`, type };
  }
  const hari = Math.floor(h / 24);
  const type = hari <= 2 ? 'warning' : 'normal';
  return { text: `${hari} hari lagi`, type };
}

function getMapelClass(mapel) {
  return 'mapel-' + mapel.replace(/\s/g, '');
}

function getColorClass(mapel) {
  return 'color-' + (mapel ? mapel.replace(/\s/g, '') : 'default');
}

function randomGradient(seed) {
  const gradients = [
    '#4f46e5, #7c3aed', '#0ea5e9, #2563eb', '#10b981, #059669',
    '#f59e0b, #d97706', '#ef4444, #dc2626', '#ec4899, #db2777',
    '#8b5cf6, #7c3aed', '#06b6d4, #0891b2',
  ];
  const idx = seed.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

// ===== AKUN GURU (TETAP, TIDAK BISA DIUBAH) =====
const GURU_ACCOUNTS = [
  { username: 'qwerty', password: 'qwerty123', nama: 'Guru KelasKu', role: 'admin', avatar: 'Q' },
];

function getUsers() {
  // Gabungkan akun guru tetap + siswa dari localStorage
  const savedSiswa = localStorage.getItem('kelaskuUsers');
  const siswaList = savedSiswa ? JSON.parse(savedSiswa) : [];
  return [...GURU_ACCOUNTS, ...siswaList];
}

function getSiswaFromStorage() {
  const saved = localStorage.getItem('kelaskuUsers');
  return saved ? JSON.parse(saved) : [];
}

function saveUsers(users) {
  // Hanya simpan siswa (bukan guru hardcoded)
  const onlySiswa = users.filter(u => u.role === 'siswa');
  localStorage.setItem('kelaskuUsers', JSON.stringify(onlySiswa));
  localStorage.setItem('kelaskuUsersSync', Date.now().toString());
}

function getSiswaList() {
  return getSiswaFromStorage();
}

// ===== STORAGE =====// Ganti fungsi saveData yang lama
function saveData() {
    // Sekarang kita tidak lagi menyimpan ke localStorage secara manual untuk data publik
    // Tapi mengirimkan perintah ke server
}

// Tambahkan listener untuk menerima data dari server
socket.on('initData', (data) => {
    tugas = data.tasks;
    pengumpulan = data.submissions;
    renderDashboard();
    renderTugasList();
});

socket.on('taskUpdated', (updatedTasks) => {
    tugas = updatedTasks;
    renderDashboard();
    renderTugasList();
    showToast('Ada tugas baru/pembaruan!', 'info');
});

socket.on('submissionUpdated', (updatedSubmissions) => {
    pengumpulan = updatedSubmissions;
    renderDashboard();
    if (document.getElementById('section-leaderboard').classList.contains('active')) renderLeaderboard();
});


function loadData() {
  const savedTugas = localStorage.getItem('kelaskuTugas');
  const savedPengumpulan = localStorage.getItem('kelaskuPengumpulan');
  const savedNotif = localStorage.getItem('kelaskuNotif');
  tugas = savedTugas ? JSON.parse(savedTugas) : [];
  pengumpulan = savedPengumpulan ? JSON.parse(savedPengumpulan) : [];
  notifikasi = savedNotif ? JSON.parse(savedNotif) : [];
}

// ===== LOGIN / LOGOUT =====
function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showLoginError('Username dan password wajib diisi!');
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    showLoginError('Username atau password salah!');
    return;
  }

  currentUser = user;
  localStorage.setItem('kelaskuUser', JSON.stringify(user));
  document.getElementById('loginError').classList.add('hidden');
  initApp();
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.querySelector('span').textContent = msg;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  setTimeout(() => el.style.animation = '', 10);
}

function showSignup() {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('signupPage').classList.add('active');
  document.getElementById('signupNama').value = '';
  document.getElementById('signupUsername').value = '';
  document.getElementById('signupPassword').value = '';
  document.getElementById('signupError').classList.add('hidden');
  document.getElementById('signupSuccess').classList.add('hidden');
}

function showLogin() {
  document.getElementById('signupPage').classList.remove('active');
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').classList.add('hidden');
}

function handleSignup() {
  const nama = document.getElementById('signupNama').value.trim();
  const username = document.getElementById('signupUsername').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  // Sign up selalu sebagai siswa
  const role = 'siswa';

  const errEl = document.getElementById('signupError');
  const sucEl = document.getElementById('signupSuccess');

  errEl.classList.add('hidden');
  sucEl.classList.add('hidden');

  if (!nama || !username || !password) {
    errEl.querySelector('span').textContent = 'Semua kolom wajib diisi!';
    errEl.classList.remove('hidden');
    return;
  }
  if (username.length < 3) {
    errEl.querySelector('span').textContent = 'Username minimal 3 karakter!';
    errEl.classList.remove('hidden');
    return;
  }
  if (password.length < 6) {
    errEl.querySelector('span').textContent = 'Password minimal 6 karakter!';
    errEl.classList.remove('hidden');
    return;
  }

  // Cek apakah username bentrok dengan akun guru tetap
  if (GURU_ACCOUNTS.find(g => g.username === username)) {
    errEl.querySelector('span').textContent = 'Username sudah dipakai, coba username lain!';
    errEl.classList.remove('hidden');
    return;
  }

  const siswaList = getSiswaFromStorage();
  if (siswaList.find(u => u.username === username)) {
    errEl.querySelector('span').textContent = 'Username sudah dipakai, coba username lain!';
    errEl.classList.remove('hidden');
    return;
  }

  const newUser = {
    username,
    password,
    nama,
    role,
    avatar: nama.charAt(0).toUpperCase(),
  };

  siswaList.push(newUser);
  saveUsers(siswaList);

  sucEl.querySelector('span').textContent = `Akun siswa "${nama}" berhasil dibuat! Silakan masuk.`;
  sucEl.classList.remove('hidden');

  setTimeout(() => {
    showLogin();
    document.getElementById('loginUsername').value = username;
  }, 1800);
}

function togglePassword() {
  const inp = document.getElementById('loginPassword');
  const btn = document.querySelector('#loginPage .toggle-pass i');
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.className = 'fas fa-eye-slash';
  } else {
    inp.type = 'password';
    btn.className = 'fas fa-eye';
  }
}

function togglePasswordSignup() {
  const inp = document.getElementById('signupPassword');
  const btn = document.querySelector('#signupPage .toggle-pass i');
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.className = 'fas fa-eye-slash';
  } else {
    inp.type = 'password';
    btn.className = 'fas fa-eye';
  }
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem('kelaskuUser');
  clearCountdowns();
  document.getElementById('appPage').classList.remove('active');
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
}

// ===== INISIALISASI APLIKASI =====
function initApp() {
  loadData();
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('appPage').classList.add('active');

  // Update UI profil
  document.getElementById('sidebarName').textContent = currentUser.nama;
  document.getElementById('sidebarAvatar').textContent = currentUser.avatar;
  document.getElementById('topbarAvatar').textContent = currentUser.avatar;
  document.getElementById('sidebarRole').textContent =
    currentUser.role === 'admin' ? '👑 Admin / Guru' : '🎓 Siswa';

  // Tampilkan/sembunyikan menu admin
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = currentUser.role === 'admin' ? '' : 'none';
  });

  // Isi opsi mapel untuk filter
  const mapels = [...new Set(tugas.map(t => t.mapel))];
  const filterMapel = document.getElementById('filterMapel');
  filterMapel.innerHTML = '<option value="">Semua Mapel</option>';
  mapels.forEach(m => {
    filterMapel.innerHTML += `<option value="${m}">${m}</option>`;
  });

  // Tambah notifikasi awal
  cekDeadlineNotif();

  // Render dashboard
  navigateTo('dashboard', document.querySelector('.nav-item[data-section="dashboard"]'));
  updateNotifBadge();

  // Auto-update countdown setiap menit
  clearCountdowns();
  countdownIntervals.push(setInterval(() => {
    renderDashboard();
    renderTugasList();
  }, 60000));
}

// ===== NAVIGASI =====
function navigateTo(section, el) {
  // Update nav aktif
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  // Tampilkan section
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('section-' + section);
  if (target) target.classList.add('active');

  // Sembunyikan filter bar untuk beberapa section
  const filterBar = document.getElementById('filterBar');
  filterBar.style.display = (section === 'tugas') ? '' : 'none';

  // Render konten sesuai section
  if (section === 'dashboard') renderDashboard();
  else if (section === 'tugas') renderTugasList();
  else if (section === 'leaderboard') renderLeaderboard();
  else if (section === 'laporan') renderLaporan();
}

// ===== RENDER DASHBOARD =====
function renderDashboard() {
  const siswaList = getSiswaList();
  const tugasMy = currentUser.role === 'admin' ? tugas : tugas;

  // Greeting
  const jam = new Date().getHours();
  const greeting = jam < 12 ? 'Selamat Pagi' : jam < 15 ? 'Selamat Siang' : jam < 18 ? 'Selamat Sore' : 'Selamat Malam';
  document.getElementById('dashGreeting').textContent = `${greeting}, ${currentUser.nama.split(' ')[0]}! 👋`;
  document.getElementById('dashSub').textContent = new Date().toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});

  // Stats
  renderStats();

  // Progress siswa
  if (currentUser.role === 'siswa') {
    const prog = document.getElementById('progressSection');
    prog.classList.remove('hidden');
    const total = tugas.length;
    const done = pengumpulan.filter(p => p.siswaId === currentUser.username && p.status === 'selesai').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressText').textContent = pct + '%';
    document.getElementById('progressDesc').textContent = `${done} dari ${total} tugas telah diselesaikan`;
  }

  // Tugas urgent
  const sorted = [...tugas].sort((a,b) => new Date(a.deadline) - new Date(b.deadline));
  const urgent = sorted.filter(t => {
    const cd = getCountdown(t.deadline);
    return cd.type !== 'expired';
  }).slice(0, 5);

  const urgentEl = document.getElementById('urgentTugas');
  if (urgent.length === 0) {
    urgentEl.innerHTML = '<p style="color:var(--text-light);font-size:13px;text-align:center;padding:20px">Tidak ada tugas yang mendekati deadline 🎉</p>';
  } else {
    urgentEl.innerHTML = urgent.map(t => {
      const cd = getCountdown(t.deadline);
      const statusSiswa = getStatusTugas(t.id);
      return `
        <div class="task-mini" onclick="openModal('${t.id}')">
          <div class="task-mini-color" style="background:var(--${cd.type === 'urgent' ? 'danger' : cd.type === 'warning' ? 'warning' : 'success'})"></div>
          <div class="task-mini-info">
            <div class="task-mini-title">${t.judul}</div>
            <div class="task-mini-mapel"><span class="mapel-tag ${getMapelClass(t.mapel)}">${t.mapel}</span></div>
          </div>
          <div class="task-mini-right">
            <div class="countdown-badge ${cd.type}">${cd.text}</div>
          </div>
        </div>`;
    }).join('');
  }

  // Admin: tabel pengumpulan
  if (currentUser.role === 'admin') {
    document.getElementById('adminSubmitCard').classList.remove('hidden');
    renderAdminSubmitTable();
  }

  // Update badge
  const belumCount = currentUser.role === 'siswa'
    ? tugas.filter(t => getStatusTugas(t.id) === 'belum').length
    : 0;
  const badge = document.getElementById('tugasBadge');
  badge.textContent = belumCount;
  badge.style.display = belumCount > 0 ? '' : 'none';
}

function renderStats() {
  const statsEl = document.getElementById('statsGrid');
  const total = tugas.length;
  let stats = [];

  if (currentUser.role === 'siswa') {
    const done = pengumpulan.filter(p => p.siswaId === currentUser.username && p.status === 'selesai').length;
    const proses = pengumpulan.filter(p => p.siswaId === currentUser.username && p.status === 'proses').length;
    const belum = total - done - proses;
    const poin = hitungPoin(currentUser.username);
    stats = [
      { icon:'fa-tasks', color:'blue', num: total, label:'Total Tugas' },
      { icon:'fa-check-circle', color:'green', num: done, label:'Sudah Dikumpulkan' },
      { icon:'fa-hourglass-half', color:'yellow', num: proses, label:'Sedang Dikerjakan' },
      { icon:'fa-times-circle', color:'red', num: belum, label:'Belum Dikerjakan' },
      { icon:'fa-star', color:'purple', num: poin, label:'Total Poin' },
    ];
  } else {
    const siswaList = getSiswaList();
    const totalPengumpulan = pengumpulan.filter(p => p.status === 'selesai').length;
    const todayTugas = tugas.filter(t => {
      const d = new Date(t.deadline);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length;
    stats = [
      { icon:'fa-clipboard-list', color:'blue', num: total, label:'Total Tugas' },
      { icon:'fa-users', color:'green', num: siswaList.length, label:'Jumlah Siswa' },
      { icon:'fa-check-double', color:'purple', num: totalPengumpulan, label:'Total Pengumpulan' },
      { icon:'fa-calendar-day', color:'yellow', num: todayTugas, label:'Deadline Hari Ini' },
    ];
  }

  statsEl.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon ${s.color}"><i class="fas ${s.icon}"></i></div>
      <div class="stat-info">
        <div class="stat-num">${s.num}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    </div>`).join('');
}

function renderAdminSubmitTable() {
  const el = document.getElementById('adminSubmitTable');
  const siswaList = getSiswaList();
  const recentTugas = [...tugas].sort((a,b) => new Date(b.dibuat) - new Date(a.dibuat)).slice(0, 5);

  if (recentTugas.length === 0) {
    el.innerHTML = '<p style="color:var(--text-light);font-size:13px;text-align:center;padding:20px">Belum ada tugas</p>';
    return;
  }

  el.innerHTML = `
    <table class="submit-table">
      <thead>
        <tr>
          <th>Nama Siswa</th>
          ${recentTugas.map(t => `<th title="${t.judul}">${t.judul.slice(0,15)}${t.judul.length>15?'...':''}</th>`).join('')}
          <th>Total Poin</th>
        </tr>
      </thead>
      <tbody>
        ${siswaList.map(s => `
          <tr>
            <td><strong>${s.nama}</strong></td>
            ${recentTugas.map(t => {
              const p = pengumpulan.find(x => x.tugasId === t.id && x.siswaId === s.username);
              if (!p) return `<td><span class="status-badge belum">Belum</span></td>`;
              if (p.status === 'selesai') return `<td><span class="status-badge selesai">✓ Kumpul</span></td>`;
              return `<td><span class="status-badge proses">Proses</span></td>`;
            }).join('')}
            <td><strong style="color:var(--primary)">${hitungPoin(s.username)}</strong></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ===== RENDER TUGAS LIST =====
function renderTugasList() {
  const searchVal = document.getElementById('searchInput').value.toLowerCase();
  const mapelFilter = document.getElementById('filterMapel').value;

  let filtered = tugas.filter(t => {
    const matchSearch = t.judul.toLowerCase().includes(searchVal) || t.mapel.toLowerCase().includes(searchVal);
    const matchMapel = !mapelFilter || t.mapel === mapelFilter;
    const status = getStatusTugas(t.id);
    const matchStatus = filterStatus === 'semua' || status === filterStatus;
    return matchSearch && matchMapel && matchStatus;
  });

  const listEl = document.getElementById('tugasList');
  const emptyEl = document.getElementById('tugasEmpty');

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  listEl.innerHTML = filtered.map(t => renderTaskCard(t)).join('');
}

function renderTaskCard(t) {
  const cd = getCountdown(t.deadline);
  const status = getStatusTugas(t.id);
  const statusLabels = { belum: 'Belum Dikerjakan', proses: 'Sedang Dikerjakan', selesai: 'Sudah Dikumpulkan' };
  const colorClass = getColorClass(t.mapel);

  return `
    <div class="task-card" onclick="openModal('${t.id}')">
      <div class="task-card-color-bar ${colorClass}"></div>
      <div class="task-card-body">
        <div class="task-card-meta">
          <span class="mapel-tag ${getMapelClass(t.mapel)}">${t.mapel}</span>
          <span class="status-badge ${status}">${statusLabels[status]}</span>
        </div>
        <div class="task-card-title">${t.judul}</div>
        <div class="task-card-desc">${t.deskripsi}</div>
        <div class="task-card-footer">
          <div class="deadline-info">
            <i class="fas fa-clock"></i>
            <span class="countdown-badge ${cd.type}">${cd.text}</span>
          </div>
          <span class="poin-tag">⭐ ${t.poin} poin</span>
        </div>
      </div>
    </div>`;
}

// ===== STATUS TUGAS =====
function getStatusTugas(tugasId) {
  if (currentUser.role === 'admin') return 'selesai'; // Admin tidak perlu status personal
  const p = pengumpulan.find(x => x.tugasId === tugasId && x.siswaId === currentUser.username);
  if (!p) return 'belum';
  return p.status;
}

// ===== FILTER =====
function setFilter(status, el) {
  filterStatus = status;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderTugasList();
}

function filterTugas() {
  renderTugasList();
}

// ===== MODAL DETAIL TUGAS =====
function openModal(tugasId) {
  const t = tugas.find(x => x.id === tugasId);
  if (!t) return;
  const cd = getCountdown(t.deadline);
  const status = getStatusTugas(t.id);
  const statusLabels = { belum: 'Belum Dikerjakan', proses: 'Sedang Dikerjakan', selesai: 'Sudah Dikumpulkan' };
  const colorClass = getColorClass(t.mapel);

  // Cek apakah sudah ada pengumpulan
  const existing = pengumpulan.find(p => p.tugasId === tugasId && p.siswaId === currentUser.username);
  const isAdmin = currentUser.role === 'admin';

  // Hitung jumlah siswa yang sudah kumpul (untuk admin)
  const kumpulCount = pengumpulan.filter(p => p.tugasId === tugasId && p.status === 'selesai').length;
  const prosesCount = pengumpulan.filter(p => p.tugasId === tugasId && p.status === 'proses').length;
  const siswaTotal = getSiswaList().length;

  let submitHTML = '';
  if (!isAdmin) {
    if (status === 'selesai') {
      submitHTML = `
        <div class="modal-submit-section">
          <div class="alert alert-success"><i class="fas fa-check-circle"></i> Tugas sudah dikumpulkan pada ${formatDate(existing.waktu)}</div>
          ${existing.catatan ? `<p style="font-size:13px;color:var(--text-light)">Catatanmu: ${existing.catatan}</p>` : ''}
        </div>`;
    } else {
      submitHTML = `
        <div class="modal-submit-section">
          <h4>📤 Kumpulkan Tugas</h4>
          <div class="upload-area" id="uploadArea-${t.id}" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="dropFile(event,'${t.id}')">
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Klik untuk upload file atau drag & drop di sini</p>
            <p style="font-size:11px;margin-top:4px">PDF, Gambar, atau Dokumen</p>
            <input type="file" id="fileInput-${t.id}" onchange="fileSelected(this,'${t.id}')" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          </div>
          <div id="filePreview-${t.id}" class="upload-preview hidden"></div>
          <textarea class="catatan-input" id="catatan-${t.id}" rows="2" placeholder="Catatan tambahan (opsional)..."></textarea>
          <div class="modal-actions">
            ${status === 'belum' ? `<button class="btn-secondary" onclick="updateStatus('${t.id}','proses')"><i class="fas fa-play"></i> Tandai Sedang Dikerjakan</button>` : ''}
            <button class="btn-success" onclick="kumpulkanTugas('${t.id}')"><i class="fas fa-paper-plane"></i> Kumpulkan Tugas</button>
          </div>
        </div>`;
    }
  } else {
    // Admin: tampilkan siapa yang sudah kumpul
    const siswaList = getSiswaList();
    const rowsHTML = siswaList.map(s => {
      const p = pengumpulan.find(x => x.tugasId === tugasId && x.siswaId === s.username);
      const st = p ? p.status : 'belum';
      const stLabel = { belum: '❌ Belum', proses: '⏳ Proses', selesai: '✅ Sudah Kumpul' };
      return `
        <tr>
          <td>${s.nama}</td>
          <td><span class="status-badge ${st}">${stLabel[st]}</span></td>
          <td>${p ? formatDate(p.waktu) : '-'}</td>
          <td>${p && p.catatan ? p.catatan : '-'}</td>
        </tr>`;
    }).join('');

    submitHTML = `
      <div class="modal-submit-section">
        <h4>👥 Status Pengumpulan Siswa</h4>
        <table class="submit-table">
          <thead><tr><th>Nama</th><th>Status</th><th>Waktu</th><th>Catatan</th></tr></thead>
          <tbody>${rowsHTML}</tbody>
        </table>
        <div style="margin-top:12px">
          <button class="btn-danger" onclick="hapusTugas('${t.id}')"><i class="fas fa-trash"></i> Hapus Tugas</button>
        </div>
      </div>`;
  }

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-mapel-tag"><span class="mapel-tag ${getMapelClass(t.mapel)}">${t.mapel}</span></div>
    <div class="modal-title">${t.judul}</div>
    <div class="modal-desc">${t.deskripsi}</div>
    <div class="modal-info-grid">
      <div class="modal-info-item">
        <div class="modal-info-label">Deadline</div>
        <div class="modal-info-value">${formatDate(t.deadline)}</div>
      </div>
      <div class="modal-info-item">
        <div class="modal-info-label">Sisa Waktu</div>
        <div class="modal-info-value countdown-badge ${cd.type}" style="display:inline-block">${cd.text}</div>
      </div>
      <div class="modal-info-item">
        <div class="modal-info-label">Jenis Tugas</div>
        <div class="modal-info-value">${t.jenis === 'kelompok' ? '👥 Kelompok' : '👤 Individu'}</div>
      </div>
      <div class="modal-info-item">
        <div class="modal-info-label">Poin</div>
        <div class="modal-info-value">⭐ ${t.poin} poin</div>
      </div>
      ${isAdmin ? `
        <div class="modal-info-item">
          <div class="modal-info-label">Sudah Kumpul</div>
          <div class="modal-info-value" style="color:var(--success)">${kumpulCount} / ${siswaTotal} siswa</div>
        </div>
        <div class="modal-info-item">
          <div class="modal-info-label">Sedang Proses</div>
          <div class="modal-info-value" style="color:var(--warning)">${prosesCount} siswa</div>
        </div>` : ''}
    </div>
    ${submitHTML}`;

  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

// Klik luar modal untuk tutup
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ===== PENGUMPULAN TUGAS =====
function updateStatus(tugasId, status) {
  const existing = pengumpulan.find(p => p.tugasId === tugasId && p.siswaId === currentUser.username);
  if (existing) {
    existing.status = status;
    existing.waktu = new Date().toISOString();
  } else {
    pengumpulan.push({ tugasId, siswaId: currentUser.username, status, waktu: new Date().toISOString(), catatan: '' });
  }
  saveData();
  showToast('Status tugas diperbarui!', 'info');
  closeModal();
  renderDashboard();
  renderTugasList();
}

function kumpulkanTugas(tugasId) {
  const catatan = document.getElementById('catatan-' + tugasId)?.value || '';
  const existing = pengumpulan.find(p => p.tugasId === tugasId && p.siswaId === currentUser.username);
  const t = tugas.find(x => x.id === tugasId);

  if (existing) {
    existing.status = 'selesai';
    existing.waktu = new Date().toISOString();
    existing.catatan = catatan;
  } else {
    pengumpulan.push({ tugasId, siswaId: currentUser.username, status: 'selesai', waktu: new Date().toISOString(), catatan });
  }

  saveData();
  showToast(`🎉 Tugas "${t.judul}" berhasil dikumpulkan!`, 'success');

  // Tambah notifikasi
  addNotif({
    icon: '✅',
    text: `Tugas "${t.judul}" berhasil dikumpulkan.`,
    time: new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }),
  });

  closeModal();
  renderDashboard();
  renderTugasList();
}

// ===== FILE UPLOAD =====
function fileSelected(input, tugasId) {
  const file = input.files[0];
  if (!file) return;
  showFilePreview(tugasId, file.name);
}

function dragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('dragover');
}

function dragLeave(e) {
  e.currentTarget.classList.remove('dragover');
}

function dropFile(e, tugasId) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) showFilePreview(tugasId, file.name);
}

function showFilePreview(tugasId, fileName) {
  const el = document.getElementById('filePreview-' + tugasId);
  if (el) {
    el.classList.remove('hidden');
    el.innerHTML = `<i class="fas fa-file" style="color:var(--primary)"></i> <strong>${fileName}</strong> <span style="color:var(--success);margin-left:auto">✓ Siap diunggah</span>`;
  }
}

// ===== BUAT TUGAS (ADMIN) =====
function buatTugas() {
  const judul = document.getElementById('formJudul').value.trim();
  const mapel = document.getElementById('formMapel').value;
  const deadline = document.getElementById('formDeadline').value;
  const deskripsi = document.getElementById('formDeskripsi').value.trim();
  const jenis = document.getElementById('formJenis').value;
  const poin = parseInt(document.getElementById('formPoin').value) || 10;

  const errEl = document.getElementById('formError');
  const sucEl = document.getElementById('formSuccess');

  if (!judul || !mapel || !deadline || !deskripsi) {
    errEl.querySelector('span').textContent = 'Semua kolom wajib diisi!';
    errEl.classList.remove('hidden');
    sucEl.classList.add('hidden');
    return;
  }

  if (new Date(deadline) <= new Date()) {
    errEl.querySelector('span').textContent = 'Deadline tidak boleh di masa lalu!';
    errEl.classList.remove('hidden');
    return;
  }

  const newTugas = {
    id: 't' + Date.now(),
    judul, mapel, deskripsi, deadline, jenis, poin,
    dibuat: new Date().toISOString(),
    oleh: currentUser.username,
  };

  tugas.unshift(newTugas);
  saveData();

  errEl.classList.add('hidden');
  sucEl.querySelector('span').textContent = `Tugas "${judul}" berhasil dibuat!`;
  sucEl.classList.remove('hidden');
  showToast(`📝 Tugas "${judul}" berhasil dibuat!`, 'success');

  // Update filter mapel
  const filterMapel = document.getElementById('filterMapel');
  if (![...filterMapel.options].some(o => o.value === mapel)) {
    filterMapel.innerHTML += `<option value="${mapel}">${mapel}</option>`;
  }

  setTimeout(() => {
    sucEl.classList.add('hidden');
    resetForm();
  }, 2000);
}

function resetForm() {
  document.getElementById('formJudul').value = '';
  document.getElementById('formMapel').value = '';
  document.getElementById('formDeadline').value = '';
  document.getElementById('formDeskripsi').value = '';
  document.getElementById('formJenis').value = 'individu';
  document.getElementById('formPoin').value = '10';
  document.getElementById('formError').classList.add('hidden');
  document.getElementById('formSuccess').classList.add('hidden');
}

// ===== HAPUS TUGAS (ADMIN) =====
function hapusTugas(tugasId) {
  if (!confirm('Yakin ingin menghapus tugas ini?')) return;
  tugas = tugas.filter(t => t.id !== tugasId);
  pengumpulan = pengumpulan.filter(p => p.tugasId !== tugasId);
  saveData();
  closeModal();
  showToast('Tugas berhasil dihapus.', 'info');
  renderDashboard();
  renderTugasList();
}

// ===== LEADERBOARD =====
function renderLeaderboard() {
  const siswaList = getSiswaList();
  const ranked = siswaList.map(s => ({
    ...s,
    poin: hitungPoin(s.username),
    kumpul: pengumpulan.filter(p => p.siswaId === s.username && p.status === 'selesai').length,
  })).sort((a,b) => b.poin - a.poin);

  const el = document.getElementById('leaderboardList');
  const medals = ['🥇', '🥈', '🥉'];
  const rankClasses = ['gold', 'silver', 'bronze'];
  const gradients = ['#f59e0b,#d97706', '#94a3b8,#64748b', '#b45309,#92400e'];
  const isGuru = currentUser && currentUser.role === 'admin';

  if (ranked.length === 0) {
    el.innerHTML = '<div class="lb-empty"><i class="fas fa-users-slash"></i><p>Belum ada siswa terdaftar</p></div>';
    return;
  }

  el.innerHTML = ranked.map((s, i) => `
    <div class="leaderboard-item" style="animation-delay:${i*0.08}s">
      <div class="lb-rank ${rankClasses[i] || ''}">${i < 3 ? medals[i] : '#' + (i+1)}</div>
      <div class="lb-avatar" style="background:linear-gradient(135deg,${gradients[i] || randomGradient(s.username)})">${s.avatar}</div>
      <div class="lb-info">
        <div class="lb-name">${s.nama}</div>
        <div class="lb-detail"><span class="lb-username">@${s.username}</span> · ${s.kumpul} tugas dikumpulkan</div>
      </div>
      <div class="lb-right">
        <div class="lb-poin">
          <div class="lb-poin-num">${s.poin}</div>
          <div class="lb-poin-label">poin</div>
        </div>
        ${isGuru ? `<button class="btn-kick" onclick="konfirmasiKick('${s.username}','${s.nama.replace(/'/g, "\'")}')">
          <i class="fas fa-user-times"></i> Kick
        </button>` : ''}
      </div>
    </div>`).join('');
}

// ===== KICK SISWA =====
function konfirmasiKick(username, nama) {
  document.getElementById('kickNama').textContent = nama;
  document.getElementById('kickUsername').textContent = '@' + username;
  document.getElementById('kickTargetUsername').value = username;
  document.getElementById('kickModal').classList.remove('hidden');
}

function tutupKickModal() {
  document.getElementById('kickModal').classList.add('hidden');
}

function eksekusiKick() {
  const username = document.getElementById('kickTargetUsername').value;
  const siswaList = getSiswaFromStorage();
  const siswa = siswaList.find(s => s.username === username);
  if (!siswa) return;

  // Hapus akun dari daftar siswa
  const updatedList = siswaList.filter(s => s.username !== username);
  saveUsers(updatedList);

  // Hapus semua data pengumpulan siswa tersebut
  pengumpulan = pengumpulan.filter(p => p.siswaId !== username);
  saveData();

  tutupKickModal();
  showToast(`🚫 Akun @${username} (${siswa.nama}) telah dihapus dari kelas.`, 'warning');
  renderLeaderboard();
  renderDashboard();
}

function hitungPoin(siswaId) {
  return pengumpulan
    .filter(p => p.siswaId === siswaId && p.status === 'selesai')
    .reduce((sum, p) => {
      const t = tugas.find(x => x.id === p.tugasId);
      return sum + (t ? t.poin : 0);
    }, 0);
}

// ===== LAPORAN (ADMIN) =====
function renderLaporan() {
  const el = document.getElementById('laporanContent');
  const siswaList = getSiswaList();

  const laporanHTML = tugas.map(t => {
    const kumpul = pengumpulan.filter(p => p.tugasId === t.id && p.status === 'selesai').length;
    const proses = pengumpulan.filter(p => p.tugasId === t.id && p.status === 'proses').length;
    const belum = siswaList.length - kumpul - proses;
    const pctKumpul = Math.round((kumpul / siswaList.length) * 100);
    const pctProses = Math.round((proses / siswaList.length) * 100);
    const pctBelum = Math.round((belum / siswaList.length) * 100);
    return `
      <div class="laporan-tugas-item">
        <div class="laporan-tugas-title">${t.judul}</div>
        <div class="laporan-tugas-mapel"><span class="mapel-tag ${getMapelClass(t.mapel)}">${t.mapel}</span> • Deadline: ${formatDate(t.deadline)}</div>
        <div class="laporan-bar">
          <div class="laporan-bar-label"><span>✅ Sudah kumpul: ${kumpul}</span><span>${pctKumpul}%</span></div>
          <div class="laporan-bar-bg"><div class="laporan-bar-fill green" style="width:${pctKumpul}%"></div></div>
        </div>
        <div class="laporan-bar">
          <div class="laporan-bar-label"><span>⏳ Sedang proses: ${proses}</span><span>${pctProses}%</span></div>
          <div class="laporan-bar-bg"><div class="laporan-bar-fill yellow" style="width:${pctProses}%"></div></div>
        </div>
        <div class="laporan-bar">
          <div class="laporan-bar-label"><span>❌ Belum: ${belum}</span><span>${pctBelum}%</span></div>
          <div class="laporan-bar-bg"><div class="laporan-bar-fill red" style="width:${pctBelum}%"></div></div>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `<div class="laporan-grid">${laporanHTML}</div>`;
}

// ===== NOTIFIKASI =====
function addNotif(notif) {
  notifikasi.unshift({ ...notif, id: Date.now() });
  if (notifikasi.length > 20) notifikasi.pop();
  saveData();
  updateNotifBadge();
}

function cekDeadlineNotif() {
  tugas.forEach(t => {
    const cd = getCountdown(t.deadline);
    if (cd.type === 'urgent') {
      addNotif({
        icon: '🚨',
        text: `Deadline mendekat! "${t.judul}" — ${cd.text}`,
        time: 'Baru saja',
      });
    }
  });
}

function updateNotifBadge() {
  const dot = document.getElementById('notifDot');
  dot.classList.toggle('show', notifikasi.length > 0);
}

function toggleNotif() {
  const panel = document.getElementById('notifPanel');
  const isHidden = panel.classList.toggle('hidden');
  if (!isHidden) renderNotifList();
}

function renderNotifList() {
  const el = document.getElementById('notifList');
  if (notifikasi.length === 0) {
    el.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash" style="display:block;font-size:28px;margin-bottom:8px;opacity:0.3"></i>Tidak ada notifikasi</div>';
    return;
  }
  el.innerHTML = notifikasi.slice(0, 10).map(n => `
    <div class="notif-item">
      <div class="notif-icon">${n.icon}</div>
      <div>
        <div class="notif-text">${n.text}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>`).join('');
}

function clearNotif() {
  notifikasi = [];
  saveData();
  updateNotifBadge();
  renderNotifList();
  document.getElementById('notifDot').classList.remove('show');
}

// Tutup notif panel jika klik di luar
document.addEventListener('click', function(e) {
  const panel = document.getElementById('notifPanel');
  const btn = document.getElementById('notifBtn');
  if (!panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.add('hidden');
  }
});

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ===== AI CHATBOT =====
function toggleChat() {
  const box = document.getElementById('chatbotBox');
  box.classList.toggle('hidden');
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;

  addChatMsg(msg, 'user');
  input.value = '';

  setTimeout(() => {
    const reply = generateAIReply(msg.toLowerCase());
    addChatMsg(reply, 'bot');
  }, 600);
}

function addChatMsg(text, role) {
  const el = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<div class="chat-bubble">${text}</div>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function generateAIReply(msg) {
  const today = new Date();

  // Cek tugas hari ini
  if (msg.includes('hari ini') || msg.includes('tugas apa')) {
    const todayTugas = tugas.filter(t => {
      const dl = new Date(t.deadline);
      return dl.toDateString() === today.toDateString();
    });
    if (todayTugas.length === 0) return 'Tidak ada tugas dengan deadline hari ini. Santai dulu! 😊';
    return `Tugas deadline hari ini:<br>${todayTugas.map(t => `• ${t.judul} (${t.mapel})`).join('<br>')}`;
  }

  // Cek belum selesai (siswa)
  if (msg.includes('belum selesai') || msg.includes('belum dikerjakan') || msg.includes('tugas belum')) {
    if (currentUser.role === 'siswa') {
      const belum = tugas.filter(t => getStatusTugas(t.id) === 'belum');
      if (belum.length === 0) return 'Wah, semua tugasmu sudah dikerjakan! 🎉 Keren banget!';
      return `Kamu masih punya ${belum.length} tugas yang belum dikerjakan:<br>${belum.map(t => `• ${t.judul}`).join('<br>')}`;
    }
  }

  // Cek siapa belum kumpul (admin)
  if (msg.includes('belum kumpul') || msg.includes('siapa yang belum')) {
    if (currentUser.role === 'admin') {
      const siswaList = getSiswaList();
      const belumList = siswaList.filter(s =>
        tugas.some(t => !pengumpulan.find(p => p.siswaId === s.username && p.tugasId === t.id && p.status === 'selesai'))
      );
      if (belumList.length === 0) return 'Semua siswa sudah mengumpulkan tugas! 🎉';
      return `Siswa yang masih ada tugas belum dikumpulkan:<br>${belumList.map(s => `• ${s.nama}`).join('<br>')}`;
    }
    return 'Fitur ini hanya tersedia untuk admin/guru.';
  }

  // Total tugas
  if (msg.includes('berapa tugas') || msg.includes('total tugas')) {
    return `Total tugas saat ini ada <strong>${tugas.length} tugas</strong>. 📚`;
  }

  // Poin
  if (msg.includes('poin') || msg.includes('nilai')) {
    if (currentUser.role === 'siswa') {
      const p = hitungPoin(currentUser.username);
      return `Poinmu saat ini: <strong>${p} poin</strong> ⭐<br>Terus semangat mengumpulkan tugas!`;
    }
  }

  // Deadline terdekat
  if (msg.includes('deadline') || msg.includes('kapan') || msg.includes('terdekat')) {
    const sorted = [...tugas].filter(t => getCountdown(t.deadline).type !== 'expired')
      .sort((a,b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 3);
    if (sorted.length === 0) return 'Tidak ada tugas yang aktif saat ini.';
    return `Deadline terdekat:<br>${sorted.map(t => `• ${t.judul} — ${getCountdown(t.deadline).text}`).join('<br>')}`;
  }

  // Salam
  if (msg.includes('halo') || msg.includes('hai') || msg.includes('hello')) {
    return `Halo, ${currentUser.nama.split(' ')[0]}! 👋 Ada yang bisa saya bantu?`;
  }

  // Default
  return `Maaf, saya belum bisa menjawab pertanyaan itu. 😅<br><br>Coba tanya:<br>• "Tugas apa hari ini?"<br>• "Berapa tugas yang belum selesai?"<br>• "Siapa yang belum kumpul?" (admin)<br>• "Deadline terdekat apa?"`;
}

// ===== SIDEBAR TOGGLE =====
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

// ===== COUNTDOWN INTERVALS =====
function clearCountdowns() {
  countdownIntervals.forEach(id => clearInterval(id));
  countdownIntervals = [];
}

// ===== AUTO LOGIN (jika sudah login sebelumnya) =====
window.addEventListener('DOMContentLoaded', () => {
  // Bersihkan data dummy lama jika ada
  const oldTugas = localStorage.getItem('kelaskuTugas');
  if (oldTugas) {
    try {
      const parsed = JSON.parse(oldTugas);
      // Cek apakah ini data dummy lama (id t1-t5)
      const hasDummy = parsed.some(t => ['t1','t2','t3','t4','t5'].includes(t.id));
      if (hasDummy) {
        localStorage.removeItem('kelaskuTugas');
        localStorage.removeItem('kelaskuPengumpulan');
        localStorage.removeItem('kelaskuUsers');
        localStorage.removeItem('kelaskuNotif');
      }
    } catch(e) {}
  }

  const savedUser = localStorage.getItem('kelaskuUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    // Verifikasi user masih ada di database
    const users = getUsers();
    const stillExists = users.find(u => u.username === currentUser.username);
    if (stillExists) {
      currentUser = stillExists; // Refresh data user
      initApp();
    } else {
      localStorage.removeItem('kelaskuUser');
    }
  }
});

// ===== REAL-TIME SYNC (multi-tab) =====
window.addEventListener('storage', (e) => {
  if (!currentUser) return;
  // Sinkronisasi data saat tab lain melakukan perubahan
  if (e.key === 'kelaskuSync') {
    const savedTugas = localStorage.getItem('kelaskuTugas');
    const savedPengumpulan = localStorage.getItem('kelaskuPengumpulan');
    tugas = savedTugas ? JSON.parse(savedTugas) : [];
    pengumpulan = savedPengumpulan ? JSON.parse(savedPengumpulan) : [];
    renderDashboard();
    renderTugasList();
    if (document.getElementById('section-leaderboard').classList.contains('active')) renderLeaderboard();
    if (document.getElementById('section-laporan').classList.contains('active')) renderLaporan();
    showToast('Data diperbarui secara real-time 🔄', 'info');
    // Di dalam fungsi buatTugas()
// ... setelah membuat objek newTugas
socket.emit('createTask', newTugas); // Kirim ke server
resetForm();

// Di dalam fungsi kumpulkanTugas()
// ... setelah membuat objek submission
socket.emit('submitTask', { tugasId, siswaId: currentUser.username, status: 'selesai', waktu: new Date().toISOString(), catatan });
  }
});
