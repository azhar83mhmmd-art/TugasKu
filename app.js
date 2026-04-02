/* ===================================================
   KelasKu — Manajemen Tugas Kelas
   Client JS — Socket.io + REST API
   =================================================== */

// ===== KONEKSI SOCKET.IO =====
const socket = io();

// ===== STATE APLIKASI =====
let currentUser  = null;
let tugas        = [];
let pengumpulan  = [];
let siswaList    = [];
let notifikasi   = [];
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
  return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})
       + ' ' + d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
}
function getCountdown(deadlineISO) {
  const diff = new Date(deadlineISO) - new Date();
  if (diff <= 0) return { text:'Kadaluarsa', type:'expired' };
  const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000);
  if (h < 24) return { text: h > 0 ? `${h}j ${m}m lagi` : `${m}m lagi`, type: h < 6 ? 'urgent' : 'warning' };
  const hari = Math.floor(h/24);
  return { text:`${hari} hari lagi`, type: hari <= 2 ? 'warning' : 'normal' };
}
function getMapelClass(m)  { return 'mapel-' + m.replace(/\s/g,''); }
function getColorClass(m)  { return 'color-' + (m ? m.replace(/\s/g,'') : 'default'); }
function randomGradient(s) {
  const g=['#4f46e5,#7c3aed','#0ea5e9,#2563eb','#10b981,#059669','#f59e0b,#d97706','#ef4444,#dc2626','#ec4899,#db2777','#8b5cf6,#7c3aed','#06b6d4,#0891b2'];
  return g[s.charCodeAt(0)%g.length];
}
function getSiswaList() { return siswaList; }

// ===== API HELPER =====
async function api(method, path, body) {
  try {
    const res = await fetch(path, {
      method,
      headers:{'Content-Type':'application/json'},
      body: body ? JSON.stringify(body) : undefined
    });
    return await res.json();
  } catch(e) { return { error:'Tidak bisa terhubung ke server.' }; }
}

// ===== SOCKET.IO EVENTS =====
socket.on('connect', () => showConnectionStatus(true));
socket.on('disconnect', () => showConnectionStatus(false));

socket.on('init_data', (data) => {
  siswaList   = data.users        || [];
  tugas       = data.tugas        || [];
  pengumpulan = data.pengumpulan  || [];
  if (currentUser) refreshUI();
});

socket.on('tugas_updated', (data) => {
  tugas = data;
  if (!currentUser) return;
  updateFilterMapel();
  refreshUI();
  showToast('📋 Daftar tugas diperbarui!', 'info');
});

socket.on('pengumpulan_updated', (data) => {
  pengumpulan = data;
  if (!currentUser) return;
  refreshUI();
  if (currentUser.role === 'admin') showToast('📤 Ada siswa yang mengumpulkan tugas!', 'info');
});

socket.on('users_updated', (data) => {
  siswaList = data;
  if (!currentUser) return;
  if (document.getElementById('section-leaderboard').classList.contains('active')) renderLeaderboard();
  if (document.getElementById('section-laporan').classList.contains('active'))     renderLaporan();
  renderAdminSubmitTable();
  renderStats();
});

socket.on('user_kicked', ({ username }) => {
  if (currentUser && currentUser.username === username) {
    showToast('⛔ Akunmu telah dihapus oleh guru.', 'error');
    setTimeout(() => {
      currentUser = null;
      sessionStorage.removeItem('kelaskuUser');
      clearCountdowns();
      document.getElementById('appPage').classList.remove('active');
      document.getElementById('loginPage').classList.add('active');
      document.getElementById('loginUsername').value = '';
      document.getElementById('loginPassword').value = '';
    }, 2000);
  }
});

function refreshUI() {
  const active = document.querySelector('.section.active');
  const sec    = active ? active.id.replace('section-','') : 'dashboard';
  if (sec === 'dashboard')   renderDashboard();
  if (sec === 'tugas')       renderTugasList();
  if (sec === 'leaderboard') renderLeaderboard();
  if (sec === 'laporan')     renderLaporan();
}

function showConnectionStatus(online) {
  let bar = document.getElementById('connBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'connBar';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;text-align:center;font-size:12px;font-weight:600;padding:5px;transition:all .3s';
    document.body.prepend(bar);
  }
  if (online) {
    bar.style.display = 'none';
  } else {
    bar.style.cssText += ';background:#fee2e2;color:#991b1b;display:block';
    bar.textContent = '⚠️ Koneksi ke server terputus — mencoba menyambung kembali...';
  }
}

