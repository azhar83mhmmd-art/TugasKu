/* ===================================================
   KelasKu — Vercel Edition v2
   Backend: Supabase (Database + Auth + Realtime)
   AI: Claude API (claude-sonnet-4-20250514)
   Fitur baru:
   - Tetap login (localStorage)
   - Notifikasi browser push
   - Pengumuman (buat & tampilkan)
   - AI Assistant powered by Claude
   =================================================== */

// =========================================================
// ⚠️  KONFIGURASI SUPABASE — ISI INI DULU SEBELUM DEPLOY
//     Dapatkan dari: https://supabase.com/dashboard
//     Project Settings → API → Project URL & anon key
// =========================================================
const SUPABASE_URL  = 'https://octoukmbqaocxmcyreyy.supabase.co';
const SUPABASE_ANON = 'sb_publishable_2V8Dq-s6uWgNyCqASXGMSg_ayOE1gA8';

// =========================================================
// ⚠️  KONFIGURASI CLAUDE AI — ISI API KEY KAMU
//     Dapatkan dari: https://console.anthropic.com
//     PENTING: Jangan share API key ini secara publik!
//     Untuk produksi, gunakan backend/proxy server.
// =========================================================
const CLAUDE_API_KEY = 'GANTI_DENGAN_CLAUDE_API_KEY_KAMU';
// =========================================================

const KODE_ADMIN = 'KENZO';
const STORAGE_KEY = 'kku_user_v2'; // localStorage key

// ===== STATE =====
let sb = null;
let currentUser = null;
let tugas       = [];
let pengumpulan = [];
let siswaList   = [];
let pengumumanList = [];
let notifikasi  = [];
let filterStatus = 'semua';
let realtimeSubs = [];
let chatHistory = [];  // untuk konteks AI
let chatTyping = false;
let newPengumumanCount = 0;

// ===== INIT SUPABASE =====
function initSupabase() {
  if (SUPABASE_URL.includes('GANTI') || SUPABASE_ANON.includes('GANTI')) {
    showSetupPage();
    return false;
  }
  try {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    return true;
  } catch(e) {
    showSetupPage();
    return false;
  }
}

function showSetupPage() {
  document.getElementById('loadingScreen').classList.add('hidden');
  document.body.innerHTML = `
  <div class="setup-page">
    <div class="setup-card">
      <div style="font-size:48px;margin-bottom:16px">⚙️</div>
      <h2>Konfigurasi Supabase Diperlukan</h2>
      <p>Buka file <code>app.js</code> dan isi variabel <code>SUPABASE_URL</code> dan <code>SUPABASE_ANON</code> dengan kredensial dari dashboard Supabase kamu.</p>
      <div class="setup-steps">
        <div class="setup-step"><div class="setup-step-num">1</div><div class="setup-step-text">
          <strong>Buat akun Supabase</strong>
          <p>Kunjungi <a href="https://supabase.com" target="_blank" style="color:var(--primary)">supabase.com</a> → Sign Up gratis</p>
        </div></div>
        <div class="setup-step"><div class="setup-step-num">2</div><div class="setup-step-text">
          <strong>Buat Project baru</strong>
          <p>Klik "New Project" → isi nama & password database</p>
        </div></div>
        <div class="setup-step"><div class="setup-step-num">3</div><div class="setup-step-text">
          <strong>Jalankan SQL Schema</strong>
          <p>Buka SQL Editor → paste isi file <code>schema.sql</code> → Run</p>
        </div></div>
        <div class="setup-step"><div class="setup-step-num">4</div><div class="setup-step-text">
          <strong>Salin API Keys</strong>
          <p>Settings → API → copy <code>Project URL</code> dan <code>anon key</code> ke <code>app.js</code></p>
        </div></div>
        <div class="setup-step"><div class="setup-step-num">5</div><div class="setup-step-text">
          <strong>Isi Claude API Key</strong>
          <p>Dapatkan dari <a href="https://console.anthropic.com" target="_blank" style="color:var(--primary)">console.anthropic.com</a> → isi <code>CLAUDE_API_KEY</code></p>
        </div></div>
        <div class="setup-step"><div class="setup-step-num">6</div><div class="setup-step-text">
          <strong>Deploy ke Vercel</strong>
          <p>Upload folder ini ke GitHub → connect ke Vercel → Deploy!</p>
        </div></div>
      </div>
    </div>
  </div>`;
}

// ===== UTILS =====
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})
       + ' ' + d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
}
function getCountdown(iso) {
  const diff = new Date(iso) - new Date();
  if (diff <= 0) return {text:'Kadaluarsa',type:'expired'};
  const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000);
  if (h < 24) return {text: h > 0 ? `${h}j ${m}m lagi` : `${m}m lagi`, type: h < 6 ? 'urgent' : 'warning'};
  const hari = Math.floor(h/24);
  return {text:`${hari} hari lagi`, type: hari <= 2 ? 'warning' : 'normal'};
}
function getMapelClass(m)  { return 'mapel-' + (m||'').replace(/\s/g,''); }
function getColorClass(m)  { return 'color-' + (m ? m.replace(/\s/g,'') : 'default'); }
function randomGradient(s) {
  const g=['#4f46e5,#7c3aed','#0ea5e9,#2563eb','#10b981,#059669','#f59e0b,#d97706','#ef4444,#dc2626','#ec4899,#db2777'];
  return g[(s||'a').charCodeAt(0)%g.length];
}
function avatarChar(n) { return (n||'?').trim().charAt(0).toUpperCase(); }
function makeid() { return crypto.randomUUID ? crypto.randomUUID() : 'id_'+Date.now()+'_'+Math.random().toString(36).slice(2); }

// ===== AUTH TABS =====
function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabDaftar').classList.toggle('active', !isLogin);
  document.getElementById('formLogin').classList.toggle('hidden', !isLogin);
  document.getElementById('formDaftar').classList.toggle('hidden', isLogin);
  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('daftarError').classList.add('hidden');
  document.getElementById('daftarSuccess').classList.add('hidden');
}

function updateRolePicker() {
  const isAdmin = document.querySelector('input[name="daftarRole"]:checked')?.value === 'admin';
  document.getElementById('kodeAdminWrap').classList.toggle('hidden', !isAdmin);
  document.getElementById('roleOptAdmin').classList.toggle('active', isAdmin);
  document.getElementById('roleOptSiswa').classList.toggle('active', !isAdmin);
}

function togglePass(id, btn) {
  const inp = document.getElementById(id);
  const isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  btn.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
}

function setLoadMsg(msg) {
  const el = document.getElementById('loadingMsg');
  if (el) el.textContent = msg;
}

