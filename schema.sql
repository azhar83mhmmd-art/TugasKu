-- =====================================================
-- KelasKu — Supabase Schema
-- Jalankan file ini di: Supabase Dashboard → SQL Editor
-- =====================================================

-- Tabel: users (siswa & guru)
create table if not exists public.users (
  id          text primary key,
  nama        text not null,
  username    text not null unique,
  password    text not null,
  role        text not null default 'siswa',  -- 'siswa' atau 'admin'
  avatar      text,
  dibuat      timestamptz default now()
);

-- Tabel: tugas
create table if not exists public.tugas (
  id          text primary key,
  judul       text not null,
  mapel       text not null,
  deskripsi   text not null,
  deadline    timestamptz not null,
  jenis       text default 'individu',
  poin        int default 10,
  dibuat      timestamptz default now(),
  oleh        text references public.users(id) on delete set null
);

-- Tabel: pengumpulan
create table if not exists public.pengumpulan (
  id          text primary key,
  tugas_id    text not null references public.tugas(id) on delete cascade,
  siswa_id    text not null references public.users(id) on delete cascade,
  status      text not null default 'proses',  -- 'proses' atau 'selesai'
  catatan     text default '',
  waktu       timestamptz default now(),
  unique(tugas_id, siswa_id)
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) — Izin akses data
-- =====================================================

-- Aktifkan RLS
alter table public.users       enable row level security;
alter table public.tugas       enable row level security;
alter table public.pengumpulan enable row level security;

-- USERS: semua orang bisa baca (untuk login & daftar)
create policy "users_select_all" on public.users
  for select using (true);

create policy "users_insert_signup" on public.users
  for insert with check (true);

create policy "users_delete_admin" on public.users
  for delete using (true);

-- TUGAS: semua bisa baca, hanya admin yang bisa insert/delete
create policy "tugas_select_all" on public.tugas
  for select using (true);

create policy "tugas_insert_all" on public.tugas
  for insert with check (true);

create policy "tugas_delete_all" on public.tugas
  for delete using (true);

-- PENGUMPULAN: semua bisa baca dan tulis
create policy "pengumpulan_select_all" on public.pengumpulan
  for select using (true);

create policy "pengumpulan_insert_all" on public.pengumpulan
  for insert with check (true);

create policy "pengumpulan_update_all" on public.pengumpulan
  for update using (true);

create policy "pengumpulan_delete_all" on public.pengumpulan
  for delete using (true);

-- =====================================================
-- REALTIME — Aktifkan publikasi realtime
-- =====================================================
-- Jalankan ini juga agar realtime bekerja:

begin;
  -- drop publication kalau sudah ada
  drop publication if exists supabase_realtime;
  -- buat ulang
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.tugas;
alter publication supabase_realtime add table public.pengumpulan;

-- =====================================================
-- SELESAI! Kembali ke app.js dan isi SUPABASE_URL
-- dan SUPABASE_ANON dengan kredensial dari dashboard.
-- =====================================================