// ===== LOGIN / LOGOUT =====
async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!username || !password) { showLoginError('Username dan password wajib diisi!'); return; }

  const btn = document.querySelector('#loginPage .btn-primary');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Masuk...';

  const result = await api('POST', '/api/login', { username, password });
  btn.disabled = false;
  btn.innerHTML = '<span>Masuk</span> <i class="fas fa-arrow-right"></i>';

  if (result.error) { showLoginError(result.error); return; }

  currentUser = result.user;
  sessionStorage.setItem('kelaskuUser', JSON.stringify(currentUser));
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
  ['signupNama','signupUsername','signupPassword'].forEach(id => document.getElementById(id).value = '');
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

async function handleSignup() {
  const nama     = document.getElementById('signupNama').value.trim();
  const username = document.getElementById('signupUsername').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  const errEl    = document.getElementById('signupError');
  const sucEl    = document.getElementById('signupSuccess');
  errEl.classList.add('hidden'); sucEl.classList.add('hidden');

  if (!nama || !username || !password) { errEl.querySelector('span').textContent='Semua kolom wajib diisi!'; errEl.classList.remove('hidden'); return; }
  if (username.length < 3)  { errEl.querySelector('span').textContent='Username minimal 3 karakter!'; errEl.classList.remove('hidden'); return; }
  if (password.length < 6)  { errEl.querySelector('span').textContent='Password minimal 6 karakter!'; errEl.classList.remove('hidden'); return; }

  const btn = document.querySelector('#signupPage .btn-primary');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mendaftar...';

  const result = await api('POST', '/api/signup', { nama, username, password });
  btn.disabled = false;
  btn.innerHTML = '<span>Daftar sebagai Siswa</span> <i class="fas fa-user-plus"></i>';

  if (result.error) { errEl.querySelector('span').textContent=result.error; errEl.classList.remove('hidden'); return; }

  sucEl.querySelector('span').textContent = result.message;
  sucEl.classList.remove('hidden');
  setTimeout(() => { showLogin(); document.getElementById('loginUsername').value = username; }, 1800);
}

function togglePassword() {
  const inp = document.getElementById('loginPassword');
  const btn = document.querySelector('#loginPage .toggle-pass i');
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.className = inp.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}
function togglePasswordSignup() {
  const inp = document.getElementById('signupPassword');
  const btn = document.querySelector('#signupPage .toggle-pass i');
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.className = inp.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}

function handleLogout() {
  currentUser = null;
  sessionStorage.removeItem('kelaskuUser');
  clearCountdowns();
  document.getElementById('appPage').classList.remove('active');
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
}

// ===== INISIALISASI =====
function initApp() {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('signupPage').classList.remove('active');
  document.getElementById('appPage').classList.add('active');

  document.getElementById('sidebarName').textContent   = currentUser.nama;
  document.getElementById('sidebarAvatar').textContent = currentUser.avatar;
  document.getElementById('topbarAvatar').textContent  = currentUser.avatar;
  document.getElementById('sidebarRole').textContent   = currentUser.role === 'admin' ? '👑 Admin / Guru' : '🎓 Siswa';

  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = currentUser.role === 'admin' ? '' : 'none';
  });

  updateFilterMapel();
  cekDeadlineNotif();
  navigateTo('dashboard', document.querySelector('.nav-item[data-section="dashboard"]'));
  updateNotifBadge();

  clearCountdowns();
  countdownIntervals.push(setInterval(() => { renderDashboard(); renderTugasList(); }, 60000));
}

function updateFilterMapel() {
  const mapels = [...new Set(tugas.map(t => t.mapel))];
  const el = document.getElementById('filterMapel');
  if (!el) return;
  const cur = el.value;
  el.innerHTML = '<option value="">Semua Mapel</option>';
  mapels.forEach(m => el.innerHTML += `<option value="${m}"${m===cur?' selected':''}>${m}</option>`);
}

// ===== NAVIGASI =====
function navigateTo(section, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('section-' + section);
  if (target) target.classList.add('active');
  document.getElementById('filterBar').style.display = section === 'tugas' ? '' : 'none';
  if (section === 'dashboard')   renderDashboard();
  else if (section === 'tugas')  renderTugasList();
  else if (section === 'leaderboard') renderLeaderboard();
  else if (section === 'laporan') renderLaporan();
}