// ===== LOGIN =====
async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const remember = document.getElementById('rememberMe').checked;
  if (!username || !password) { showErr('loginError','Username dan password wajib diisi!'); return; }

  setBtnLoading('btnLogin', true, 'Masuk...');

  const { data, error } = await sb
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();

  setBtnLoading('btnLogin', false);

  if (error || !data) {
    showErr('loginError', 'Username atau password salah!');
    return;
  }

  currentUser = data;

  // Simpan ke localStorage (tetap login) atau sessionStorage
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(STORAGE_KEY, JSON.stringify(data));

  document.getElementById('loginError').classList.add('hidden');
  await initApp();
}

// ===== DAFTAR =====
async function handleDaftar() {
  const nama     = document.getElementById('daftarNama').value.trim();
  const username = document.getElementById('daftarUsername').value.trim().toLowerCase();
  const password = document.getElementById('daftarPassword').value;
  const role     = document.querySelector('input[name="daftarRole"]:checked')?.value || 'siswa';
  const kode     = document.getElementById('kodeAdmin').value;

  if (!nama)           { showErr('daftarError','Nama lengkap wajib diisi!'); return; }
  if (nama.length < 2) { showErr('daftarError','Nama terlalu pendek!'); return; }
  if (!username)       { showErr('daftarError','Username wajib diisi!'); return; }
  if (username.length < 4) { showErr('daftarError','Username minimal 4 karakter!'); return; }
  if (/\s/.test(username))  { showErr('daftarError','Username tidak boleh mengandung spasi!'); return; }
  if (!password)       { showErr('daftarError','Password wajib diisi!'); return; }
  if (password.length < 6) { showErr('daftarError','Password minimal 6 karakter!'); return; }
  if (role === 'admin' && kode !== KODE_ADMIN) { showErr('daftarError','Kode admin salah!'); return; }

  setBtnLoading('btnDaftar', true, 'Mendaftar...');

  const { data: existing } = await sb.from('users').select('id').eq('username', username).maybeSingle();
  if (existing) {
    setBtnLoading('btnDaftar', false);
    showErr('daftarError','Username sudah digunakan, coba yang lain!');
    return;
  }

  const newUser = { id: makeid(), nama, username, password, role, avatar: avatarChar(nama), dibuat: new Date().toISOString() };
  const { error } = await sb.from('users').insert(newUser);

  setBtnLoading('btnDaftar', false);

  if (error) {
    showErr('daftarError', 'Gagal membuat akun: ' + error.message);
    return;
  }

  document.getElementById('daftarError').classList.add('hidden');
  const suc = document.getElementById('daftarSuccess');
  suc.querySelector('span').textContent = `Akun "${nama}" berhasil dibuat! Silakan masuk.`;
  suc.classList.remove('hidden');
  showToast(`✅ Akun ${nama} berhasil didaftarkan!`, 'success');

  setTimeout(() => {
    ['daftarNama','daftarUsername','daftarPassword','kodeAdmin'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    suc.classList.add('hidden');
    switchTab('login');
    document.getElementById('loginUsername').value = username;
  }, 1500);
}

function showErr(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.querySelector('span').textContent = msg;
  el.classList.remove('hidden');
}

function setBtnLoading(id, loading, msg = '') {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${msg}`;
  else {
    const restore = {
      btnLogin:'<span>Masuk</span> <i class="fas fa-arrow-right"></i>',
      btnDaftar:'<span>Buat Akun</span> <i class="fas fa-user-plus"></i>',
      btnBuatTugas:'<i class="fas fa-save"></i> Simpan Tugas',
      btnBuatPengumuman:'<i class="fas fa-bullhorn"></i> Kirim Pengumuman'
    };
    btn.innerHTML = restore[id] || msg;
  }
}

// ===== LOGOUT =====
function handleLogout() {
  currentUser = null;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  unsubscribeRealtime();
  chatHistory = [];
  document.getElementById('appPage').classList.remove('active');
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  setRTStatus('disconnected');
}

// ===== NOTIFIKASI BROWSER =====
async function requestNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

function sendBrowserNotif(title, body, icon = '🎓') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">' + icon + '</text></svg>'
    });
  } catch(e) {}
}

// ===== INIT APP =====
async function initApp() {
  document.getElementById('loadingScreen').classList.remove('hidden');
  setLoadMsg('Memuat data...');
  document.getElementById('loginPage').classList.remove('active');

  await loadAllData();
  await requestNotifPermission();

  setLoadMsg('Menyiapkan tampilan...');

  document.getElementById('appPage').classList.add('active');
  document.getElementById('loadingScreen').classList.add('hidden');

  document.getElementById('sidebarName').textContent    = currentUser.nama;
  document.getElementById('sidebarAvatar').textContent  = avatarChar(currentUser.nama);
  document.getElementById('topbarAvatar').textContent   = avatarChar(currentUser.nama);
  document.getElementById('sidebarRole').textContent    =
    currentUser.role === 'admin' ? '👑 Guru / Admin' : '🎓 Siswa';

  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = currentUser.role === 'admin' ? '' : 'none';
  });

  rebuildMapelFilter();
  cekDeadlineNotif();
  updateNotifBadge();

  // Inisialisasi chat context
  chatHistory = [];

  subscribeRealtime();
  navigateTo('dashboard', document.querySelector('.nav-item[data-section="dashboard"]'));

  setInterval(() => {
    const active = document.querySelector('.section.active');
    if (active) refreshSection(active.id.replace('section-',''));
  }, 60000);
}

// ===== LOAD DATA =====
async function loadAllData() {
  const [rTugas, rPengumpulan, rUsers, rPengumuman] = await Promise.all([
    sb.from('tugas').select('*').order('dibuat', {ascending: false}),
    sb.from('pengumpulan').select('*'),
    sb.from('users').select('id,nama,username,role,avatar,dibuat').eq('role','siswa'),
    sb.from('pengumuman').select('*').order('dibuat', {ascending: false}),
  ]);
  tugas          = rTugas.data        || [];
  pengumpulan    = rPengumpulan.data  || [];
  siswaList      = rUsers.data        || [];
  pengumumanList = rPengumuman.data   || [];
}

// ===== SUPABASE REALTIME =====
function subscribeRealtime() {
  unsubscribeRealtime();
  setRTStatus('connecting');

  const channel = sb.channel('kku-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tugas' }, async (payload) => {
      await reloadTugas();
      refreshSection(document.querySelector('.section.active')?.id.replace('section-','') || 'dashboard');
      if (payload.eventType === 'INSERT') {
        const t = payload.new;
        showToast('📋 Tugas baru: ' + t.judul, 'info');
        addNotif({icon:'📋', text:`Tugas baru ditambahkan: "${t.judul}"`, time: waktuSekarang()});
        sendBrowserNotif('📋 Tugas Baru!', t.judul + ' — ' + t.mapel, '📋');
      }
      if (payload.eventType === 'DELETE') showToast('🗑️ Tugas dihapus.', 'info');
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman' }, async (payload) => {
      await reloadPengumuman();
      refreshSection(document.querySelector('.section.active')?.id.replace('section-','') || 'dashboard');
      if (payload.eventType === 'INSERT') {
        const p = payload.new;
        showToast('📢 Pengumuman baru: ' + p.judul, 'info');
        addNotif({icon: p.penting ? '🚨' : '📢', text:`Pengumuman baru: "${p.judul}"`, time: waktuSekarang()});
        sendBrowserNotif(p.penting ? '🚨 Pengumuman Penting!' : '📢 Pengumuman Baru', p.judul, p.penting ? '🚨' : '📢');
        // Update badge pengumuman
        newPengumumanCount++;
        updatePengumumanBadge();
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pengumpulan' }, async (payload) => {
      await reloadPengumpulan();
      refreshSection(document.querySelector('.section.active')?.id.replace('section-','') || 'dashboard');
      if (currentUser.role === 'admin' && payload.eventType !== 'UPDATE') {
        showToast('📤 Ada siswa mengumpulkan tugas!', 'info');
        addNotif({icon:'📤', text:'Ada siswa yang baru mengumpulkan tugas.', time: waktuSekarang()});
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, async () => {
      const { data } = await sb.from('users').select('id,nama,username,role,avatar,dibuat').eq('role','siswa');
      siswaList = data || [];
      refreshSection('leaderboard');
      refreshSection('laporan');
      if (currentUser.role === 'admin') renderAdminSubmitTable();
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') setRTStatus('connected');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRTStatus('error');
    });

  realtimeSubs.push(channel);
}

function unsubscribeRealtime() {
  realtimeSubs.forEach(ch => sb && sb.removeChannel(ch));
  realtimeSubs = [];
}

async function reloadTugas() {
  const { data } = await sb.from('tugas').select('*').order('dibuat', {ascending: false});
  tugas = data || [];
  rebuildMapelFilter();
}

async function reloadPengumpulan() {
  const { data } = await sb.from('pengumpulan').select('*');
  pengumpulan = data || [];
}

async function reloadPengumuman() {
  const { data } = await sb.from('pengumuman').select('*').order('dibuat', {ascending: false});
  pengumumanList = data || [];
}

function setRTStatus(status) {
  const dot  = document.getElementById('rtDot');
  const text = document.getElementById('rtStatus');
  if (!dot || !text) return;
  dot.className = 'rt-dot';
  if (status === 'connected') { dot.classList.add('connected'); text.textContent = 'Real-time aktif'; }
  else if (status === 'error') { dot.classList.add('error'); text.textContent = 'Koneksi terputus'; }
  else if (status === 'connecting') { text.textContent = 'Menghubungkan...'; }
  else { text.textContent = 'Offline'; }
}

function waktuSekarang() {
  return new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
}

function refreshSection(sec) {
  if (sec === 'dashboard')       renderDashboard();
  if (sec === 'pengumuman')      renderPengumuman();
  if (sec === 'buatPengumuman')  {} // no refresh needed
  if (sec === 'tugas')           renderTugasList();
  if (sec === 'leaderboard')     renderLeaderboard();
  if (sec === 'laporan')         renderLaporan();
  if (sec === 'kelolaSiswa')     renderKelolaSiswa();
}

// ===== NAVIGASI =====
function navigateTo(section, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('section-' + section);
  if (target) target.classList.add('active');
  document.getElementById('filterBar').style.display = section === 'tugas' ? '' : 'none';

  // Reset badge pengumuman saat dibuka
  if (section === 'pengumuman') {
    newPengumumanCount = 0;
    updatePengumumanBadge();
  }

  refreshSection(section);
}

function rebuildMapelFilter() {
  const mapels = [...new Set(tugas.map(t => t.mapel).filter(Boolean))];
  const sel = document.getElementById('filterMapel');
  if (!sel) return;
  sel.innerHTML = '<option value="">Semua Mapel</option>';
  mapels.forEach(m => sel.innerHTML += `<option value="${m}">${m}</option>`);
}

// ===== DASHBOARD =====
function renderDashboard() {
  const jam = new Date().getHours();
  const sapa = jam < 12 ? 'Selamat Pagi' : jam < 15 ? 'Selamat Siang' : jam < 18 ? 'Selamat Sore' : 'Selamat Malam';
  document.getElementById('dashGreeting').textContent = `${sapa}, ${currentUser.nama.split(' ')[0]}! 👋`;
  document.getElementById('dashSub').textContent = new Date().toLocaleDateString('id-ID',
    {weekday:'long',day:'numeric',month:'long',year:'numeric'});

  renderStats();

  const progSec = document.getElementById('progressSection');
  if (currentUser.role === 'siswa') {
    progSec.classList.remove('hidden');
    const total = tugas.length;
    const done  = pengumpulan.filter(p => p.siswa_id === currentUser.id && p.status === 'selesai').length;
    const pct   = total > 0 ? Math.round(done/total*100) : 0;
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressText').textContent = pct + '%';
    document.getElementById('progressDesc').textContent = `${done} dari ${total} tugas telah diselesaikan`;
  } else { progSec.classList.add('hidden'); }

  // Pengumuman terbaru
  const dashPng = document.getElementById('dashPengumumanList');
  const recentPng = pengumumanList.slice(0, 3);
  if (!recentPng.length) {
    dashPng.innerHTML = '<p style="color:var(--text-light);font-size:13px;text-align:center;padding:16px">Belum ada pengumuman 📢</p>';
  } else {
    dashPng.innerHTML = recentPng.map(p => `
      <div class="pengumuman-mini ${p.penting ? 'penting' : ''}" onclick="navigateTo('pengumuman',document.querySelector('[data-section=pengumuman]'))">
        <div class="pengumuman-mini-icon">${p.penting ? '🚨' : '📢'}</div>
        <div class="pengumuman-mini-content">
          <div class="pengumuman-mini-judul">${p.judul}</div>
          <div class="pengumuman-mini-time">${formatDate(p.dibuat)} · ${p.oleh_nama}</div>
        </div>
        ${p.penting ? '<span class="badge-penting">Penting</span>' : ''}
      </div>`).join('');
  }

  // Urgent tugas
  const sorted = [...tugas].filter(t => getCountdown(t.deadline).type !== 'expired')
    .sort((a,b) => new Date(a.deadline) - new Date(b.deadline)).slice(0,5);
  const urgentEl = document.getElementById('urgentTugas');
  if (!sorted.length) {
    urgentEl.innerHTML = '<p style="color:var(--text-light);font-size:13px;text-align:center;padding:20px">Tidak ada tugas mendekati deadline 🎉</p>';
  } else {
    urgentEl.innerHTML = sorted.map(t => {
      const cd = getCountdown(t.deadline);
      const col = cd.type === 'urgent' ? 'var(--danger)' : cd.type === 'warning' ? 'var(--warning)' : 'var(--success)';
      return `<div class="task-mini" onclick="openModal('${t.id}')">
        <div class="task-mini-color" style="background:${col}"></div>
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

  const belumCount = currentUser.role === 'siswa'
    ? tugas.filter(t => getStatusTugas(t.id) === 'belum').length : 0;
  const badge = document.getElementById('tugasBadge');
  if (badge) { badge.textContent = belumCount; badge.style.display = belumCount > 0 ? '' : 'none'; }
}

function renderStats() {
  const el = document.getElementById('statsGrid');
  let stats = [];
  if (currentUser.role === 'siswa') {
    const total = tugas.length;
    const done  = pengumpulan.filter(p => p.siswa_id === currentUser.id && p.status === 'selesai').length;
    const proses= pengumpulan.filter(p => p.siswa_id === currentUser.id && p.status === 'proses').length;
    stats = [
      {icon:'fa-tasks',color:'blue',num:total,label:'Total Tugas'},
      {icon:'fa-check-circle',color:'green',num:done,label:'Sudah Dikumpulkan'},
      {icon:'fa-hourglass-half',color:'yellow',num:proses,label:'Sedang Dikerjakan'},
      {icon:'fa-times-circle',color:'red',num:total-done-proses,label:'Belum Dikerjakan'},
      {icon:'fa-star',color:'purple',num:hitungPoin(currentUser.id),label:'Total Poin'},
    ];
  } else {
    const totalKumpul = pengumpulan.filter(p => p.status === 'selesai').length;
    const todayDl = tugas.filter(t => new Date(t.deadline).toDateString() === new Date().toDateString()).length;
    stats = [
      {icon:'fa-clipboard-list',color:'blue',num:tugas.length,label:'Total Tugas'},
      {icon:'fa-users',color:'green',num:siswaList.length,label:'Jumlah Siswa'},
      {icon:'fa-check-double',color:'purple',num:totalKumpul,label:'Total Pengumpulan'},
      {icon:'fa-calendar-day',color:'yellow',num:todayDl,label:'Deadline Hari Ini'},
      {icon:'fa-bullhorn',color:'blue',num:pengumumanList.length,label:'Total Pengumuman'},
    ];
  }
  el.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon ${s.color}"><i class="fas ${s.icon}"></i></div>
      <div class="stat-info"><div class="stat-num">${s.num}</div><div class="stat-label">${s.label}</div></div>
    </div>`).join('');
}

function renderAdminSubmitTable() {
  const el = document.getElementById('adminSubmitTable');
  const recent = tugas.slice(0,5);
  if (!recent.length) { el.innerHTML='<p style="color:var(--text-light);text-align:center;padding:20px">Belum ada tugas.</p>'; return; }
  if (!siswaList.length) { el.innerHTML='<p style="color:var(--text-light);text-align:center;padding:20px">Belum ada siswa terdaftar.</p>'; return; }
  el.innerHTML = `<div style="overflow-x:auto"><table class="submit-table">
    <thead><tr><th>Nama Siswa</th>
      ${recent.map(t=>`<th title="${t.judul}">${t.judul.slice(0,14)}${t.judul.length>14?'…':''}</th>`).join('')}
      <th>Poin</th></tr></thead>
    <tbody>${siswaList.map(s=>`<tr><td><strong>${s.nama}</strong></td>
      ${recent.map(t=>{
        const p=pengumpulan.find(x=>x.tugas_id===t.id&&x.siswa_id===s.id);
        if(!p) return `<td><span class="status-badge belum">Belum</span></td>`;
        if(p.status==='selesai') return `<td><span class="status-badge selesai">✓</span></td>`;
        return `<td><span class="status-badge proses">Proses</span></td>`;
      }).join('')}
      <td><strong style="color:var(--primary)">${hitungPoin(s.id)}</strong></td></tr>`).join('')}
    </tbody></table></div>`;
}

// ===== PENGUMUMAN =====
function renderPengumuman() {
  const listEl  = document.getElementById('pengumumanList');
  const emptyEl = document.getElementById('pengumumanEmpty');
  if (!pengumumanList.length) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');
  listEl.innerHTML = pengumumanList.map(p => `
    <div class="pengumuman-card ${p.penting ? 'penting' : ''}">
      <div class="pengumuman-card-header">
        <div class="pengumuman-icon-wrap">${p.penting ? '🚨' : '📢'}</div>
        <div class="pengumuman-meta">
          <div class="pengumuman-judul">${p.judul}</div>
          <div class="pengumuman-info">${p.oleh_nama} · ${formatDate(p.dibuat)}</div>
        </div>
        ${p.penting ? '<span class="badge-penting">⚡ Penting</span>' : ''}
        ${currentUser.role === 'admin' ? `<button class="btn-icon-danger" onclick="hapusPengumuman('${p.id}')" title="Hapus pengumuman"><i class="fas fa-trash"></i></button>` : ''}
      </div>
      <div class="pengumuman-isi">${p.isi.replace(/\n/g,'<br>')}</div>
    </div>`).join('');
}

async function buatPengumuman() {
  const judul   = document.getElementById('pFormJudul').value.trim();
  const isi     = document.getElementById('pFormIsi').value.trim();
  const penting = document.getElementById('pFormPenting').checked;

  if (!judul) { showErr('pFormError','Judul pengumuman wajib diisi!'); return; }
  if (!isi)   { showErr('pFormError','Isi pengumuman wajib diisi!'); return; }

  setBtnLoading('btnBuatPengumuman', true, 'Mengirim...');

  const { error } = await sb.from('pengumuman').insert({
    id: makeid(),
    judul,
    isi,
    penting,
    oleh: currentUser.id,
    oleh_nama: currentUser.nama,
    dibuat: new Date().toISOString()
  });

  setBtnLoading('btnBuatPengumuman', false);

  if (error) { showErr('pFormError', 'Gagal: ' + error.message); return; }

  document.getElementById('pFormError').classList.add('hidden');
  const sucEl = document.getElementById('pFormSuccess');
  sucEl.querySelector('span').textContent = `Pengumuman "${judul}" berhasil dikirim!`;
  sucEl.classList.remove('hidden');
  showToast(`📢 Pengumuman berhasil dikirim!`, 'success');
  setTimeout(() => { sucEl.classList.add('hidden'); resetPengumumanForm(); }, 2000);
}

function resetPengumumanForm() {
  document.getElementById('pFormJudul').value = '';
  document.getElementById('pFormIsi').value = '';
  document.getElementById('pFormPenting').checked = false;
  document.getElementById('pFormError').classList.add('hidden');
  document.getElementById('pFormSuccess').classList.add('hidden');
}

async function hapusPengumuman(id) {
  if (!confirm('Yakin ingin menghapus pengumuman ini?')) return;
  await sb.from('pengumuman').delete().eq('id', id);
  await reloadPengumuman();
  showToast('Pengumuman berhasil dihapus.', 'info');
  renderPengumuman();
  renderDashboard();
}

function updatePengumumanBadge() {
  const badge = document.getElementById('pengumumanBadge');
  if (!badge) return;
  badge.textContent = newPengumumanCount;
  badge.style.display = newPengumumanCount > 0 ? '' : 'none';
}

// ===== TUGAS LIST =====
function renderTugasList() {
  const searchVal = document.getElementById('searchInput').value.toLowerCase();
  const mapelF    = document.getElementById('filterMapel').value;
  const filtered  = tugas.filter(t => {
    const matchSearch = t.judul.toLowerCase().includes(searchVal) || t.mapel.toLowerCase().includes(searchVal);
    const matchMapel  = !mapelF || t.mapel === mapelF;
    const st = getStatusTugas(t.id);
    return matchSearch && matchMapel && (filterStatus === 'semua' || st === filterStatus);
  });
  const listEl  = document.getElementById('tugasList');
  const emptyEl = document.getElementById('tugasEmpty');
  if (!filtered.length) { listEl.innerHTML=''; emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');
  const stLabel = {belum:'Belum Dikerjakan',proses:'Sedang Dikerjakan',selesai:'Sudah Dikumpulkan'};
  listEl.innerHTML = filtered.map(t => {
    const cd = getCountdown(t.deadline), st = getStatusTugas(t.id);
    return `<div class="task-card" onclick="openModal('${t.id}')">
      <div class="task-card-color-bar ${getColorClass(t.mapel)}"></div>
      <div class="task-card-body">
        <div class="task-card-meta">
          <span class="mapel-tag ${getMapelClass(t.mapel)}">${t.mapel}</span>
          <span class="status-badge ${st}">${stLabel[st]}</span>
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
  const p = pengumpulan.find(x => x.tugas_id === tugasId && x.siswa_id === currentUser.id);
  if (!p) return 'belum';
  return p.status;
}

function setFilter(status, el) {
  filterStatus = status;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderTugasList();
}
function filterTugas() { renderTugasList(); }

// ===== MODAL TUGAS =====
function openModal(tugasId) {
  const t = tugas.find(x => x.id === tugasId);
  if (!t) return;
  const cd = getCountdown(t.deadline), st = getStatusTugas(t.id), isAdmin = currentUser.role === 'admin';
  const existing = pengumpulan.find(p => p.tugas_id === tugasId && p.siswa_id === currentUser.id);
  const kumpulCount = pengumpulan.filter(p => p.tugas_id === tugasId && p.status === 'selesai').length;
  const prosesCount = pengumpulan.filter(p => p.tugas_id === tugasId && p.status === 'proses').length;

  let submitHTML = '';
  if (!isAdmin) {
    if (st === 'selesai') {
      submitHTML = `<div class="modal-submit-section">
        <div class="alert alert-success"><i class="fas fa-check-circle"></i> Tugas dikumpulkan pada ${formatDate(existing.waktu)}</div>
        ${existing.catatan ? `<p style="font-size:13px;color:var(--text-light)">Catatan: ${existing.catatan}</p>` : ''}
      </div>`;
    } else {
      submitHTML = `<div class="modal-submit-section">
        <h4>📤 Kumpulkan Tugas</h4>
        <div class="upload-area" ondragover="event.preventDefault()" ondrop="event.preventDefault()">
          <i class="fas fa-cloud-upload-alt"></i>
          <p>Upload file (PDF, Gambar, Dokumen)</p>
          <p style="font-size:11px;margin-top:4px;color:var(--warning)">⚠️ File akan disimpan sebagai nama saja (tanpa upload ke server)</p>
          <input type="file" id="fileInput-${t.id}" onchange="showFilePreview('${t.id}',this.files[0]?.name)" />
        </div>
        <div id="filePreview-${t.id}" class="upload-preview hidden"></div>
        <textarea class="catatan-input" id="catatan-${t.id}" rows="2" placeholder="Catatan tambahan (opsional)..."></textarea>
        <div class="modal-actions">
          ${st === 'belum' ? `<button class="btn-secondary" onclick="updateStatus('${t.id}','proses')"><i class="fas fa-play"></i> Sedang Dikerjakan</button>` : ''}
          <button class="btn-success" onclick="kumpulkanTugas('${t.id}')"><i class="fas fa-paper-plane"></i> Kumpulkan</button>
        </div>
      </div>`;
    }
  } else {
    const rowsHTML = !siswaList.length
      ? '<tr><td colspan="4" style="text-align:center;color:var(--text-light)">Belum ada siswa terdaftar</td></tr>'
      : siswaList.map(s => {
          const p = pengumpulan.find(x => x.tugas_id === tugasId && x.siswa_id === s.id);
          const st2 = p ? p.status : 'belum';
          const stL = {belum:'❌ Belum',proses:'⏳ Proses',selesai:'✅ Kumpul'};
          return `<tr><td>${s.nama}</td><td><span class="status-badge ${st2}">${stL[st2]}</span></td>
            <td>${p ? formatDate(p.waktu) : '-'}</td><td>${p?.catatan || '-'}</td></tr>`;
        }).join('');
    submitHTML = `<div class="modal-submit-section">
      <h4>👥 Status Pengumpulan Siswa</h4>
      <div style="overflow-x:auto"><table class="submit-table">
        <thead><tr><th>Nama</th><th>Status</th><th>Waktu</th><th>Catatan</th></tr></thead>
        <tbody>${rowsHTML}</tbody>
      </table></div>
      <div style="margin-top:16px">
        <button class="btn-danger" onclick="hapusTugas('${t.id}')"><i class="fas fa-trash"></i> Hapus Tugas Ini</button>
      </div>
    </div>`;
  }

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-mapel-tag"><span class="mapel-tag ${getMapelClass(t.mapel)}">${t.mapel}</span></div>
    <div class="modal-title">${t.judul}</div>
    <div class="modal-desc">${t.deskripsi}</div>
    <div class="modal-info-grid">
      <div class="modal-info-item"><div class="modal-info-label">Deadline</div><div class="modal-info-value">${formatDate(t.deadline)}</div></div>
      <div class="modal-info-item"><div class="modal-info-label">Sisa Waktu</div><div class="modal-info-value"><span class="countdown-badge ${cd.type}">${cd.text}</span></div></div>
      <div class="modal-info-item"><div class="modal-info-label">Jenis</div><div class="modal-info-value">${t.jenis === 'kelompok' ? '👥 Kelompok' : '👤 Individu'}</div></div>
      <div class="modal-info-item"><div class="modal-info-label">Poin</div><div class="modal-info-value">⭐ ${t.poin} poin</div></div>
      ${isAdmin ? `
      <div class="modal-info-item"><div class="modal-info-label">Sudah Kumpul</div><div class="modal-info-value" style="color:var(--success)">${kumpulCount}/${siswaList.length} siswa</div></div>
      <div class="modal-info-item"><div class="modal-info-label">Sedang Proses</div><div class="modal-info-value" style="color:var(--warning)">${prosesCount} siswa</div></div>` : ''}
    </div>${submitHTML}`;

  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target.id === 'modalOverlay') closeModal(); });

function showFilePreview(tugasId, name) {
  const el = document.getElementById('filePreview-'+tugasId);
  if (el && name) { el.classList.remove('hidden'); el.innerHTML = `<i class="fas fa-file" style="color:var(--primary)"></i> <strong>${name}</strong> <span style="color:var(--success);margin-left:auto">✓ Dipilih</span>`; }
}

// ===== PENGUMPULAN =====
async function updateStatus(tugasId, status) {
  const existing = pengumpulan.find(p => p.tugas_id === tugasId && p.siswa_id === currentUser.id);
  if (existing) {
    await sb.from('pengumpulan').update({status, waktu: new Date().toISOString()}).eq('id', existing.id);
  } else {
    await sb.from('pengumpulan').insert({id:makeid(), tugas_id:tugasId, siswa_id:currentUser.id, status, catatan:'', waktu:new Date().toISOString()});
  }
  await reloadPengumpulan();
  showToast('Status tugas diperbarui!', 'info');
  closeModal();
  renderDashboard();
}

async function kumpulkanTugas(tugasId) {
  const catatan = document.getElementById('catatan-'+tugasId)?.value || '';
  const t = tugas.find(x => x.id === tugasId);
  const existing = pengumpulan.find(p => p.tugas_id === tugasId && p.siswa_id === currentUser.id);
  const now = new Date().toISOString();

  if (existing) {
    await sb.from('pengumpulan').update({status:'selesai', catatan, waktu:now}).eq('id', existing.id);
  } else {
    await sb.from('pengumpulan').insert({id:makeid(), tugas_id:tugasId, siswa_id:currentUser.id, status:'selesai', catatan, waktu:now});
  }
  await reloadPengumpulan();
  showToast(`🎉 Tugas "${t.judul}" berhasil dikumpulkan!`, 'success');
  addNotif({icon:'✅', text:`Tugas "${t.judul}" berhasil dikumpulkan.`, time:waktuSekarang()});
  closeModal();
  renderDashboard();
}

// ===== BUAT TUGAS =====
async function buatTugas() {
  const judul     = document.getElementById('formJudul').value.trim();
  const mapel     = document.getElementById('formMapel').value;
  const deadline  = document.getElementById('formDeadline').value;
  const deskripsi = document.getElementById('formDeskripsi').value.trim();
  const jenis     = document.getElementById('formJenis').value;
  const poin      = parseInt(document.getElementById('formPoin').value) || 10;

  if (!judul||!mapel||!deadline||!deskripsi) { showErr('formError','Semua kolom wajib diisi!'); return; }
  if (new Date(deadline) <= new Date()) { showErr('formError','Deadline tidak boleh di masa lalu!'); return; }

  setBtnLoading('btnBuatTugas', true, 'Menyimpan...');

  const { error } = await sb.from('tugas').insert({
    id:makeid(), judul, mapel, deskripsi, deadline:new Date(deadline).toISOString(),
    jenis, poin, dibuat:new Date().toISOString(), oleh:currentUser.id
  });

  setBtnLoading('btnBuatTugas', false);

  if (error) { showErr('formError', 'Gagal menyimpan: '+error.message); return; }

  await reloadTugas();
  document.getElementById('formError').classList.add('hidden');
  const sucEl = document.getElementById('formSuccess');
  sucEl.querySelector('span').textContent = `Tugas "${judul}" berhasil dibuat!`;
  sucEl.classList.remove('hidden');
  showToast(`📝 Tugas "${judul}" berhasil dibuat!`, 'success');
  setTimeout(() => { sucEl.classList.add('hidden'); resetForm(); }, 2000);
}

function resetForm() {
  ['formJudul','formMapel','formDeadline','formDeskripsi'].forEach(id => { const e=document.getElementById(id); if(e) e.value=''; });
  const fj=document.getElementById('formJenis'); if(fj) fj.value='individu';
  const fp=document.getElementById('formPoin'); if(fp) fp.value='10';
  document.getElementById('formError').classList.add('hidden');
  document.getElementById('formSuccess').classList.add('hidden');
}

async function hapusTugas(tugasId) {
  if (!confirm('Yakin ingin menghapus tugas ini?')) return;
  await sb.from('pengumpulan').delete().eq('tugas_id', tugasId);
  await sb.from('tugas').delete().eq('id', tugasId);
  await reloadTugas();
  await reloadPengumpulan();
  closeModal();
  showToast('Tugas berhasil dihapus.', 'info');
  renderDashboard();
}

// ===== LEADERBOARD =====
function renderLeaderboard() {
  const el = document.getElementById('leaderboardList');
  if (!siswaList.length) { el.innerHTML='<div class="empty-state"><i class="fas fa-users"></i><p>Belum ada siswa terdaftar</p></div>'; return; }
  const ranked = siswaList.map(s => ({...s, poin:hitungPoin(s.id), kumpul:pengumpulan.filter(p=>p.siswa_id===s.id&&p.status==='selesai').length})).sort((a,b)=>b.poin-a.poin);
  const medals=['🥇','🥈','🥉'], rc=['gold','silver','bronze'];
  el.innerHTML = ranked.map((s,i) => `
    <div class="leaderboard-item">
      <div class="lb-rank ${rc[i]||''}">${i<3?medals[i]:'#'+(i+1)}</div>
      <div class="lb-avatar" style="background:linear-gradient(135deg,${randomGradient(s.username)})">${avatarChar(s.nama)}</div>
      <div class="lb-info"><div class="lb-name">${s.nama}</div><div class="lb-detail">${s.kumpul} tugas dikumpulkan</div></div>
      <div class="lb-poin"><div class="lb-poin-num">${s.poin}</div><div class="lb-poin-label">poin</div></div>
    </div>`).join('');
}

function hitungPoin(siswaId) {
  return pengumpulan.filter(p=>p.siswa_id===siswaId&&p.status==='selesai')
    .reduce((sum,p)=>{ const t=tugas.find(x=>x.id===p.tugas_id); return sum+(t?t.poin:0); },0);
}

// ===== LAPORAN =====
function renderLaporan() {
  const el = document.getElementById('laporanContent');
  if (!tugas.length) { el.innerHTML='<div class="empty-state"><i class="fas fa-chart-bar"></i><p>Belum ada tugas</p></div>'; return; }
  const html = tugas.map(t => {
    const kumpul=pengumpulan.filter(p=>p.tugas_id===t.id&&p.status==='selesai').length;
    const proses=pengumpulan.filter(p=>p.tugas_id===t.id&&p.status==='proses').length;
    const total=siswaList.length||1, belum=Math.max(0,total-kumpul-proses);
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

// ===== KELOLA SISWA (ADMIN) =====
function renderKelolaSiswa() {
  const el = document.getElementById('kelolaSiswaContent');
  if (!siswaList.length) { el.innerHTML='<div class="empty-state"><i class="fas fa-users"></i><p>Belum ada siswa terdaftar</p></div>'; return; }
  el.innerHTML = `<div style="overflow-x:auto"><table class="siswa-table">
    <thead><tr><th>Nama</th><th>Username</th><th>Terdaftar</th><th>Tugas Dikumpulkan</th><th>Poin</th><th>Aksi</th></tr></thead>
    <tbody>${siswaList.map(s => `<tr>
      <td><strong>${s.nama}</strong></td>
      <td><code style="font-size:12px;background:#f1f5f9;padding:2px 6px;border-radius:4px">${s.username}</code></td>
      <td style="color:var(--text-light);font-size:12px">${formatDate(s.dibuat||new Date().toISOString())}</td>
      <td>${pengumpulan.filter(p=>p.siswa_id===s.id&&p.status==='selesai').length} tugas</td>
      <td><strong style="color:var(--primary)">${hitungPoin(s.id)}</strong></td>
      <td><button class="btn-kick" onclick="konfirmasiKick('${s.id}','${s.nama.replace(/'/g,"\\'")}','${s.username}')">
        <i class="fas fa-user-times"></i> Hapus</button></td>
    </tr>`).join('')}
    </tbody></table></div>`;
}

function konfirmasiKick(id, nama, username) {
  document.getElementById('kickNama').textContent = nama;
  document.getElementById('kickUsernameSpan').textContent = '@'+username;
  document.getElementById('kickTargetId').value = id;
  document.getElementById('kickModal').classList.remove('hidden');
}
function tutupKickModal() { document.getElementById('kickModal').classList.add('hidden'); }
async function eksekusiKick() {
  const id = document.getElementById('kickTargetId').value;
  await sb.from('pengumpulan').delete().eq('siswa_id', id);
  await sb.from('users').delete().eq('id', id);
  siswaList = siswaList.filter(s => s.id !== id);
  tutupKickModal();
  showToast('Akun siswa berhasil dihapus.', 'info');
  renderKelolaSiswa();
  renderAdminSubmitTable();
}

// ===== NOTIFIKASI =====
function addNotif(n) {
  notifikasi.unshift({...n, id:Date.now()});
  if (notifikasi.length > 20) notifikasi.pop();
  updateNotifBadge();
}
function cekDeadlineNotif() {
  tugas.forEach(t => {
    const cd = getCountdown(t.deadline);
    if (cd.type === 'urgent') addNotif({icon:'🚨',text:`Deadline mendekat! "${t.judul}" — ${cd.text}`,time:'Baru saja'});
  });
}
function updateNotifBadge() { document.getElementById('notifDot').classList.toggle('show', notifikasi.length > 0); }
function toggleNotif() { const p=document.getElementById('notifPanel'); if(p.classList.toggle('hidden')===false) renderNotifList(); }
function renderNotifList() {
  const el=document.getElementById('notifList');
  if(!notifikasi.length){el.innerHTML='<div class="notif-empty"><i class="fas fa-bell-slash" style="display:block;font-size:28px;margin-bottom:8px;opacity:0.3"></i>Tidak ada notifikasi</div>';return;}
  el.innerHTML=notifikasi.slice(0,10).map(n=>`<div class="notif-item"><div class="notif-icon">${n.icon}</div><div><div class="notif-text">${n.text}</div><div class="notif-time">${n.time}</div></div></div>`).join('');
}
function clearNotif() { notifikasi=[]; updateNotifBadge(); renderNotifList(); document.getElementById('notifDot').classList.remove('show'); }
document.addEventListener('click', e => {
  const p=document.getElementById('notifPanel'),b=document.getElementById('notifBtn');
  if(p&&b&&!p.contains(e.target)&&!b.contains(e.target)) p.classList.add('hidden');
});

// ===== TOAST =====
function showToast(msg, type='info') {
  const icons={success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
  const t=document.createElement('div'); t.className=`toast ${type}`;
  t.innerHTML=`<span>${icons[type]}</span> <span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(()=>{ t.style.animation='toastOut 0.3s ease forwards'; setTimeout(()=>t.remove(),300); },3500);
}

// ===== AI CHATBOT (Claude-powered) =====
function toggleChat() {
  const box = document.getElementById('chatbotBox');
  box.classList.toggle('hidden');
}

async function sendChat() {
  if (chatTyping) return;
  const inp = document.getElementById('chatInput');
  const msg = inp.value.trim();
  if (!msg) return;
  addChatMsg(msg, 'user');
  inp.value = '';
  chatTyping = true;
  document.getElementById('chatSendBtn').disabled = true;

  // Tambahkan ke history
  chatHistory.push({ role: 'user', content: msg });

  // Tampilkan animasi typing
  const typingId = 'typing-' + Date.now();
  const el = document.getElementById('chatMessages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-msg bot';
  typingDiv.id = typingId;
  typingDiv.innerHTML = `<div class="chat-bubble typing-indicator"><span></span><span></span><span></span></div>`;
  el.appendChild(typingDiv);
  el.scrollTop = el.scrollHeight;

  try {
    let reply;
    if (CLAUDE_API_KEY.includes('GANTI')) {
      // Fallback ke rule-based jika API key belum diisi
      await new Promise(r => setTimeout(r, 600));
      reply = generateLocalReply(msg.toLowerCase());
    } else {
      reply = await callClaudeAPI(msg);
    }

    // Hapus typing
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    addChatMsg(reply, 'bot');
    chatHistory.push({ role: 'assistant', content: reply.replace(/<[^>]+>/g, '') });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

  } catch (err) {
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    addChatMsg('Maaf, terjadi kesalahan. Coba lagi ya 😅', 'bot');
  }

  chatTyping = false;
  document.getElementById('chatSendBtn').disabled = false;
  document.getElementById('chatInput').focus();
}

async function callClaudeAPI(userMsg) {
  // Buat konteks data kelas untuk AI
  const tugasSummary = tugas.slice(0, 10).map(t => {
    const cd = getCountdown(t.deadline);
    const st = currentUser.role === 'siswa' ? getStatusTugas(t.id) : null;
    return `- ${t.judul} (${t.mapel}) | Deadline: ${formatDate(t.deadline)} | ${cd.text}${st ? ' | Status saya: ' + st : ''}`;
  }).join('\n');

  const pengumumanSummary = pengumumanList.slice(0, 5).map(p =>
    `- [${p.penting ? 'PENTING' : 'Info'}] ${p.judul}: ${p.isi.slice(0, 100)}...`
  ).join('\n');

  const statsSiswa = currentUser.role === 'siswa' ? `
- Tugas selesai: ${pengumpulan.filter(p=>p.siswa_id===currentUser.id&&p.status==='selesai').length}
- Tugas belum: ${tugas.filter(t=>getStatusTugas(t.id)==='belum').length}
- Total poin: ${hitungPoin(currentUser.id)}
` : `
- Total siswa: ${siswaList.length}
- Total tugas: ${tugas.length}
- Total pengumpulan: ${pengumpulan.filter(p=>p.status==='selesai').length}
`;

  const systemPrompt = `Kamu adalah Asisten KelasKu yang ramah dan helpful untuk platform manajemen tugas sekolah. Kamu berbicara dalam Bahasa Indonesia yang santai dan menyenangkan.

DATA KELAS SAAT INI:
Pengguna: ${currentUser.nama} (${currentUser.role === 'admin' ? 'Guru/Admin' : 'Siswa'})
Tanggal: ${new Date().toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}

STATISTIK:${statsSiswa}

TUGAS TERBARU:
${tugasSummary || 'Belum ada tugas'}

PENGUMUMAN TERBARU:
${pengumumanSummary || 'Belum ada pengumuman'}

PANDUAN:
- Jawab pertanyaan singkat, jelas, dan ramah
- Gunakan emoji yang relevan agar lebih menarik
- Jika ditanya soal tugas/deadline/poin, gunakan data di atas
- Jika ditanya pertanyaan pelajaran, bantu sebaik mungkin
- Jangan pernah sebut bahwa kamu Claude atau dibuat Anthropic - kamu adalah "Asisten KelasKu"
- Jaga percakapan tetap positif dan mendukung semangat belajar`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: chatHistory.slice(-8) // kirim 8 pesan terakhir untuk konteks
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'API error');
  }

  const data = await response.json();
  return data.content[0]?.text || 'Maaf, tidak ada respons.';
}