// ===== DASHBOARD =====
function renderDashboard() {
  if (!currentUser) return;
  const jam = new Date().getHours();
  const greeting = jam<12?'Selamat Pagi':jam<15?'Selamat Siang':jam<18?'Selamat Sore':'Selamat Malam';
  document.getElementById('dashGreeting').textContent = `${greeting}, ${currentUser.nama.split(' ')[0]}! 👋`;
  document.getElementById('dashSub').textContent = new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  renderStats();

  if (currentUser.role === 'siswa') {
    const prog = document.getElementById('progressSection');
    prog.classList.remove('hidden');
    const total = tugas.length;
    const done  = pengumpulan.filter(p => p.siswaId===currentUser.username && p.status==='selesai').length;
    const pct   = total > 0 ? Math.round((done/total)*100) : 0;
    document.getElementById('progressFill').style.width = pct+'%';
    document.getElementById('progressText').textContent = pct+'%';
    document.getElementById('progressDesc').textContent = `${done} dari ${total} tugas telah diselesaikan`;
  }

  const urgent = [...tugas].sort((a,b)=>new Date(a.deadline)-new Date(b.deadline))
    .filter(t=>getCountdown(t.deadline).type!=='expired').slice(0,5);
  const urgentEl = document.getElementById('urgentTugas');
  if (urgent.length === 0) {
    urgentEl.innerHTML = '<p style="color:var(--text-light);font-size:13px;text-align:center;padding:20px">Tidak ada tugas yang mendekati deadline 🎉</p>';
  } else {
    urgentEl.innerHTML = urgent.map(t => {
      const cd = getCountdown(t.deadline);
      return `<div class="task-mini" onclick="openModal('${t.id}')">
        <div class="task-mini-color" style="background:var(--${cd.type==='urgent'?'danger':cd.type==='warning'?'warning':'success'})"></div>
        <div class="task-mini-info">
          <div class="task-mini-title">${t.judul}</div>
          <div class="task-mini-mapel"><span class="mapel-tag ${getMapelClass(t.mapel)}">${t.mapel}</span></div>
        </div>
        <div class="task-mini-right"><div class="countdown-badge ${cd.type}">${cd.text}</div></div>
      </div>`;
    }).join('');
  }

  if (currentUser.role === 'admin') {
    document.getElementById('adminSubmitCard').classList.remove('hidden');
    renderAdminSubmitTable();
  }

  const belumCount = currentUser.role === 'siswa' ? tugas.filter(t=>getStatusTugas(t.id)==='belum').length : 0;
  const badge = document.getElementById('tugasBadge');
  badge.textContent = belumCount;
  badge.style.display = belumCount > 0 ? '' : 'none';
}

function renderStats() {
  if (!currentUser) return;
  const statsEl = document.getElementById('statsGrid');
  const total = tugas.length;
  let stats = [];
  if (currentUser.role === 'siswa') {
    const done   = pengumpulan.filter(p=>p.siswaId===currentUser.username&&p.status==='selesai').length;
    const proses = pengumpulan.filter(p=>p.siswaId===currentUser.username&&p.status==='proses').length;
    stats = [
      {icon:'fa-tasks',color:'blue',num:total,label:'Total Tugas'},
      {icon:'fa-check-circle',color:'green',num:done,label:'Sudah Dikumpulkan'},
      {icon:'fa-hourglass-half',color:'yellow',num:proses,label:'Sedang Dikerjakan'},
      {icon:'fa-times-circle',color:'red',num:Math.max(0,total-done-proses),label:'Belum Dikerjakan'},
      {icon:'fa-star',color:'purple',num:hitungPoin(currentUser.username),label:'Total Poin'},
    ];
  } else {
    const todayTugas = tugas.filter(t=>new Date(t.deadline).toDateString()===new Date().toDateString()).length;
    stats = [
      {icon:'fa-clipboard-list',color:'blue',num:total,label:'Total Tugas'},
      {icon:'fa-users',color:'green',num:siswaList.length,label:'Jumlah Siswa'},
      {icon:'fa-check-double',color:'purple',num:pengumpulan.filter(p=>p.status==='selesai').length,label:'Total Pengumpulan'},
      {icon:'fa-calendar-day',color:'yellow',num:todayTugas,label:'Deadline Hari Ini'},
    ];
  }
  statsEl.innerHTML = stats.map(s=>`
    <div class="stat-card">
      <div class="stat-icon ${s.color}"><i class="fas ${s.icon}"></i></div>
      <div class="stat-info"><div class="stat-num">${s.num}</div><div class="stat-label">${s.label}</div></div>
    </div>`).join('');
}

function renderAdminSubmitTable() {
  const el = document.getElementById('adminSubmitTable');
  if (!el) return;
  const recentTugas = [...tugas].sort((a,b)=>new Date(b.dibuat)-new Date(a.dibuat)).slice(0,5);
  if (recentTugas.length === 0) { el.innerHTML='<p style="color:var(--text-light);font-size:13px;text-align:center;padding:20px">Belum ada tugas</p>'; return; }
  el.innerHTML = `<table class="submit-table">
    <thead><tr><th>Nama Siswa</th>${recentTugas.map(t=>`<th title="${t.judul}">${t.judul.slice(0,15)}${t.judul.length>15?'...':''}</th>`).join('')}<th>Total Poin</th></tr></thead>
    <tbody>${siswaList.map(s=>`
      <tr><td><strong>${s.nama}</strong></td>
        ${recentTugas.map(t=>{
          const p=pengumpulan.find(x=>x.tugasId===t.id&&x.siswaId===s.username);
          if(!p) return '<td><span class="status-badge belum">Belum</span></td>';
          if(p.status==='selesai') return '<td><span class="status-badge selesai">✓ Kumpul</span></td>';
          return '<td><span class="status-badge proses">Proses</span></td>';
        }).join('')}
        <td><strong style="color:var(--primary)">${hitungPoin(s.username)}</strong></td>
      </tr>`).join('')}
    </tbody></table>`;
}