// Fallback rule-based (jika API key belum diisi)
function generateLocalReply(msg) {
  if(msg.includes('hari ini')||msg.includes('tugas apa')){const td=tugas.filter(t=>new Date(t.deadline).toDateString()===new Date().toDateString());return td.length?`Deadline hari ini:<br>${td.map(t=>`• ${t.judul}`).join('<br>')}` :'Tidak ada deadline hari ini 😊';}
  if(msg.includes('belum selesai')&&currentUser.role==='siswa'){const b=tugas.filter(t=>getStatusTugas(t.id)==='belum');return b.length?`${b.length} tugas belum dikerjakan:<br>${b.map(t=>`• ${t.judul}`).join('<br>')}` :'Semua tugasmu sudah dikerjakan! 🎉';}
  if(msg.includes('belum kumpul')&&currentUser.role==='admin'){const bl=siswaList.filter(s=>tugas.some(t=>!pengumpulan.find(p=>p.siswa_id===s.id&&p.tugas_id===t.id&&p.status==='selesai')));return bl.length?`Siswa belum kumpul:<br>${bl.map(s=>`• ${s.nama}`).join('<br>')}` :'Semua siswa sudah mengumpulkan! 🎉';}
  if(msg.includes('pengumuman')){const p=pengumumanList.slice(0,3);return p.length?`Pengumuman terbaru:<br>${p.map(x=>`• ${x.judul}`).join('<br>')}` :'Belum ada pengumuman 📢';}
  if(msg.includes('berapa tugas')) return `Total: <strong>${tugas.length} tugas</strong> 📚`;
  if(msg.includes('poin')&&currentUser.role==='siswa') return `Poinmu: <strong>${hitungPoin(currentUser.id)} poin</strong> ⭐`;
  if(msg.includes('deadline')){const s=[...tugas].filter(t=>getCountdown(t.deadline).type!=='expired').sort((a,b)=>new Date(a.deadline)-new Date(b.deadline)).slice(0,3);return s.length?`Deadline terdekat:<br>${s.map(t=>`• ${t.judul} — ${getCountdown(t.deadline).text}`).join('<br>')}` :'Tidak ada tugas aktif.';}
  if(msg.includes('halo')||msg.includes('hai')) return `Halo, ${currentUser.nama.split(' ')[0]}! 👋 Ada yang bisa dibantu?`;
  return `Maaf, saya belum bisa menjawab itu 😅<br><small style="color:#888">💡 Tip: Isi <code>CLAUDE_API_KEY</code> di app.js untuk AI yang lebih pintar!</small><br><br>Coba tanya: "Tugas hari ini?", "Deadline terdekat?", atau "Berapa poin saya?"`;
}

function addChatMsg(text, role) {
  const el = document.getElementById('chatMessages');
  const d = document.createElement('div');
  d.className = `chat-msg ${role}`;
  d.innerHTML = `<div class="chat-bubble">${text}</div>`;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
}

// ===== SIDEBAR =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}

// ===== INIT =====
window.addEventListener('DOMContentLoaded', async () => {
  if (!initSupabase()) return;

  setLoadMsg('Memeriksa sesi...');

  // Cek localStorage dulu (remember me), lalu sessionStorage
  let savedSession = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);

  if (savedSession) {
    try {
      const u = JSON.parse(savedSession);
      // Verifikasi user masih ada di database
      const { data } = await sb.from('users').select('*').eq('id', u.id).maybeSingle();
      if (data) {
        currentUser = data;
        // Perbarui data tersimpan
        const inLocal = !!localStorage.getItem(STORAGE_KEY);
        (inLocal ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(data));
        await initApp();
        return;
      }
    } catch(e) {}
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  document.getElementById('loadingScreen').classList.add('hidden');
  document.getElementById('loginPage').classList.add('active');
});