// ===== TUGAS LIST =====
function renderTugasList() {
  const searchVal   = document.getElementById('searchInput').value.toLowerCase();
  const mapelFilter = document.getElementById('filterMapel').value;
  const filtered = tugas.filter(t => {
    const matchSearch = t.judul.toLowerCase().includes(searchVal)||t.mapel.toLowerCase().includes(searchVal);
    const matchMapel  = !mapelFilter || t.mapel === mapelFilter;
    const matchStatus = filterStatus === 'semua' || getStatusTugas(t.id) === filterStatus;
    return matchSearch && matchMapel && matchStatus;
  });
  const listEl  = document.getElementById('tugasList');
  const emptyEl = document.getElementById('tugasEmpty');
  if (filtered.length === 0) { listEl.innerHTML=''; emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');
  listEl.innerHTML = filtered.map(t => {
    const cd = getCountdown(t.deadline), status = getStatusTugas(t.id);
    const statusLabels = {belum:'Belum Dikerjakan',proses:'Sedang Dikerjakan',selesai:'Sudah Dikumpulkan'};
    return `<div class="task-card" onclick="openModal('${t.id}')">
      <div class="task-card-color-bar ${getColorClass(t.mapel)}"></div>
      <div class="task-card-body">
        <div class="task-card-meta">
          <span class="mapel-tag ${getMapelClass(t.mapel)}">${t.mapel}</span>
          <span class="status-badge ${status}">${statusLabels[status]}</span>
        </div>
        <div class="task-card-title">${t.judul}</div>
        <div class="task-card-desc">${t.deskripsi}</div>
        <div class="task-card-footer">
          <div class="deadline-info"><i class="fas fa-clock"></i><span class="countdown-badge ${cd.type}">${cd.text}</span></div>
          <span class="poin-tag">⭐ ${t.poin} poin</span>
        </div>
      </div></div>`;
  }).join('');
}

function getStatusTugas(tugasId) {
  if (currentUser.role === 'admin') return 'selesai';
  const p = pengumpulan.find(x=>x.tugasId===tugasId&&x.siswaId===currentUser.username);
  return p ? p.status : 'belum';
}
function setFilter(status, el) {
  filterStatus = status;
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  renderTugasList();
}
function filterTugas() { renderTugasList(); }

// ===== MODAL =====
function openModal(tugasId) {
  const t = tugas.find(x=>x.id===tugasId); if (!t) return;
  const cd = getCountdown(t.deadline), status = getStatusTugas(t.id);
  const existing  = pengumpulan.find(p=>p.tugasId===tugasId&&p.siswaId===currentUser.username);
  const isAdmin   = currentUser.role === 'admin';
  const kumpulCount = pengumpulan.filter(p=>p.tugasId===tugasId&&p.status==='selesai').length;
  const prosesCount = pengumpulan.filter(p=>p.tugasId===tugasId&&p.status==='proses').length;

  let submitHTML = '';
  if (!isAdmin) {
    if (status === 'selesai') {
      submitHTML = `<div class="modal-submit-section">
        <div class="alert alert-success"><i class="fas fa-check-circle"></i> Tugas sudah dikumpulkan pada ${formatDate(existing.waktu)}</div>
        ${existing.catatan?`<p style="font-size:13px;color:var(--text-light)">Catatanmu: ${existing.catatan}</p>`:''}
      </div>`;
    } else {
      submitHTML = `<div class="modal-submit-section">
        <h4>📤 Kumpulkan Tugas</h4>
        <div class="upload-area" id="uploadArea-${t.id}" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="dropFile(event,'${t.id}')">
          <i class="fas fa-cloud-upload-alt"></i><p>Klik untuk upload file atau drag & drop</p>
          <input type="file" id="fileInput-${t.id}" onchange="fileSelected(this,'${t.id}')" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"/>
        </div>
        <div id="filePreview-${t.id}" class="upload-preview hidden"></div>
        <textarea class="catatan-input" id="catatan-${t.id}" rows="2" placeholder="Catatan tambahan (opsional)..."></textarea>
        <div class="modal-actions">
          ${status==='belum'?`<button class="btn-secondary" onclick="updateStatus('${t.id}','proses')"><i class="fas fa-play"></i> Tandai Sedang Dikerjakan</button>`:''}
          <button class="btn-success" onclick="kumpulkanTugas('${t.id}')"><i class="fas fa-paper-plane"></i> Kumpulkan Tugas</button>
        </div>
      </div>`;
    }
  } else {
    const rowsHTML = siswaList.map(s=>{
      const p=pengumpulan.find(x=>x.tugasId===tugasId&&x.siswaId===s.username);
      const st=p?p.status:'belum';
      return `<tr><td>${s.nama}</td><td><span class="status-badge ${st}">${{belum:'❌ Belum',proses:'⏳ Proses',selesai:'✅ Sudah Kumpul'}[st]}</span></td><td>${p?formatDate(p.waktu):'-'}</td><td>${p&&p.catatan?p.catatan:'-'}</td></tr>`;
    }).join('');
    submitHTML = `<div class="modal-submit-section">
      <h4>👥 Status Pengumpulan Siswa</h4>
      <table class="submit-table"><thead><tr><th>Nama</th><th>Status</th><th>Waktu</th><th>Catatan</th></tr></thead><tbody>${rowsHTML}</tbody></table>
      <div style="margin-top:12px"><button class="btn-danger" onclick="hapusTugas('${t.id}')"><i class="fas fa-trash"></i> Hapus Tugas</button></div>
    </div>`;
  }

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-mapel-tag"><span class="mapel-tag ${getMapelClass(t.mapel)}">${t.mapel}</span></div>
    <div class="modal-title">${t.judul}</div>
    <div class="modal-desc">${t.deskripsi}</div>
    <div class="modal-info-grid">
      <div class="modal-info-item"><div class="modal-info-label">Deadline</div><div class="modal-info-value">${formatDate(t.deadline)}</div></div>
      <div class="modal-info-item"><div class="modal-info-label">Sisa Waktu</div><div class="modal-info-value countdown-badge ${cd.type}" style="display:inline-block">${cd.text}</div></div>
      <div class="modal-info-item"><div class="modal-info-label">Jenis</div><div class="modal-info-value">${t.jenis==='kelompok'?'👥 Kelompok':'👤 Individu'}</div></div>
      <div class="modal-info-item"><div class="modal-info-label">Poin</div><div class="modal-info-value">⭐ ${t.poin} poin</div></div>
      ${isAdmin?`<div class="modal-info-item"><div class="modal-info-label">Sudah Kumpul</div><div class="modal-info-value" style="color:var(--success)">${kumpulCount}/${siswaList.length} siswa</div></div>
      <div class="modal-info-item"><div class="modal-info-label">Sedang Proses</div><div class="modal-info-value" style="color:var(--warning)">${prosesCount} siswa</div></div>`:''}
    </div>
    ${submitHTML}`;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }
document.getElementById('modalOverlay').addEventListener('click', function(e) { if(e.target===this) closeModal(); });

// ===== PENGUMPULAN =====
async function updateStatus(tugasId, status) {
  const r = await api('POST','/api/pengumpulan',{tugasId,siswaId:currentUser.username,status,catatan:''});
  if (r.error) { showToast(r.error,'error'); return; }
  showToast('Status tugas diperbarui!','info');
  closeModal();
}

async function kumpulkanTugas(tugasId) {
  const catatan = document.getElementById('catatan-'+tugasId)?.value || '';
  const t = tugas.find(x=>x.id===tugasId);
  const r = await api('POST','/api/pengumpulan',{tugasId,siswaId:currentUser.username,status:'selesai',catatan});
  if (r.error) { showToast(r.error,'error'); return; }
  showToast(`🎉 Tugas "${t.judul}" berhasil dikumpulkan!`,'success');
  addNotif({icon:'✅',text:`Tugas "${t.judul}" berhasil dikumpulkan.`,time:new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})});
  closeModal();
}

function fileSelected(input, tugasId) { if(input.files[0]) showFilePreview(tugasId,input.files[0].name); }
function dragOver(e)  { e.preventDefault(); e.currentTarget.classList.add('dragover'); }
function dragLeave(e) { e.currentTarget.classList.remove('dragover'); }
function dropFile(e, tugasId) { e.preventDefault(); e.currentTarget.classList.remove('dragover'); if(e.dataTransfer.files[0]) showFilePreview(tugasId,e.dataTransfer.files[0].name); }
function showFilePreview(tugasId, fileName) {
  const el = document.getElementById('filePreview-'+tugasId);
  if (el) { el.classList.remove('hidden'); el.innerHTML=`<i class="fas fa-file" style="color:var(--primary)"></i> <strong>${fileName}</strong> <span style="color:var(--success);margin-left:auto">✓ Siap diunggah</span>`; }
}

// ===== BUAT TUGAS =====
async function buatTugas() {
  const judul    = document.getElementById('formJudul').value.trim();
  const mapel    = document.getElementById('formMapel').value;
  const deadline = document.getElementById('formDeadline').value;
  const deskripsi= document.getElementById('formDeskripsi').value.trim();
  const jenis    = document.getElementById('formJenis').value;
  const poin     = parseInt(document.getElementById('formPoin').value)||10;
  const errEl    = document.getElementById('formError');
  const sucEl    = document.getElementById('formSuccess');

  if (!judul||!mapel||!deadline||!deskripsi) { errEl.querySelector('span').textContent='Semua kolom wajib diisi!'; errEl.classList.remove('hidden'); sucEl.classList.add('hidden'); return; }
  if (new Date(deadline)<=new Date()) { errEl.querySelector('span').textContent='Deadline tidak boleh di masa lalu!'; errEl.classList.remove('hidden'); return; }

  const r = await api('POST','/api/tugas',{id:'t'+Date.now(),judul,mapel,deskripsi,deadline:new Date(deadline).toISOString(),jenis,poin,dibuat:new Date().toISOString(),oleh:currentUser.username});
  if (r.error) { errEl.querySelector('span').textContent=r.error; errEl.classList.remove('hidden'); return; }

  errEl.classList.add('hidden');
  sucEl.querySelector('span').textContent=`Tugas "${judul}" berhasil dibuat!`;
  sucEl.classList.remove('hidden');
  showToast(`📝 Tugas "${judul}" berhasil dibuat!`,'success');
  setTimeout(() => { sucEl.classList.add('hidden'); resetForm(); }, 2000);
}

function resetForm() {
  ['formJudul','formDeskripsi'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('formMapel').value=''; document.getElementById('formDeadline').value='';
  document.getElementById('formJenis').value='individu'; document.getElementById('formPoin').value='10';
  document.getElementById('formError').classList.add('hidden'); document.getElementById('formSuccess').classList.add('hidden');
}

async function hapusTugas(tugasId) {
  if (!confirm('Yakin ingin menghapus tugas ini?')) return;
  const r = await api('DELETE',`/api/tugas/${tugasId}`);
  if (r.error) { showToast(r.error,'error'); return; }
  closeModal(); showToast('Tugas berhasil dihapus.','info');
}

// ===== LEADERBOARD =====
function renderLeaderboard() {
  const list = getSiswaList();
  const ranked = list.map(s=>({...s,poin:hitungPoin(s.username),kumpul:pengumpulan.filter(p=>p.siswaId===s.username&&p.status==='selesai').length})).sort((a,b)=>b.poin-a.poin);
  const el = document.getElementById('leaderboardList');
  const medals=['🥇','🥈','🥉'], rankClasses=['gold','silver','bronze'];
  const gradients=['#f59e0b,#d97706','#94a3b8,#64748b','#b45309,#92400e'];
  const isGuru = currentUser && currentUser.role==='admin';

  if (ranked.length===0) { el.innerHTML='<div class="lb-empty"><i class="fas fa-users-slash"></i><p>Belum ada siswa terdaftar</p></div>'; return; }

  el.innerHTML = ranked.map((s,i)=>`
    <div class="leaderboard-item" style="animation-delay:${i*0.08}s">
      <div class="lb-rank ${rankClasses[i]||''}">${i<3?medals[i]:'#'+(i+1)}</div>
      <div class="lb-avatar" style="background:linear-gradient(135deg,${gradients[i]||randomGradient(s.username)})">${s.avatar}</div>
      <div class="lb-info">
        <div class="lb-name">${s.nama}</div>
        <div class="lb-detail"><span class="lb-username">@${s.username}</span> · ${s.kumpul} tugas dikumpulkan</div>
      </div>
      <div class="lb-right">
        <div class="lb-poin"><div class="lb-poin-num">${s.poin}</div><div class="lb-poin-label">poin</div></div>
        ${isGuru?`<button class="btn-kick" onclick="konfirmasiKick('${s.username}','${s.nama.replace(/'/g,"\\'")}')"><i class="fas fa-user-times"></i> Kick</button>`:''}
      </div>
    </div>`).join('');
}

// ===== KICK =====
function konfirmasiKick(username, nama) {
  document.getElementById('kickNama').textContent = nama;
  document.getElementById('kickUsername').textContent = '@'+username;
  document.getElementById('kickTargetUsername').value = username;
  document.getElementById('kickModal').classList.remove('hidden');
}
function tutupKickModal() { document.getElementById('kickModal').classList.add('hidden'); }
async function eksekusiKick() {
  const username = document.getElementById('kickTargetUsername').value;
  const r = await api('DELETE',`/api/users/${username}`);
  if (r.error) { showToast(r.error,'error'); return; }
  tutupKickModal();
  showToast(`🚫 Akun @${username} telah dihapus dari kelas.`,'warning');
}

function hitungPoin(siswaId) {
  return pengumpulan.filter(p=>p.siswaId===siswaId&&p.status==='selesai')
    .reduce((sum,p)=>{ const t=tugas.find(x=>x.id===p.tugasId); return sum+(t?t.poin:0); },0);
}

// ===== LAPORAN =====
function renderLaporan() {
  const el   = document.getElementById('laporanContent');
  const list = getSiswaList();
  if (tugas.length===0) { el.innerHTML='<p style="color:var(--text-light);text-align:center;padding:40px">Belum ada tugas</p>'; return; }
  const html = tugas.map(t=>{
    const kumpul=pengumpulan.filter(p=>p.tugasId===t.id&&p.status==='selesai').length;
    const proses=pengumpulan.filter(p=>p.tugasId===t.id&&p.status==='proses').length;
    const total=list.length||1, belum=Math.max(0,total-kumpul-proses);
    const pK=Math.round(kumpul/total*100),pP=Math.round(proses/total*100),pB=Math.round(belum/total*100);
    return `<div class="laporan-tugas-item">
      <div class="laporan-tugas-title">${t.judul}</div>
      <div class="laporan-tugas-mapel"><span class="mapel-tag ${getMapelClass(t.mapel)}">${t.mapel}</span> • Deadline: ${formatDate(t.deadline)}</div>
      <div class="laporan-bar"><div class="laporan-bar-label"><span>✅ Sudah kumpul: ${kumpul}</span><span>${pK}%</span></div><div class="laporan-bar-bg"><div class="laporan-bar-fill green" style="width:${pK}%"></div></div></div>
      <div class="laporan-bar"><div class="laporan-bar-label"><span>⏳ Sedang proses: ${proses}</span><span>${pP}%</span></div><div class="laporan-bar-bg"><div class="laporan-bar-fill yellow" style="width:${pP}%"></div></div></div>
      <div class="laporan-bar"><div class="laporan-bar-label"><span>❌ Belum: ${belum}</span><span>${pB}%</span></div><div class="laporan-bar-bg"><div class="laporan-bar-fill red" style="width:${pB}%"></div></div></div>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="laporan-grid">${html}</div>`;
}

// ===== NOTIFIKASI =====
function addNotif(notif) {
  notifikasi.unshift({...notif,id:Date.now()});
  if (notifikasi.length>20) notifikasi.pop();
  updateNotifBadge();
}
function cekDeadlineNotif() {
  tugas.forEach(t=>{ const cd=getCountdown(t.deadline); if(cd.type==='urgent') addNotif({icon:'🚨',text:`Deadline mendekat! "${t.judul}" — ${cd.text}`,time:'Baru saja'}); });
}
function updateNotifBadge() { document.getElementById('notifDot').classList.toggle('show',notifikasi.length>0); }
function toggleNotif() { const p=document.getElementById('notifPanel'); if(p.classList.toggle('hidden')===false) renderNotifList(); }
function renderNotifList() {
  const el=document.getElementById('notifList');
  if(notifikasi.length===0){el.innerHTML='<div class="notif-empty"><i class="fas fa-bell-slash" style="display:block;font-size:28px;margin-bottom:8px;opacity:0.3"></i>Tidak ada notifikasi</div>';return;}
  el.innerHTML=notifikasi.slice(0,10).map(n=>`<div class="notif-item"><div class="notif-icon">${n.icon}</div><div><div class="notif-text">${n.text}</div><div class="notif-time">${n.time}</div></div></div>`).join('');
}
function clearNotif() { notifikasi=[]; updateNotifBadge(); renderNotifList(); document.getElementById('notifDot').classList.remove('show'); }
document.addEventListener('click', function(e){
  const p=document.getElementById('notifPanel'),b=document.getElementById('notifBtn');
  if(!p.contains(e.target)&&!b.contains(e.target)) p.classList.add('hidden');
});

// ===== TOAST =====
function showToast(msg, type='info') {
  const icons={success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
  const c=document.getElementById('toastContainer');
  const t=document.createElement('div');
  t.className=`toast ${type}`;
  t.innerHTML=`<span>${icons[type]}</span> <span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(()=>{ t.style.animation='toastOut 0.3s ease forwards'; setTimeout(()=>t.remove(),300); },3500);
}

// ===== CHATBOT =====
function toggleChat() { document.getElementById('chatbotBox').classList.toggle('hidden'); }
function sendChat() {
  const input=document.getElementById('chatInput'), msg=input.value.trim();
  if(!msg) return;
  addChatMsg(msg,'user'); input.value='';
  setTimeout(()=>addChatMsg(generateAIReply(msg.toLowerCase()),'bot'),600);
}
function addChatMsg(text,role) {
  const el=document.getElementById('chatMessages');
  const div=document.createElement('div'); div.className=`chat-msg ${role}`;
  div.innerHTML=`<div class="chat-bubble">${text}</div>`;
  el.appendChild(div); el.scrollTop=el.scrollHeight;
}
function generateAIReply(msg) {
  if(msg.includes('hari ini')||msg.includes('tugas apa')){const td=tugas.filter(t=>new Date(t.deadline).toDateString()===new Date().toDateString());return td.length===0?'Tidak ada tugas deadline hari ini 😊':`Tugas deadline hari ini:<br>${td.map(t=>`• ${t.judul} (${t.mapel})`).join('<br>')}`;}
  if((msg.includes('belum selesai')||msg.includes('tugas belum'))&&currentUser.role==='siswa'){const b=tugas.filter(t=>getStatusTugas(t.id)==='belum');return b.length===0?'Semua tugasmu sudah dikerjakan! 🎉':`Masih ada ${b.length} tugas belum dikerjakan:<br>${b.map(t=>`• ${t.judul}`).join('<br>')}`;}
  if((msg.includes('belum kumpul')||msg.includes('siapa yang belum'))&&currentUser.role==='admin'){const bl=siswaList.filter(s=>tugas.some(t=>!pengumpulan.find(p=>p.siswaId===s.username&&p.tugasId===t.id&&p.status==='selesai')));return bl.length===0?'Semua siswa sudah mengumpulkan! 🎉':`Siswa belum kumpul:<br>${bl.map(s=>`• ${s.nama}`).join('<br>')}`;}
  if(msg.includes('berapa tugas')||msg.includes('total tugas')) return `Total tugas: <strong>${tugas.length}</strong> 📚`;
  if((msg.includes('poin')||msg.includes('nilai'))&&currentUser.role==='siswa') return `Poinmu: <strong>${hitungPoin(currentUser.username)} poin</strong> ⭐`;
  if(msg.includes('deadline')||msg.includes('terdekat')){const s=[...tugas].filter(t=>getCountdown(t.deadline).type!=='expired').sort((a,b)=>new Date(a.deadline)-new Date(b.deadline)).slice(0,3);return s.length===0?'Tidak ada tugas aktif.':`Deadline terdekat:<br>${s.map(t=>`• ${t.judul} — ${getCountdown(t.deadline).text}`).join('<br>')}`;}
  if(msg.includes('halo')||msg.includes('hai')) return `Halo, ${currentUser.nama.split(' ')[0]}! 👋`;
  return `Maaf, belum bisa menjawab itu 😅<br>Coba: "Tugas hari ini?", "Deadline terdekat?", "Berapa tugas?"`;
}

// ===== SIDEBAR =====
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('show'); }

// ===== COUNTDOWN =====
function clearCountdowns() { countdownIntervals.forEach(id=>clearInterval(id)); countdownIntervals=[]; }

// ===== AUTO LOGIN =====
window.addEventListener('DOMContentLoaded', () => {
  const savedUser = sessionStorage.getItem('kelaskuUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    initApp();
    // data tugas/siswa akan datang otomatis dari socket 'init_data'
  }
});
