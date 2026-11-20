import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Gamepad2,
  Trophy,
  Users,
  Zap,
  Shield,
  Play,
  Plus,
  LogIn,
  LogOut,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  ChevronRight,
  Monitor,
  Cpu,
  Wifi,
  BookOpen,
  Settings,
  BarChart3,
  UserCheck,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Home,
  LayoutGrid,
  Info,
  HelpCircle,
  Crown,
  Flame,
  Swords,
  Lock,
  Unlock,
  Send,
  ArrowLeft,
  Trash2,
  Edit3,
  Wand2,
  Image as ImageIcon,
  Layers,
  Shuffle,
  Pause,
  StopCircle,
  Eye,
  Save,
  Globe,
  Search,
  Filter,
  Star,
  Upload,
  CheckSquare,
  Puzzle,
  MousePointerClick,
  Database,
  Server,
  Terminal,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Download,
  UserPlus,
  Building2,
  ClipboardList,
  KeyRound,
  History,
  Sliders,
  ChevronLeft,
  XCircle
} from 'lucide-react';

// ============================================================================
// 1. KONFIGURASI & INISIALISASI SUPABASE CLIENT (BROWSER REST & REALTIME ADAPTER)
// ============================================================================
interface SupabaseClient {
  url: string;
  anonKey: string;
  auth: {
    getSession: () => Promise<{ data: { session: { user: any; access_token?: string } | null } }>;
    onAuthStateChange: (cb: (event: string, session: any) => void) => { data: { subscription: { unsubscribe: () => void } } };
    signInWithPassword: (creds: { email: string; password: string }) => Promise<{ data: { user: any } | null; error: any }>;
    signInAnonymously: () => Promise<{ data: { user: any } | null; error: any }>;
    resetPasswordForEmail: (email: string, opts?: { redirectTo?: string }) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
  };
  from: (table: string) => any;
  storage: {
    from: (bucket: string) => {
      upload: (path: string, file: File, opts?: any) => Promise<{ error: any }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
  functions: {
    invoke: (fnName: string, opts?: { body?: any; headers?: Record<string, string> }) => Promise<{ data: any; error: any }>;
  };
  channel: (name: string, opts?: any) => any;
  removeChannel: (ch: any) => void;
}

const SESSION_STORAGE_KEY = 'edu_game_arena_sb_session_v1';

const createClient = (url: string, anonKey: string, _opts?: any): SupabaseClient => {
  const cleanUrl = url.replace(/\/+$/, '');
  let currentSession: { user: any; access_token?: string } | null = null;
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_STORAGE_KEY) : null;
    if (saved) currentSession = JSON.parse(saved);
  } catch {
    // ignore storage parse error
  }

  const authListeners = new Set<(event: string, session: any) => void>();
  const broadcastChannel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('edu-game-arena-supabase-rt') : null;

  const persistSession = (sess: { user: any; access_token?: string } | null) => {
    currentSession = sess;
    try {
      if (typeof localStorage !== 'undefined') {
        if (sess) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sess));
        else localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  const headers = () => ({
    apikey: anonKey,
    Authorization: `Bearer ${currentSession?.access_token || anonKey}`,
    'Content-Type': 'application/json'
  });

  const buildQuery = (table: string) => {
    const filters: string[] = [];
    let selectCols = '*';
    let orderClause = '';
    let limitNum: number | null = null;
    let isSingle = false;

    const builder: any = {
      select: (cols = '*') => {
        selectCols = cols;
        return builder;
      },
      eq: (col: string, val: any) => {
        filters.push(`${col}=eq.${encodeURIComponent(val)}`);
        return builder;
      },
      ilike: (col: string, val: any) => {
        filters.push(`${col}=ilike.${encodeURIComponent(val)}`);
        return builder;
      },
      order: (col: string, { ascending = true } = {}) => {
        orderClause = `&order=${col}.${ascending ? 'asc' : 'desc'}`;
        return builder;
      },
      limit: (n: number) => {
        limitNum = n;
        return builder;
      },
      single: () => {
        isSingle = true;
        return builder;
      },
      then: async (resolve: any, reject: any) => {
        try {
          const queryStr = [
            `select=${encodeURIComponent(selectCols)}`,
            ...filters,
            orderClause ? orderClause.slice(1) : '',
            limitNum ? `limit=${limitNum}` : ''
          ]
            .filter(Boolean)
            .join('&');
          const res = await fetch(`${cleanUrl}/rest/v1/${table}?${queryStr}`, {
            headers: headers()
          });
          if (!res.ok) {
            return resolve({ data: null, error: { message: res.statusText } });
          }
          const json = await res.json();
          const finalData = isSingle ? (Array.isArray(json) ? json[0] || null : json) : json;
          resolve({ data: finalData, error: null });
        } catch (err) {
          if (reject) reject(err);
          else resolve({ data: null, error: err });
        }
      },
      insert: async (payload: any) => {
        try {
          const res = await fetch(`${cleanUrl}/rest/v1/${table}`, {
            method: 'POST',
            headers: { ...headers(), Prefer: 'return=representation' },
            body: JSON.stringify(payload)
          });
          return { data: res.ok ? await res.json() : null, error: res.ok ? null : { message: res.statusText } };
        } catch (err) {
          return { data: null, error: err };
        }
      },
      update: (payload: any) => ({
        eq: async (col: string, val: any) => {
          try {
            const res = await fetch(`${cleanUrl}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`, {
              method: 'PATCH',
              headers: { ...headers(), Prefer: 'return=representation' },
              body: JSON.stringify(payload)
            });
            return { data: res.ok ? await res.json() : null, error: res.ok ? null : { message: res.statusText } };
          } catch (err) {
            return { data: null, error: err };
          }
        }
      }),
      upsert: async (payload: any) => {
        try {
          const res = await fetch(`${cleanUrl}/rest/v1/${table}`, {
            method: 'POST',
            headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=representation' },
            body: JSON.stringify(payload)
          });
          return { data: res.ok ? await res.json() : null, error: res.ok ? null : { message: res.statusText } };
        } catch (err) {
          return { data: null, error: err };
        }
      },
      delete: () => ({
        eq: async (col: string, val: any) => {
          try {
            const res = await fetch(`${cleanUrl}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`, {
              method: 'DELETE',
              headers: headers()
            });
            return { error: res.ok ? null : { message: res.statusText } };
          } catch (err) {
            return { error: err };
          }
        }
      })
    };
    return builder;
  };

  return {
    url: cleanUrl,
    anonKey,
    auth: {
      getSession: async () => ({ data: { session: currentSession } }),
      onAuthStateChange: (cb) => {
        authListeners.add(cb);
        return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
      },
      signInWithPassword: async ({ email, password }) => {
        try {
          const res = await fetch(`${cleanUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { apikey: anonKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) return { data: null, error: data };
          const sess = { user: data.user, access_token: data.access_token };
          persistSession(sess);
          authListeners.forEach((cb) => cb('SIGNED_IN', sess));
          return { data: { user: data.user }, error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      },
      signInAnonymously: async () => {
        try {
          const res = await fetch(`${cleanUrl}/auth/v1/signup`, {
            method: 'POST',
            headers: { apikey: anonKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          const data = await res.json();
          if (res.ok && data?.user) {
            const sess = { user: data.user, access_token: data.access_token };
            persistSession(sess);
            return { data: { user: data.user }, error: null };
          }
          return { data: null, error: data };
        } catch (err) {
          return { data: null, error: err };
        }
      },
      resetPasswordForEmail: async (email, opts) => {
        try {
          const res = await fetch(`${cleanUrl}/auth/v1/recover`, {
            method: 'POST',
            headers: { apikey: anonKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, redirect_to: opts?.redirectTo || window.location.origin })
          });
          return { error: res.ok ? null : await res.json().catch(() => ({ message: res.statusText })) };
        } catch (err) {
          return { error: err };
        }
      },
      signOut: async () => {
        persistSession(null);
        authListeners.forEach((cb) => cb('SIGNED_OUT', null));
      }
    },
    from: (table: string) => buildQuery(table),
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: File) => {
          try {
            const res = await fetch(`${cleanUrl}/storage/v1/object/${bucket}/${path}`, {
              method: 'POST',
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${currentSession?.access_token || anonKey}`,
                'Content-Type': file.type || 'application/octet-stream',
                'x-upsert': 'true'
              },
              body: file
            });
            return { error: res.ok ? null : { message: res.statusText } };
          } catch (err) {
            return { error: err };
          }
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `${cleanUrl}/storage/v1/object/public/${bucket}/${path}` }
        })
      })
    },
    functions: {
      invoke: async (fnName: string, opts?: { body?: any; headers?: Record<string, string> }) => {
        try {
          const res = await fetch(`${cleanUrl}/functions/v1/${fnName}`, {
            method: 'POST',
            headers: { ...headers(), ...(opts?.headers || {}) },
            body: JSON.stringify(opts?.body || {})
          });
          const data = res.ok ? await res.json().catch(() => null) : await res.json().catch(() => null);
          return { data, error: res.ok ? null : data || { message: res.statusText } };
        } catch (err) {
          return { data: null, error: err };
        }
      }
    },
    channel: (name: string) => {
      const listeners: { event: string; cb: (payload: any) => void }[] = [];
      if (broadcastChannel) {
        broadcastChannel.onmessage = (ev) => {
          if (ev.data?.channel === name) {
            listeners
              .filter((l) => l.event === ev.data.event)
              .forEach((l) => l.cb({ payload: ev.data.payload }));
          }
        };
      }
      const ch: any = {
        on: (_type: string, filter: { event: string }, cb: (payload: any) => void) => {
          listeners.push({ event: filter.event, cb });
          return ch;
        },
        subscribe: (cb?: (status: string) => void) => {
          if (cb) cb('SUBSCRIBED');
          return ch;
        },
        track: async (_presencePayload: any) => {},
        presenceState: () => ({}),
        send: async ({ event, payload }: { type?: string; event: string; payload: any }) => {
          broadcastChannel?.postMessage({ channel: name, event, payload });
        }
      };
      return ch;
    },
    removeChannel: () => {}
  };
};

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
      return (import.meta as any).env[key];
    }
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && (window as any)[key]) {
    return (window as any)[key];
  }
  if (typeof localStorage !== 'undefined' && localStorage.getItem(key)) {
    return localStorage.getItem(key) || '';
  }
  return '';
};

const INITIAL_SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const INITIAL_SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

let supabase: SupabaseClient | null = null;
if (INITIAL_SUPABASE_URL && INITIAL_SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(INITIAL_SUPABASE_URL, INITIAL_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  } catch (err) {
    console.warn('Gagal menginisialisasi Supabase client, menjalankan dalam Mode Demo.', err);
  }
}

// ============================================================================
// 2. ARSITEKTUR SQL MIGRATION, RLS POLICIES, STORAGE & EDGE FUNCTIONS SUPABASE
// ============================================================================
const SUPABASE_PROJECT_STRUCTURE = `edu-game-arena/
├── .env.local                          # VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
├── src/
│   ├── lib/
│   │   └── supabaseClient.ts           # Inisialisasi Supabase Client & Realtime
│   ├── services/
│   │   ├── authService.ts              # Supabase Auth & Profile Role Guard
│   │   ├── gameStudioService.ts        # CRUD Games, Questions, Assets & Storage
│   │   └── multiplayerService.ts       # Realtime Broadcast, Presence & Edge Calls
│   └── components/
│       └── EduGameArena.tsx            # UI Portal, Game Creator Studio & Arena
└── supabase/
    ├── migrations/
    │   └── 202611200001_edu_game_arena_schema.sql
    └── functions/
        ├── create-room/index.ts
        ├── join-room/index.ts
        ├── start-game/index.ts
        ├── submit-answer/index.ts
        ├── calculate-score/index.ts
        ├── next-question/index.ts
        ├── finish-game/index.ts
        └── get-leaderboard/index.ts`;

const SUPABASE_SQL_MIGRATION = `-- ============================================================================
-- MIGRATION SQL LENGKAP: EDU GAME ARENA + ADMIN & SCHOOL MANAGEMENT + RLS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL CHECK (code IN ('super_admin', 'admin', 'teacher', 'student')),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.roles (code, name, description) VALUES
  ('super_admin', 'Super Admin', 'Akses penuh seluruh sistem, bootstrap admin_darulfikri, dan audit'),
  ('admin', 'Administrator Sekolah', 'Mengelola guru, siswa, kelas, game, dan laporan sekolah'),
  ('teacher', 'Guru / Host', 'Membuat game di Creator Studio dan membuka room multiplayer'),
  ('student', 'Siswa / Player', 'Bergabung ke room, bermain, dan mengumpulkan XP')
ON CONFLICT (code) DO NOTHING;

-- 2. CLASSES (Data Kelas Sekolah)
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  grade_level TEXT NOT NULL DEFAULT 'XI',
  major TEXT NOT NULL DEFAULT 'RPL / TKJ',
  homeroom_teacher_id UUID,
  academic_year TEXT NOT NULL DEFAULT '2026/2027',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PROFILES (Terhubung ke auth.users, mendukung username unik seperti admin_darulfikri)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role_code TEXT NOT NULL DEFAULT 'student' REFERENCES public.roles(code),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  nip_nis TEXT UNIQUE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  class_name TEXT,
  avatar_url TEXT DEFAULT '🎮',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  total_wins INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role_code);
CREATE INDEX IF NOT EXISTS idx_profiles_nip_nis ON public.profiles(nip_nis);

-- 4. AUDIT_LOGS (Rekam jejak tindakan penting Admin & Super Admin)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_username TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 5. GAMES, QUESTIONS, ANSWERS, ROOMS, RESULTS
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_name TEXT NOT NULL,
  template_code TEXT NOT NULL,
  category_name TEXT NOT NULL DEFAULT 'Game Buatan Guru',
  subject_name TEXT NOT NULL DEFAULT 'Produktif SMK',
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  grade_level TEXT DEFAULT 'Kelas XI',
  difficulty TEXT NOT NULL DEFAULT 'Sedang',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'disabled')),
  multiplayer_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  plays_count INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  prompt TEXT NOT NULL,
  image_url TEXT,
  points INTEGER NOT NULL DEFAULT 100,
  duration_sec INTEGER NOT NULL DEFAULT 20,
  content_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID UNIQUE NOT NULL REFERENCES public.game_questions(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  correct_payload JSONB NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(8) UNIQUE NOT NULL,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE RESTRICT,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  host_name TEXT NOT NULL,
  play_mode TEXT NOT NULL DEFAULT 'individu',
  max_players INTEGER NOT NULL DEFAULT 40,
  duration_per_question INTEGER NOT NULL DEFAULT 20,
  difficulty TEXT NOT NULL DEFAULT 'Sedang',
  status TEXT NOT NULL DEFAULT 'waiting',
  current_question_index INTEGER NOT NULL DEFAULT 0,
  question_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.room_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  class_name TEXT,
  team_name TEXT,
  avatar TEXT DEFAULT '🎮',
  score INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.player_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.game_questions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  submitted_payload JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  response_time_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, question_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.game_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  teacher_name TEXT,
  game_title TEXT NOT NULL,
  player_id UUID NOT NULL,
  player_name TEXT NOT NULL,
  class_name TEXT,
  final_rank INTEGER NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  answers_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES BERBASIS ROLE
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- Helper function cek role user saat ini
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role_code FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles: Semua user login dapat melihat profil dasar; Admin & Super Admin kelola semua; User biasa tidak bisa ubah role/status sendiri
CREATE POLICY "profiles_read_authenticated" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL
  USING (public.current_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "profiles_self_update_non_sensitive" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role_code = (SELECT role_code FROM public.profiles WHERE id = auth.uid())
    AND is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid())
  );

-- Classes: Dibaca semua, dikelola admin/super_admin
CREATE POLICY "classes_read_all" ON public.classes FOR SELECT USING (true);
CREATE POLICY "classes_admin_manage" ON public.classes FOR ALL
  USING (public.current_user_role() IN ('super_admin', 'admin'));

-- Audit Logs: Hanya Super Admin & Admin yang dapat melihat/mencatat
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs FOR SELECT
  USING (public.current_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "audit_logs_admin_insert" ON public.audit_logs FOR INSERT
  WITH CHECK (public.current_user_role() IN ('super_admin', 'admin'));

-- Games & Answers
CREATE POLICY "games_select_policy" ON public.games FOR SELECT
  USING (status = 'published' OR owner_id = auth.uid() OR public.current_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "games_manage_policy" ON public.games FOR ALL
  USING (owner_id = auth.uid() OR public.current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "game_answers_restricted" ON public.game_answers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_answers.game_id AND g.owner_id = auth.uid())
    OR public.current_user_role() IN ('super_admin', 'admin')
  );

-- Game Results: Siswa lihat miliknya; Guru lihat hasil gamenya; Admin lihat semua
CREATE POLICY "game_results_select_policy" ON public.game_results FOR SELECT
  USING (
    player_id = auth.uid()
    OR public.current_user_role() IN ('super_admin', 'admin', 'teacher')
  );`;

const SUPABASE_EDGE_FUNCTIONS_CODE = `// ============================================================================
// 1. EDGE FUNCTION: supabase/functions/bootstrap-super-admin/index.ts
// Bootstrap aman akun super_admin awal (username: admin_darulfikri)
// Membutuhkan header x-bootstrap-secret yang cocok dengan env BOOTSTRAP_SECRET
// ============================================================================
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const secretHeader = req.headers.get("x-bootstrap-secret");
  const expectedSecret = Deno.env.get("BOOTSTRAP_SECRET");

  if (!expectedSecret || secretHeader !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized bootstrap secret" }), { status: 401 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Cek apakah super_admin sudah pernah di-bootstrap sebelumnya
  const { data: existingAdmin } = await supabaseAdmin
    .from("profiles")
    .select("id, username")
    .eq("username", "admin_darulfikri")
    .maybeSingle();

  if (existingAdmin) {
    return new Response(JSON.stringify({ error: "Super admin admin_darulfikri sudah aktif." }), { status: 409 });
  }

  const { email, password, full_name } = await req.json();
  if (!email || !password || password.length < 8) {
    return new Response(JSON.stringify({ error: "Email dan password minimal 8 karakter wajib diisi." }), { status: 400 });
  }

  // 1. Buat user di Supabase Auth via Admin API
  const { data: createdAuth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: "admin_darulfikri", role: "super_admin" }
  });

  if (authErr || !createdAuth.user) {
    return new Response(JSON.stringify({ error: authErr?.message || "Gagal membuat user Auth" }), { status: 400 });
  }

  // 2. Simpan ke tabel profiles dengan role super_admin
  await supabaseAdmin.from("profiles").insert({
    id: createdAuth.user.id,
    username: "admin_darulfikri",
    role_code: "super_admin",
    full_name: full_name || "Super Admin Darul Fikri",
    email,
    avatar_url: "👑",
    is_active: true
  });

  // 3. Catat ke audit_logs
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: createdAuth.user.id,
    actor_username: "admin_darulfikri",
    actor_role: "super_admin",
    action: "BOOTSTRAP_SUPER_ADMIN",
    target_table: "profiles",
    target_id: createdAuth.user.id,
    details: { email }
  });

  return new Response(JSON.stringify({ ok: true, username: "admin_darulfikri", user_id: createdAuth.user.id }), {
    headers: { "Content-Type": "application/json" }
  });
});

// ============================================================================
// 2. EDGE FUNCTION: supabase/functions/admin-provision-users/index.ts
// Pembuatan akun Guru/Siswa tunggal atau massal (Import) via Admin API
// Tanpa password umum: mengirimkan undangan / recovery link aman!
// ============================================================================
/*
serve(async (req) => {
  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { users, send_invite } = await req.json();
  const results = [];

  for (const u of users) {
    // Gunakan inviteUserByEmail atau generateLink('recovery') agar user mengatur password pribadi secara aman
    const { data, error } = send_invite
      ? await supabaseAdmin.auth.admin.inviteUserByEmail(u.email, { data: { username: u.username, role: u.role } })
      : await supabaseAdmin.auth.admin.createUser({
          email: u.email,
          email_confirm: true,
          user_metadata: { username: u.username, role: u.role }
        });

    if (!error && data?.user) {
      await supabaseAdmin.from("profiles").upsert({
        id: data.user.id,
        username: u.username,
        role_code: u.role,
        full_name: u.full_name,
        email: u.email,
        nip_nis: u.nip_nis,
        class_name: u.class_name || null,
        is_active: true
      });
      // Generate secure password setup link
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: u.email
      });
      results.push({ email: u.email, status: "created", setup_link: linkData?.properties?.action_link });
    } else {
      results.push({ email: u.email, status: "error", message: error?.message });
    }
  }
  return new Response(JSON.stringify({ results }), { headers: { "Content-Type": "application/json" } });
});
*/`;

// ============================================================================
// 3. DATA BANK SOAL, TEMPLATE GAME CREATOR & SKEMA MANAJEMEN SEKOLAH
// ============================================================================
type GameTemplateType =
  | 'quiz-battle'
  | 'tebak-kata'
  | 'tebak-gambar'
  | 'matching-puzzle'
  | 'drag-and-drop'
  | 'susun-kata'
  | 'memory-match'
  | 'benar-salah';

interface CustomGameQuestion {
  id: string;
  prompt: string;
  imageUrl?: string;
  points: number;
  durationSec: number;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  answerWord?: string;
  clue?: string;
  maxAttempts?: number;
  displayMode?: 'boxes' | 'scrambled';
  pairs?: { id: string; left: string; right: string; imageUrl?: string }[];
  categories?: string[];
  dragItems?: { id: string; label: string; targetCategory: string; imageUrl?: string }[];
  isTrueStatement?: boolean;
}

interface MultiplayerSettings {
  playMode: 'individu' | 'kelompok';
  minPlayers: number;
  maxPlayers: number;
  totalTimeLimitSec: number;
  durationPerQuestion: number;
  pointSystem: 'standar' | 'progresif';
  speedBonus: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  rounds: number;
  allowSelfPlay: boolean;
}

interface GameCatalogItem {
  id: string;
  ownerId: string;
  creatorName: string;
  title: string;
  templateType: GameTemplateType;
  category: string;
  subject: string;
  gradeLevel: string;
  description: string;
  thumbnailUrl?: string;
  minPlayers: number;
  maxPlayers: number;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit';
  status: 'published' | 'draft' | 'disabled';
  playable: boolean;
  accentColor: string;
  badge: string;
  iconType: 'swords' | 'book' | 'cpu' | 'wifi' | 'zap' | 'grid';
  playsCount: number;
  rating: number;
  questions: CustomGameQuestion[];
  multiplayerConfig: MultiplayerSettings;
  createdAt: number;
}

const GAME_TEMPLATES_META: {
  type: GameTemplateType;
  name: string;
  shortDesc: string;
  badge: string;
  accent: string;
}[] = [
  { type: 'quiz-battle', name: 'Quiz Battle', shortDesc: 'Pilihan ganda A-D dengan gambar, poin & bonus kecepatan.', badge: 'POPULER', accent: 'from-cyan-500 to-blue-600' },
  { type: 'tebak-kata', name: 'Tebak Kata', shortDesc: 'Teka-teki istilah dengan petunjuk, kotak huruf & batas percobaan.', badge: 'INTERAKTIF', accent: 'from-purple-500 to-indigo-600' },
  { type: 'tebak-gambar', name: 'Tebak Gambar', shortDesc: 'Tebak nama komponen, simbol, atau objek dari gambar unggahan.', badge: 'VISUAL', accent: 'from-pink-500 to-rose-600' },
  { type: 'matching-puzzle', name: 'Matching Puzzle', shortDesc: 'Pasangkan istilah-definisi atau gambar-nama secara cepat.', badge: 'LOGIKA', accent: 'from-emerald-500 to-teal-600' },
  { type: 'drag-and-drop', name: 'Drag and Drop', shortDesc: 'Kelompokkan objek atau perangkat ke area kategori yang tepat.', badge: 'PRAKTIK', accent: 'from-amber-500 to-orange-600' },
  { type: 'susun-kata', name: 'Susun Kata', shortDesc: 'Susun huruf acak menjadi istilah teknis atau kosakata yang benar.', badge: 'CEPAT', accent: 'from-blue-500 to-indigo-600' },
  { type: 'memory-match', name: 'Memory Match', shortDesc: 'Buka dan cocokkan pasangan kartu memori dengan percobaan minimal.', badge: 'MEMORI', accent: 'from-teal-500 to-cyan-600' },
  { type: 'benar-salah', name: 'Benar atau Salah', shortDesc: 'Evaluasi pernyataan cepat dengan pembahasan otomatis.', badge: 'KILAT', accent: 'from-violet-500 to-purple-600' }
];

const LESSON_CATEGORIES = [
  'Game Komputer',
  'Game Jaringan',
  'Game TKJ',
  'Game Akuntansi',
  'Game Pengetahuan Umum',
  'Game Bahasa',
  'Game Matematika',
  'Game Buatan Guru'
];

const DEFAULT_MULTIPLAYER_CONFIG: MultiplayerSettings = {
  playMode: 'individu',
  minPlayers: 1,
  maxPlayers: 40,
  totalTimeLimitSec: 300,
  durationPerQuestion: 20,
  pointSystem: 'standar',
  speedBonus: true,
  shuffleQuestions: false,
  shuffleOptions: false,
  rounds: 1,
  allowSelfPlay: true
};

const INITIAL_GAMES: GameCatalogItem[] = [
  {
    id: 'quiz-battle',
    ownerId: 'system',
    creatorName: 'Tim Kurikulum SMK',
    title: 'Quiz Battle: Dasar RPL & Jaringan',
    templateType: 'quiz-battle',
    category: 'Game Komputer',
    subject: 'Dasar Program Keahlian',
    gradeLevel: 'Kelas X / XI',
    description: 'Pertarungan kuis cepat tepat seputar Rekayasa Perangkat Lunak, Jaringan, dan Dasar Kejuruan SMK.',
    minPlayers: 1,
    maxPlayers: 40,
    difficulty: 'Sedang',
    status: 'published',
    playable: true,
    accentColor: 'from-cyan-500 to-blue-600',
    badge: 'POPULER • LIVE',
    iconType: 'swords',
    playsCount: 1240,
    rating: 4.9,
    multiplayerConfig: DEFAULT_MULTIPLAYER_CONFIG,
    createdAt: Date.now() - 86400000 * 5,
    questions: [
      {
        id: 'q1',
        prompt: 'Protokol yang digunakan untuk mentransfer halaman web secara terenkripsi dan aman adalah...',
        options: ['HTTP', 'FTP', 'HTTPS', 'SMTP'],
        correctIndex: 2,
        points: 100,
        durationSec: 20,
        explanation: 'HTTPS menggunakan enkripsi TLS/SSL untuk mengamankan komunikasi data di web.'
      },
      {
        id: 'q2',
        prompt: 'Struktur data yang menerapkan prinsip LIFO (Last In, First Out) disebut...',
        options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'],
        correctIndex: 1,
        points: 100,
        durationSec: 20,
        explanation: 'Stack (tumpukan) mengeluarkan elemen yang terakhir kali dimasukkan.'
      },
      {
        id: 'q3',
        prompt: 'Perintah Linux untuk melihat konfigurasi alamat IP pada interface jaringan modern adalah...',
        options: ['ip addr show', 'ls -la', 'chmod 777', 'mkdir net'],
        correctIndex: 0,
        points: 100,
        durationSec: 20,
        explanation: 'ip addr show (atau ip a) adalah perintah standar iproute2 untuk mengecek alamat IP.'
      },
      {
        id: 'q4',
        prompt: 'Dalam basis data relasional, kunci unik yang menghubungkan satu tabel ke primary key tabel lain disebut...',
        options: ['Super Key', 'Candidate Key', 'Foreign Key', 'Composite Key'],
        correctIndex: 2,
        points: 100,
        durationSec: 20,
        explanation: 'Foreign Key menjaga integritas referensial antar tabel dalam database relasional.'
      }
    ]
  },
  {
    id: 'tebak-kata',
    ownerId: 'system',
    creatorName: 'Tim Kurikulum SMK',
    title: 'Tebak Kata Teknologi & Siber',
    templateType: 'tebak-kata',
    category: 'Game TKJ',
    subject: 'Keamanan Jaringan',
    gradeLevel: 'Kelas XI / XII',
    description: 'Pecahkan istilah teknis IT, algoritma, dan perangkat keras sebelum waktu habis!',
    minPlayers: 1,
    maxPlayers: 40,
    difficulty: 'Mudah',
    status: 'published',
    playable: true,
    accentColor: 'from-purple-500 to-indigo-600',
    badge: 'INTERAKTIF • LIVE',
    iconType: 'book',
    playsCount: 980,
    rating: 4.8,
    multiplayerConfig: DEFAULT_MULTIPLAYER_CONFIG,
    createdAt: Date.now() - 86400000 * 4,
    questions: [
      {
        id: 'w1',
        prompt: 'Istilah Keamanan Siber',
        answerWord: 'FIREWALL',
        clue: 'Sistem keamanan jaringan yang memantau dan mengontrol lalu lintas masuk dan keluar berdasarkan aturan keamanan.',
        maxAttempts: 3,
        displayMode: 'boxes',
        points: 150,
        durationSec: 25
      },
      {
        id: 'w2',
        prompt: 'Istilah Pemrograman',
        answerWord: 'ALGORITMA',
        clue: 'Urutan langkah-langkah logis dan sistematis untuk menyelesaikan suatu masalah pemrograman.',
        maxAttempts: 3,
        displayMode: 'boxes',
        points: 150,
        durationSec: 25
      },
      {
        id: 'w3',
        prompt: 'Istilah Jaringan',
        answerWord: 'ROUTER',
        clue: 'Perangkat jaringan yang meneruskan paket data antar jaringan komputer yang berbeda.',
        maxAttempts: 3,
        displayMode: 'scrambled',
        points: 150,
        durationSec: 25
      }
    ]
  },
  {
    id: 'matching-network-1',
    ownerId: 'system',
    creatorName: 'Bapak Hendra, S.Kom',
    title: 'Matching Puzzle: Port & Protokol Jaringan',
    templateType: 'matching-puzzle',
    category: 'Game Jaringan',
    subject: 'Administrasi Infrastruktur Jaringan',
    gradeLevel: 'Kelas XI',
    description: 'Cocokkan pasangan protokol jaringan dengan fungsi atau nomor port standarnya.',
    minPlayers: 1,
    maxPlayers: 30,
    difficulty: 'Sedang',
    status: 'published',
    playable: true,
    accentColor: 'from-emerald-500 to-teal-600',
    badge: 'BARU • INTERAKTIF',
    iconType: 'grid',
    playsCount: 415,
    rating: 4.9,
    multiplayerConfig: DEFAULT_MULTIPLAYER_CONFIG,
    createdAt: Date.now() - 86400000 * 2,
    questions: [
      {
        id: 'mp1',
        prompt: 'Pasangkan Protokol Jaringan dengan Nomor Port Standarnya',
        points: 200,
        durationSec: 40,
        pairs: [
          { id: 'p1', left: 'HTTP', right: 'Port 80' },
          { id: 'p2', left: 'HTTPS', right: 'Port 443' },
          { id: 'p3', left: 'SSH', right: 'Port 22' },
          { id: 'p4', left: 'DNS', right: 'Port 53' }
        ]
      }
    ]
  },
  {
    id: 'dragdrop-hardware-1',
    ownerId: 'system',
    creatorName: 'Ibu Siti Aminah, M.Kom',
    title: 'Drag & Drop: Klasifikasi Perangkat Keras',
    templateType: 'drag-and-drop',
    category: 'Game Komputer',
    subject: 'Komputer & Jaringan Dasar',
    gradeLevel: 'Kelas X',
    description: 'Kelompokkan komponen komputer ke dalam kategori Input Device, Output Device, atau Storage.',
    minPlayers: 1,
    maxPlayers: 35,
    difficulty: 'Mudah',
    status: 'published',
    playable: true,
    accentColor: 'from-amber-500 to-orange-600',
    badge: 'INTERAKTIF',
    iconType: 'cpu',
    playsCount: 530,
    rating: 4.7,
    multiplayerConfig: DEFAULT_MULTIPLAYER_CONFIG,
    createdAt: Date.now() - 86400000,
    questions: [
      {
        id: 'dd1',
        prompt: 'Seret atau tempatkan setiap komponen komputer ke kategori yang tepat!',
        points: 200,
        durationSec: 45,
        categories: ['Input Device', 'Output Device', 'Storage'],
        dragItems: [
          { id: 'di1', label: 'Scanner Barcode', targetCategory: 'Input Device' },
          { id: 'di2', label: 'NVMe SSD 1TB', targetCategory: 'Storage' },
          { id: 'di3', label: 'Monitor OLED', targetCategory: 'Output Device' },
          { id: 'di4', label: 'Mechanical Keyboard', targetCategory: 'Input Device' }
        ]
      }
    ]
  },
  {
    id: 'memory-match-linux',
    ownerId: 'system',
    creatorName: 'Pak Dimas, S.T.',
    title: 'Memory Match: Kartu Pasangan IT',
    templateType: 'memory-match',
    category: 'Game TKJ',
    subject: 'Sistem Operasi Jaringan',
    gradeLevel: 'Kelas XI',
    description: 'Latih daya ingat dengan mencocokkan kartu perintah CLI Linux dan fungsinya.',
    minPlayers: 1,
    maxPlayers: 25,
    difficulty: 'Mudah',
    status: 'published',
    playable: true,
    accentColor: 'from-teal-500 to-cyan-600',
    badge: 'MEMORI',
    iconType: 'grid',
    playsCount: 312,
    rating: 4.8,
    multiplayerConfig: DEFAULT_MULTIPLAYER_CONFIG,
    createdAt: Date.now() - 43200000,
    questions: [
      {
        id: 'mm1',
        prompt: 'Temukan semua pasangan perintah Linux dan fungsinya!',
        points: 200,
        durationSec: 50,
        pairs: [
          { id: 'm1', left: 'mkdir', right: 'Buat Direktori' },
          { id: 'm2', left: 'rm -rf', right: 'Hapus Paksa' },
          { id: 'm3', left: 'ping', right: 'Cek Koneksi' },
          { id: 'm4', left: 'sudo', right: 'Akses Root' }
        ]
      }
    ]
  },
  {
    id: 'benar-salah-akuntansi',
    ownerId: 'system',
    creatorName: 'Ibu Ratna, S.E.',
    title: 'Benar atau Salah: Dasar Akuntansi & Logika',
    templateType: 'benar-salah',
    category: 'Game Akuntansi',
    subject: 'Dasar Akuntansi Keuangan',
    gradeLevel: 'Kelas X',
    description: 'Uji ketepatan konsep debit-kredit dan persamaan dasar akuntansi dalam waktu singkat.',
    minPlayers: 1,
    maxPlayers: 40,
    difficulty: 'Mudah',
    status: 'published',
    playable: true,
    accentColor: 'from-violet-500 to-purple-600',
    badge: 'KILAT',
    iconType: 'zap',
    playsCount: 289,
    rating: 4.8,
    multiplayerConfig: DEFAULT_MULTIPLAYER_CONFIG,
    createdAt: Date.now() - 21600000,
    questions: [
      {
        id: 'bs1',
        prompt: 'Persamaan Dasar Akuntansi dinyatakan sebagai: Aset = Liabilitas + Ekuitas.',
        isTrueStatement: true,
        explanation: 'Benar! Kekayaan (Aset) perusahaan berasal dari kewajiban (Liabilitas) dan modal pemilik (Ekuitas).',
        points: 100,
        durationSec: 15
      },
      {
        id: 'bs2',
        prompt: 'Bertambahnya akun Kas dicatat di sisi Kredit.',
        isTrueStatement: false,
        explanation: 'Salah! Kas termasuk kelompok Aset yang saldo normalnya berada di sisi Debit.',
        points: 100,
        durationSec: 15
      }
    ]
  }
];

interface PlayerInRoom {
  uid: string;
  name: string;
  teamName?: string;
  avatar: string;
  score: number;
  correctCount: number;
  isReady: boolean;
  isOnline?: boolean;
  answeredQuestions: Record<string, boolean>;
  finishTimeMs: number;
  joinedAt: number;
}

interface GameRoom {
  id: string;
  code: string;
  gameId: string;
  gameTitle: string;
  templateType: GameTemplateType;
  hostUid: string;
  hostName: string;
  playMode: 'individu' | 'kelompok';
  maxPlayers: number;
  durationPerQuestion: number;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit';
  status: 'waiting' | 'playing' | 'paused' | 'finished' | 'closed';
  currentQuestionIndex: number;
  questionStartTime: number;
  showAnswerReveal: boolean;
  players: Record<string, PlayerInRoom>;
  createdAt: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  role: string;
  avatar: string;
  totalScore: number;
  xp: number;
  wins: number;
  period: 'harian' | 'mingguan' | 'keseluruhan';
}

interface ManagedAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  nipNis: string;
  role: 'super_admin' | 'admin' | 'teacher' | 'student';
  className: string;
  isActive: boolean;
  createdAt: string;
}

interface SchoolClassItem {
  id: string;
  name: string;
  gradeLevel: string;
  major: string;
  academicYear: string;
  studentCount: number;
  isActive: boolean;
}

interface QuizResultRecord {
  id: string;
  studentName: string;
  username: string;
  className: string;
  teacherName: string;
  gameTitle: string;
  playedDate: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  durationSec: number;
  rank: number;
  answersDetail: string;
}

interface AuditLogEntry {
  id: string;
  actorUsername: string;
  actorRole: string;
  action: string;
  target: string;
  timestamp: string;
}

const INITIAL_CLASSES: SchoolClassItem[] = [
  { id: 'cls-1', name: 'X PPLG 1', gradeLevel: 'X', major: 'Pengembangan Perangkat Lunak & Gim', academicYear: '2026/2027', studentCount: 34, isActive: true },
  { id: 'cls-2', name: 'XI RPL 1', gradeLevel: 'XI', major: 'Rekayasa Perangkat Lunak', academicYear: '2026/2027', studentCount: 32, isActive: true },
  { id: 'cls-3', name: 'XI TKJ 2', gradeLevel: 'XI', major: 'Teknik Komputer & Jaringan', academicYear: '2026/2027', studentCount: 35, isActive: true },
  { id: 'cls-4', name: 'XII RPL 1', gradeLevel: 'XII', major: 'Rekayasa Perangkat Lunak', academicYear: '2026/2027', studentCount: 31, isActive: true }
];

const INITIAL_MANAGED_ACCOUNTS: ManagedAccount[] = [
  { id: 'acc-1', username: 'budi_santoso', fullName: 'Bapak Budi Santoso, S.Kom', email: 'budi.santoso@darulfikri.sch.id', nipNis: '198804122015011001', role: 'teacher', className: '', isActive: true, createdAt: '2026-07-15' },
  { id: 'acc-2', username: 'siti_aminah', fullName: 'Ibu Siti Aminah, M.Kom', email: 'siti.aminah@darulfikri.sch.id', nipNis: '199008212017022004', role: 'teacher', className: '', isActive: true, createdAt: '2026-07-15' },
  { id: 'acc-3', username: 'hendra_tkj', fullName: 'Bapak Hendra, S.Kom', email: 'hendra@darulfikri.sch.id', nipNis: '198711032014031002', role: 'teacher', className: '', isActive: true, createdAt: '2026-07-16' },
  { id: 'acc-4', username: 'raka_pratama', fullName: 'Raka Pratama', email: 'raka.pratama@siswa.darulfikri.sch.id', nipNis: '24251001', role: 'student', className: 'XII RPL 1', isActive: true, createdAt: '2026-07-18' },
  { id: 'acc-5', username: 'nadia_putri', fullName: 'Nadia Putri', email: 'nadia.putri@siswa.darulfikri.sch.id', nipNis: '24251002', role: 'student', className: 'XI TKJ 2', isActive: true, createdAt: '2026-07-18' },
  { id: 'acc-6', username: 'dimas_saputra', fullName: 'Dimas Saputra', email: 'dimas.saputra@siswa.darulfikri.sch.id', nipNis: '24251003', role: 'student', className: 'XI RPL 1', isActive: true, createdAt: '2026-07-19' }
];

const INITIAL_QUIZ_RESULTS: QuizResultRecord[] = [
  { id: 'res-1', studentName: 'Raka Pratama', username: 'raka_pratama', className: 'XII RPL 1', teacherName: 'Bapak Budi Santoso, S.Kom', gameTitle: 'Quiz Battle: Dasar RPL & Jaringan', playedDate: '2026-11-20', score: 560, correctCount: 4, wrongCount: 0, durationSec: 42, rank: 1, answersDetail: 'Q1: HTTPS (✓), Q2: Stack (✓), Q3: ip addr show (✓), Q4: Foreign Key (✓)' },
  { id: 'res-2', studentName: 'Nadia Putri', username: 'nadia_putri', className: 'XI TKJ 2', teacherName: 'Bapak Hendra, S.Kom', gameTitle: 'Matching Puzzle: Port & Protokol Jaringan', playedDate: '2026-11-20', score: 420, correctCount: 3, wrongCount: 1, durationSec: 58, rank: 2, answersDetail: 'HTTP:80 (✓), HTTPS:443 (✓), SSH:22 (✓), DNS:53 (✓)' },
  { id: 'res-3', studentName: 'Dimas Saputra', username: 'dimas_saputra', className: 'XI RPL 1', teacherName: 'Ibu Siti Aminah, M.Kom', gameTitle: 'Tebak Kata Teknologi & Siber', playedDate: '2026-11-19', score: 300, correctCount: 2, wrongCount: 1, durationSec: 65, rank: 3, answersDetail: 'W1: FIREWALL (✓), W2: ALGORITMA (✓), W3: SWITCH (✗)' }
];

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'lb-1', name: 'Raka Pratama (XII RPL 1)', role: 'student', avatar: '🦊', totalScore: 14850, xp: 4200, wins: 18, period: 'keseluruhan' },
  { id: 'lb-2', name: 'Nadia Putri (XII TKJ 2)', role: 'student', avatar: '🚀', totalScore: 13900, xp: 3950, wins: 15, period: 'keseluruhan' },
  { id: 'lb-3', name: 'Dimas Saputra (XI RPL 2)', role: 'student', avatar: '⚡', totalScore: 12400, xp: 3400, wins: 12, period: 'keseluruhan' },
  { id: 'lb-4', name: 'Aulia Rahma (XI TKJ 1)', role: 'student', avatar: '🤖', totalScore: 11200, xp: 2980, wins: 10, period: 'keseluruhan' },
  { id: 'lb-5', name: 'Fajar Nugroho (X PPLG 1)', role: 'student', avatar: '🎮', totalScore: 9850, xp: 2540, wins: 8, period: 'keseluruhan' }
];

// ============================================================================
// 4. KOMPONEN UTAMA APLIKASI EDU GAME ARENA (SUPABASE EDITION)
// ============================================================================
export default function App() {
  // Supabase Runtime Config State
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(INITIAL_SUPABASE_URL);
  const [supabaseAnonKeyInput, setSupabaseAnonKeyInput] = useState(INITIAL_SUPABASE_ANON_KEY);
  const [sbClient, setSbClient] = useState<SupabaseClient | null>(supabase);
  const isSupabaseConnected = Boolean(sbClient);

  // Navigation & Auth State (Roles: super_admin, admin, teacher, student)
  const [activePage, setActivePage] = useState<
    | 'landing'
    | 'catalog'
    | 'creator'
    | 'leaderboard'
    | 'about'
    | 'login'
    | 'dashboard'
    | 'lobby'
    | 'game'
    | 'results'
    | 'supabase-guide'
  >('landing');

  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    username: string;
    name: string;
    email: string;
    role: 'super_admin' | 'admin' | 'teacher' | 'student';
    avatar: string;
    xp: number;
    wins: number;
  } | null>(null);

  // Toast Notification (Pengganti alert() / confirm())
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Catalog, Admin Management & School Data State
  const [games, setGames] = useState<GameCatalogItem[]>(INITIAL_GAMES);
  const [lessonCategories, setLessonCategories] = useState<string[]>(LESSON_CATEGORIES);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [allRooms, setAllRooms] = useState<GameRoom[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(DEFAULT_LEADERBOARD);
  const [leaderboardFilter, setLeaderboardFilter] = useState<'harian' | 'mingguan' | 'keseluruhan'>('keseluruhan');
  const [managedAccounts, setManagedAccounts] = useState<ManagedAccount[]>(INITIAL_MANAGED_ACCOUNTS);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClassItem[]>(INITIAL_CLASSES);
  const [quizResults, setQuizResults] = useState<QuizResultRecord[]>(INITIAL_QUIZ_RESULTS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    { id: 'aud-1', actorUsername: 'system', actorRole: 'system', action: 'SCHEMA_INIT', target: 'profiles, classes, game_results', timestamp: '2026-11-20 08:00' }
  ]);
  const [adminMenuTab, setAdminMenuTab] = useState<
    'overview' | 'teachers' | 'students' | 'classes' | 'games' | 'results' | 'import' | 'export' | 'settings'
  >('overview');

  const recordAuditLog = async (action: string, target: string, details: Record<string, any> = {}) => {
    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}`,
      actorUsername: currentUser?.username || 'admin_darulfikri',
      actorRole: currentUser?.role || 'super_admin',
      action,
      target,
      timestamp: new Date().toLocaleString('id-ID')
    };
    setAuditLogs((prev) => [entry, ...prev]);
    if (sbClient && supabaseUser) {
      try {
        await sbClient.from('audit_logs').insert({
          actor_id: supabaseUser.id,
          actor_username: entry.actorUsername,
          actor_role: entry.actorRole,
          action,
          target_table: target,
          details
        });
      } catch {
        // ignore if table not yet migrated
      }
    }
  };

  // Katalog Search & Filter States
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('Semua');
  const [catalogGradeFilter, setCatalogGradeFilter] = useState('Semua');
  const [catalogDifficultyFilter, setCatalogDifficultyFilter] = useState('Semua');
  const [selectedGameDetail, setSelectedGameDetail] = useState<GameCatalogItem | null>(null);

  // Game Creator Studio States
  const [creatorSubView, setCreatorSubView] = useState<'list' | 'editor'>('list');
  const [editingGame, setEditingGame] = useState<GameCatalogItem | null>(null);
  const [isPreviewOverlayOpen, setIsPreviewOverlayOpen] = useState(false);

  // Active Multiplayer / Practice Room State & Online Presence
  const [activeRoom, setActiveRoom] = useState<GameRoom | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);
  const [onlinePresenceUids, setOnlinePresenceUids] = useState<string[]>([]);

  // Login / Join Form States
  const [loginTab, setLoginTab] = useState<'student' | 'teacher' | 'admin' | 'super_admin'>('student');
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentTeamInput, setStudentTeamInput] = useState('Tim Alpha');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [studentAvatarInput, setStudentAvatarInput] = useState('🎮');
  const [staffIdentifierInput, setStaffIdentifierInput] = useState('');
  const [staffPasswordInput, setStaffPasswordInput] = useState('');
  const [staffNameInput, setStaffNameInput] = useState('');
  const [showBootstrapModal, setShowBootstrapModal] = useState(false);
  const [bootstrapEmail, setBootstrapEmail] = useState('');
  const [bootstrapPassword, setBootstrapPassword] = useState('');
  const [bootstrapSecret, setBootstrapSecret] = useState('');

  // Teacher Create Room Modal State
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomGameId, setNewRoomGameId] = useState('quiz-battle');
  const [newRoomPlayMode, setNewRoomPlayMode] = useState<'individu' | 'kelompok'>('individu');
  const [newRoomMaxPlayers, setNewRoomMaxPlayers] = useState(30);
  const [newRoomDuration, setNewRoomDuration] = useState(20);
  const [newRoomDifficulty, setNewRoomDifficulty] = useState<'Mudah' | 'Sedang' | 'Sulit'>('Sedang');

  // Gate Keamanan untuk Akses Panel Konfigurasi Supabase (Wajib Sandi Admin / Super Admin)
  const [showSupabaseAuthGate, setShowSupabaseAuthGate] = useState(false);
  const [sbGateIdentifier, setSbGateIdentifier] = useState('');
  const [sbGatePassword, setSbGatePassword] = useState('');
  const [sbGateVerifying, setSbGateVerifying] = useState(false);

  const handleOpenProtectedSupabaseSetup = () => {
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin')) {
      setActivePage('supabase-guide');
      return;
    }
    setSbGateIdentifier(currentUser?.email || '');
    setSbGatePassword('');
    setShowSupabaseAuthGate(true);
  };

  const handleVerifySupabaseGate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawId = sbGateIdentifier.trim();
    if (!rawId || sbGatePassword.length < 6) {
      showToast('Masukkan username/email Admin dan kata sandi minimal 6 karakter.', 'error');
      return;
    }

    if (!sbClient) {
      showToast('Kredensial Supabase ENV belum terpasang di server ini.', 'error');
      return;
    }

    setSbGateVerifying(true);
    try {
      let resolvedEmail = rawId;
      let resolvedProfile: any = null;

      if (!rawId.includes('@')) {
        const { data: profData, error: profErr } = await sbClient
          .from('profiles')
          .select('*')
          .eq('username', rawId.toLowerCase())
          .single();

        if (profErr || !profData?.email) {
          showToast('Username Admin/Super Admin tidak ditemukan.', 'error');
          return;
        }
        resolvedEmail = profData.email;
        resolvedProfile = profData;
      }

      const { data: authData, error: authErr } = await sbClient.auth.signInWithPassword({
        email: resolvedEmail,
        password: sbGatePassword
      });

      if (authErr || !authData?.user) {
        showToast('Kata sandi Admin/Super Admin tidak valid.', 'error');
        return;
      }

      if (!resolvedProfile) {
        const { data: pRow } = await sbClient
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        resolvedProfile = pRow;
      }

      const roleCode = String(
        resolvedProfile?.role_code || authData.user.user_metadata?.role || ''
      ).toLowerCase();

      if (roleCode !== 'admin' && roleCode !== 'super_admin') {
        showToast('Akses ditolak! Hanya role Admin atau Super Admin yang diizinkan.', 'error');
        return;
      }

      if (resolvedProfile?.is_active === false) {
        showToast('Akun Admin berstatus nonaktif.', 'error');
        return;
      }

      setCurrentUser({
        uid: authData.user.id,
        username: resolvedProfile?.username || resolvedEmail.split('@')[0],
        name: resolvedProfile?.full_name || 'Administrator',
        email: resolvedEmail,
        role: roleCode as 'admin' | 'super_admin',
        avatar: roleCode === 'super_admin' ? '👑' : '🛡️',
        xp: Number(resolvedProfile?.total_xp) || 9999,
        wins: Number(resolvedProfile?.total_wins) || 50
      });

      setShowSupabaseAuthGate(false);
      setSbGatePassword('');
      setActivePage('supabase-guide');
      showToast('Verifikasi Admin berhasil. Panel konfigurasi Supabase dibuka.', 'success');
    } finally {
      setSbGateVerifying(false);
    }
  };

  // Admin & School Dashboard States (Top-level hooks to prevent React Hook order crash on login)
  const [accountSearch, setAccountSearch] = useState('');
  const [accountPage, setAccountPage] = useState(1);
  const [newAccModalOpen, setNewAccModalOpen] = useState<'teacher' | 'student' | null>(null);
  const [formAccFullName, setFormAccFullName] = useState('');
  const [formAccUsername, setFormAccUsername] = useState('');
  const [formAccEmail, setFormAccEmail] = useState('');
  const [formAccNipNis, setFormAccNipNis] = useState('');
  const [formAccClass, setFormAccClass] = useState('XI RPL 1');

  const [newClassName, setNewClassName] = useState('');
  const [newClassMajor, setNewClassMajor] = useState('Rekayasa Perangkat Lunak');

  const [resSearch, setResSearch] = useState('');
  const [resClassFilter, setResClassFilter] = useState('Semua');
  const [resTeacherFilter, setResTeacherFilter] = useState('Semua');
  const [resGameFilter, setResGameFilter] = useState('Semua');
  const [resDateFilter, setResDateFilter] = useState('');
  const [resPage, setResPage] = useState(1);

  const [importTargetRole, setImportTargetRole] = useState<'teacher' | 'student'>('teacher');
  const [importFileName, setImportFileName] = useState('');
  const [importRawHeaders, setImportRawHeaders] = useState<string[]>([]);
  const [importRawRows, setImportRawRows] = useState<string[][]>([]);
  const [colMap, setColMap] = useState<{
    fullName: number;
    username: number;
    nipNis: number;
    email: number;
    password: number;
  }>({ fullName: 0, username: 1, nipNis: 2, email: 3, password: 4 });
  const [isImportingServer, setIsImportingServer] = useState(false);

  // Sub-page states lifted to top-level App so conditional navigation never violates React Rules of Hooks
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>('Semua');
  const [uploadingAsset, setUploadingAsset] = useState<boolean>(false);
  const [lobbyCodeCopied, setLobbyCodeCopied] = useState<boolean>(false);
  const [activeDocTab, setActiveDocTab] = useState<'connect' | 'structure' | 'sql' | 'edge'>('connect');

  const sortedLeaderboardList = useMemo(() => {
    const base =
      leaderboardFilter === 'keseluruhan'
        ? leaderboard
        : leaderboard.filter((item) => item.period === leaderboardFilter || item.period === 'keseluruhan');
    return [...base].sort((a, b) => b.totalScore - a.totalScore);
  }, [leaderboard, leaderboardFilter]);

  // ==========================================================================
  // 5. EFEK SUPABASE AUTH & REALTIME SUBSCRIPTIONS (POSTGRES + PRESENCE + BROADCAST)
  // ==========================================================================
  useEffect(() => {
    if (!sbClient) return;

    sbClient.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        setSupabaseUser(data.session.user);
      }
    });

    const { data: authListener } = sbClient.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user || null);
    });

    // Fetch awal daftar games & leaderboard dari PostgreSQL
    const fetchInitialSupabaseData = async () => {
      try {
        const { data: dbCategories } = await sbClient
          .from('game_categories')
          .select('name')
          .order('created_at', { ascending: true });
        if (dbCategories && dbCategories.length > 0) {
          const names = dbCategories.map((c: any) => c.name).filter(Boolean);
          if (names.length > 0) setLessonCategories(names);
        }

        const { data: dbGames } = await sbClient
          .from('games')
          .select('*, game_questions(*)');
        if (dbGames && dbGames.length > 0) {
          const mapped: GameCatalogItem[] = dbGames.map((g: any) => ({
            id: g.id,
            ownerId: g.owner_id,
            creatorName: g.creator_name,
            title: g.title,
            templateType: g.template_code,
            category: g.category_name,
            subject: g.subject_name,
            gradeLevel: g.grade_level || 'Kelas XI',
            description: g.description || '',
            thumbnailUrl: g.thumbnail_url,
            minPlayers: 1,
            maxPlayers: 40,
            difficulty: g.difficulty || 'Sedang',
            status: g.status || 'published',
            playable: true,
            accentColor: 'from-cyan-500 to-blue-600',
            badge: 'SUPABASE LIVE',
            iconType: 'swords',
            playsCount: g.plays_count || 0,
            rating: Number(g.rating) || 5.0,
            multiplayerConfig: g.multiplayer_config || DEFAULT_MULTIPLAYER_CONFIG,
            questions: (g.game_questions || []).map((q: any) => ({
              id: q.id,
              prompt: q.prompt,
              imageUrl: q.image_url,
              points: q.points,
              durationSec: q.duration_sec,
              ...(q.content_payload || {})
            })),
            createdAt: new Date(g.created_at).getTime()
          }));
          setGames((prev) => {
            const map = new Map<string, GameCatalogItem>();
            INITIAL_GAMES.forEach((ig) => map.set(ig.id, ig));
            mapped.forEach((mg) => map.set(mg.id, mg));
            return Array.from(map.values());
          });
        }

        const { data: dbLb } = await sbClient
          .from('leaderboard')
          .select('*')
          .order('total_score', { ascending: false })
          .limit(20);
        if (dbLb && dbLb.length > 0) {
          const mappedLb: LeaderboardEntry[] = dbLb.map((item: any) => ({
            id: item.id,
            name: item.player_name,
            role: 'student',
            avatar: item.avatar || '🎮',
            totalScore: item.total_score,
            xp: item.total_xp,
            wins: item.wins,
            period: 'keseluruhan'
          }));
          setLeaderboard([...mappedLb, ...DEFAULT_LEADERBOARD].slice(0, 15));
        }
      } catch (err) {
        console.warn('Tabel Supabase belum dimigrasi sepenuhnya, menggunakan data bawaan.', err);
      }
    };

    fetchInitialSupabaseData();

    // Realtime Subscription untuk tabel games & game_rooms
    const globalChannel = sbClient
      .channel('edu-game-arena-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms' },
        (payload) => {
          const updatedRow = payload.new as any;
          if (!updatedRow?.id) return;
          setActiveRoom((prev) => {
            if (!prev || prev.id !== updatedRow.id) return prev;
            return {
              ...prev,
              status: updatedRow.status,
              currentQuestionIndex: updatedRow.current_question_index,
              questionStartTime: updatedRow.question_started_at
                ? new Date(updatedRow.question_started_at).getTime()
                : prev.questionStartTime
            };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players' },
        (payload) => {
          const pRow = payload.new as any;
          if (!pRow?.room_id) return;
          setActiveRoom((prev) => {
            if (!prev || prev.id !== pRow.room_id) return prev;
            return {
              ...prev,
              players: {
                ...prev.players,
                [pRow.player_id]: {
                  uid: pRow.player_id,
                  name: pRow.display_name,
                  teamName: pRow.team_name,
                  avatar: pRow.avatar || '🎮',
                  score: pRow.score || 0,
                  correctCount: pRow.correct_count || 0,
                  isReady: Boolean(pRow.is_ready),
                  isOnline: Boolean(pRow.is_online),
                  answeredQuestions: prev.players?.[pRow.player_id]?.answeredQuestions || {},
                  finishTimeMs: 0,
                  joinedAt: new Date(pRow.joined_at || Date.now()).getTime()
                }
              }
            };
          });
        }
      )
      .subscribe();

    return () => {
      authListener?.subscription?.unsubscribe();
      sbClient.removeChannel(globalChannel);
    };
  }, [sbClient]);

  // Supabase Realtime Channel khusus Room Aktif (Broadcast & Presence)
  useEffect(() => {
    if (!sbClient || !activeRoom || isPracticeMode) return;

    const roomChannel = sbClient.channel(`room:${activeRoom.code}`, {
      config: {
        presence: {
          key: currentUser?.uid || 'guest'
        }
      }
    });

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState();
        setOnlinePresenceUids(Object.keys(state));
      })
      .on('broadcast', { event: 'room_event' }, ({ payload }) => {
        if (payload?.room) {
          setActiveRoom(payload.room);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUser) {
          await roomChannel.track({
            uid: currentUser.uid,
            name: currentUser.name,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      sbClient.removeChannel(roomChannel);
    };
  }, [sbClient, activeRoom?.code, isPracticeMode, currentUser?.uid]);

  // Sinkronisasi perpindahan halaman otomatis sesuai status room real-time
  useEffect(() => {
    if (!activeRoom) return;
    if ((activeRoom.status === 'playing' || activeRoom.status === 'paused') && activePage === 'lobby') {
      setActivePage('game');
    } else if (activeRoom.status === 'finished' && activePage === 'game') {
      setActivePage('results');
    } else if (activeRoom.status === 'closed' && (activePage === 'lobby' || activePage === 'game')) {
      showToast('Room telah ditutup oleh Guru/Host.', 'error');
      setActiveRoom(null);
      setActivePage(currentUser ? 'dashboard' : 'landing');
    }
  }, [activeRoom?.status, activePage]);

  // ==========================================================================
  // 6. HELPER SUPABASE STORAGE UPLOAD & DATABASE PERSISTENCE
  // ==========================================================================
  const handleConnectManualSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrlInput.startsWith('https://') || supabaseAnonKeyInput.length < 20) {
      showToast('Masukkan Project URL (https://...) dan Anon/Publishable Key Supabase yang valid.', 'error');
      return;
    }
    try {
      localStorage.setItem('VITE_SUPABASE_URL', supabaseUrlInput.trim());
      localStorage.setItem('VITE_SUPABASE_ANON_KEY', supabaseAnonKeyInput.trim());
      const client = createClient(supabaseUrlInput.trim(), supabaseAnonKeyInput.trim());
      setSbClient(client);
      showToast('Berhasil terhubung ke Supabase Project!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghubungkan ke Supabase.', 'error');
    }
  };

  const handleUploadAssetFile = async (
    file: File,
    bucketName: 'game-thumbnails' | 'game-images' | 'puzzle-assets' | 'player-avatars' = 'game-images'
  ): Promise<string> => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Format file harus berupa gambar (JPG, PNG, WEBP, GIF, SVG).');
    }
    if (file.size > 3 * 1024 * 1024) {
      throw new Error('Ukuran gambar maksimal 3 MB.');
    }

    if (sbClient) {
      const ownerFolder = currentUser?.uid || 'public';
      const storagePath = `${ownerFolder}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { error: uploadErr } = await sbClient.storage
        .from(bucketName)
        .upload(storagePath, file, { upsert: true });

      if (!uploadErr) {
        const { data: pubData } = sbClient.storage.from(bucketName).getPublicUrl(storagePath);
        const publicUrl = pubData.publicUrl;

        // Simpan metadata ke tabel game_assets
        await sbClient.from('game_assets').insert({
          owner_id: currentUser?.uid,
          bucket_name: bucketName,
          storage_path: storagePath,
          public_url: publicUrl,
          mime_type: file.type,
          file_size_bytes: file.size
        });

        return publicUrl;
      }
    }

    // Fallback DataURL untuk Mode Demo / Offline Preview
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      reader.readAsDataURL(file);
    });
  };

  const persistGameToDatabase = async (gameItem: GameCatalogItem) => {
    setGames((prev) => {
      const exists = prev.some((g) => g.id === gameItem.id);
      return exists ? prev.map((g) => (g.id === gameItem.id ? gameItem : g)) : [gameItem, ...prev];
    });

    if (sbClient && supabaseUser) {
      try {
        await sbClient.from('games').upsert({
          id: gameItem.id,
          owner_id: supabaseUser.id,
          creator_name: gameItem.creatorName,
          template_code: gameItem.templateType,
          category_name: gameItem.category,
          subject_name: gameItem.subject,
          title: gameItem.title,
          description: gameItem.description,
          thumbnail_url: gameItem.thumbnailUrl || null,
          grade_level: gameItem.gradeLevel,
          difficulty: gameItem.difficulty,
          status: gameItem.status,
          multiplayer_config: gameItem.multiplayerConfig,
          updated_at: new Date().toISOString()
        });

        // Simpan soal & pisahkan kunci jawaban ke game_answers untuk keamanan RLS
        for (let idx = 0; idx < gameItem.questions.length; idx++) {
          const q = gameItem.questions[idx];
          await sbClient.from('game_questions').upsert({
            id: q.id,
            game_id: gameItem.id,
            order_index: idx,
            prompt: q.prompt,
            image_url: q.imageUrl || null,
            points: q.points,
            duration_sec: q.durationSec,
            content_payload: {
              options: q.options,
              clue: q.clue,
              maxAttempts: q.maxAttempts,
              displayMode: q.displayMode,
              pairs: q.pairs,
              categories: q.categories,
              dragItems: q.dragItems
            }
          });

          await sbClient.from('game_answers').upsert({
            question_id: q.id,
            game_id: gameItem.id,
            correct_payload: {
              correctIndex: q.correctIndex,
              answerWord: q.answerWord,
              isTrueStatement: q.isTrueStatement
            },
            explanation: q.explanation || ''
          });
        }
      } catch (err) {
        console.warn('Sinkronisasi tabel Supabase games dilewati (cek migrasi SQL):', err);
      }
    }
  };

  const deleteGameFromDatabase = async (gameId: string) => {
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    if (sbClient) {
      try {
        await sbClient.from('games').delete().eq('id', gameId);
      } catch (err) {
        console.warn('Gagal menghapus game di Supabase:', err);
      }
    }
  };

  // ==========================================================================
  // 7. HELPER OPERASI ROOM & MULTIPLAYER (SUPABASE EDGE FUNCTIONS + REALTIME)
  // ==========================================================================
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const saveRoomToBackend = async (room: GameRoom) => {
    setActiveRoom(room);
    setAllRooms((prev) => {
      const exists = prev.some((r) => r.id === room.id);
      return exists ? prev.map((r) => (r.id === room.id ? room : r)) : [room, ...prev];
    });

    if (sbClient && !isPracticeMode) {
      try {
        // Broadcast event real-time ke seluruh peserta room
        await sbClient.channel(`room:${room.code}`).send({
          type: 'broadcast',
          event: 'room_event',
          payload: { room }
        });

        if (supabaseUser) {
          await sbClient.from('game_rooms').upsert({
            id: room.id,
            room_code: room.code,
            game_id: room.gameId,
            host_id: supabaseUser.id,
            host_name: room.hostName,
            play_mode: room.playMode,
            max_players: room.maxPlayers,
            duration_per_question: room.durationPerQuestion,
            difficulty: room.difficulty,
            status: room.status,
            current_question_index: room.currentQuestionIndex,
            question_started_at: new Date(room.questionStartTime).toISOString()
          });
        }
      } catch (err) {
        console.warn('Sinkronisasi room Supabase berjalan via Broadcast/Local fallback:', err);
      }
    }
  };

  // Guru Membuat Room Baru (Edge Function: create-room)
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !['teacher', 'admin', 'super_admin'].includes(currentUser.role)) {
      showToast('Hanya Guru atau Admin yang dapat membuat room multiplayer.', 'error');
      return;
    }

    const selectedGame = games.find((g) => g.id === newRoomGameId);
    if (!selectedGame || !selectedGame.playable) {
      showToast('Pilih game yang sudah dipublikasikan dan siap dimainkan.', 'error');
      return;
    }

    const code = generateRoomCode();
    const roomId = crypto.randomUUID ? crypto.randomUUID() : `room_${code}_${Date.now()}`;

    if (sbClient) {
      try {
        await sbClient.functions.invoke('create-room', {
          body: {
            room_code: code,
            game_id: selectedGame.id,
            play_mode: newRoomPlayMode,
            max_players: Number(newRoomMaxPlayers),
            duration_per_question: Number(newRoomDuration),
            difficulty: newRoomDifficulty
          }
        });
      } catch {
        // Fallback jika Edge Function belum di-deploy
      }
    }

    const newRoom: GameRoom = {
      id: roomId,
      code,
      gameId: selectedGame.id,
      gameTitle: selectedGame.title,
      templateType: selectedGame.templateType,
      hostUid: currentUser.uid,
      hostName: currentUser.name,
      playMode: newRoomPlayMode,
      maxPlayers: Number(newRoomMaxPlayers),
      durationPerQuestion: Number(newRoomDuration),
      difficulty: newRoomDifficulty,
      status: 'waiting',
      currentQuestionIndex: 0,
      questionStartTime: Date.now(),
      showAnswerReveal: false,
      players: {},
      createdAt: Date.now()
    };

    setIsPracticeMode(false);
    await saveRoomToBackend(newRoom);
    setShowCreateRoomModal(false);
    setActivePage('lobby');
    showToast(`Room ${code} berhasil dibuat! Bagikan kode kepada siswa.`, 'success');
  };

  // Siswa Bergabung ke Room Menggunakan Kode (Edge Function: join-room)
  const handleJoinRoomAsStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = studentNameInput.trim();
    const cleanCode = roomCodeInput.trim().toUpperCase();

    if (!cleanName || cleanName.length < 2) {
      showToast('Masukkan nama pemain minimal 2 karakter.', 'error');
      return;
    }
    if (!cleanCode || cleanCode.length < 4) {
      showToast('Masukkan kode room yang valid.', 'error');
      return;
    }

    let studentUid = supabaseUser?.id || `student_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    if (sbClient && !supabaseUser) {
      try {
        const { data: anonData } = await sbClient.auth.signInAnonymously();
        if (anonData?.user?.id) studentUid = anonData.user.id;
      } catch {
        // fallback guest id
      }
    }

    const userProfile = {
      uid: studentUid,
      username: cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: cleanName,
      email: `${cleanName.toLowerCase().replace(/\s+/g, '')}@siswa.darulfikri.sch.id`,
      role: 'student' as const,
      avatar: studentAvatarInput,
      xp: 1200,
      wins: 2
    };
    setCurrentUser(userProfile);

    let targetRoom = allRooms.find((r) => r.code === cleanCode);

    if (sbClient && !targetRoom) {
      try {
        const { data: dbRoom } = await sbClient
          .from('game_rooms')
          .select('*, games(title, template_code), room_players(*)')
          .eq('room_code', cleanCode)
          .single();

        if (dbRoom) {
          const playersMap: Record<string, PlayerInRoom> = {};
          (dbRoom.room_players || []).forEach((rp: any) => {
            playersMap[rp.player_id] = {
              uid: rp.player_id,
              name: rp.display_name,
              teamName: rp.team_name,
              avatar: rp.avatar || '🎮',
              score: rp.score || 0,
              correctCount: rp.correct_count || 0,
              isReady: Boolean(rp.is_ready),
              answeredQuestions: {},
              finishTimeMs: 0,
              joinedAt: new Date(rp.joined_at).getTime()
            };
          });
          targetRoom = {
            id: dbRoom.id,
            code: dbRoom.room_code,
            gameId: dbRoom.game_id,
            gameTitle: dbRoom.games?.title || 'Arena Multiplayer SMK',
            templateType: dbRoom.games?.template_code || 'quiz-battle',
            hostUid: dbRoom.host_id,
            hostName: dbRoom.host_name,
            playMode: dbRoom.play_mode,
            maxPlayers: dbRoom.max_players,
            durationPerQuestion: dbRoom.duration_per_question,
            difficulty: dbRoom.difficulty,
            status: dbRoom.status,
            currentQuestionIndex: dbRoom.current_question_index,
            questionStartTime: Date.now(),
            showAnswerReveal: false,
            players: playersMap,
            createdAt: new Date(dbRoom.created_at).getTime()
          };
        }
      } catch {
        // fallback ke demo room
      }
    }

    if (!targetRoom && !isSupabaseConnected && cleanCode.length === 6) {
      targetRoom = {
        id: `room_${cleanCode}`,
        code: cleanCode,
        gameId: 'quiz-battle',
        gameTitle: 'Quiz Battle: Dasar RPL & Jaringan',
        templateType: 'quiz-battle',
        hostUid: 'guru-demo',
        hostName: 'Bapak Budi Santoso, S.Kom',
        playMode: 'individu',
        maxPlayers: 35,
        durationPerQuestion: 20,
        difficulty: 'Sedang',
        status: 'waiting',
        currentQuestionIndex: 0,
        questionStartTime: Date.now(),
        showAnswerReveal: false,
        players: {
          'bot-1': {
            uid: 'bot-1',
            name: 'Raka Pratama (XI RPL 1)',
            teamName: 'Tim Cyber',
            avatar: '🦊',
            score: 0,
            correctCount: 0,
            isReady: true,
            answeredQuestions: {},
            finishTimeMs: 0,
            joinedAt: Date.now() - 5000
          }
        },
        createdAt: Date.now() - 10000
      };
    }

    if (!targetRoom) {
      showToast(`Room dengan kode "${cleanCode}" tidak ditemukan. Periksa kembali kode dari Guru.`, 'error');
      return;
    }

    if (targetRoom.status === 'closed' || targetRoom.status === 'finished') {
      showToast('Room ini sudah ditutup atau permainan telah selesai.', 'error');
      return;
    }

    const currentPlayerCount = Object.keys(targetRoom.players || {}).length;
    if (currentPlayerCount >= targetRoom.maxPlayers && !targetRoom.players[studentUid]) {
      showToast('Kapasitas room sudah penuh!', 'error');
      return;
    }

    if (sbClient) {
      try {
        await sbClient.functions.invoke('join-room', {
          body: {
            room_code: cleanCode,
            player_id: studentUid,
            display_name: cleanName,
            team_name: studentTeamInput.trim() || 'Tim Garuda',
            avatar: studentAvatarInput
          }
        });
      } catch {
        // fallback broadcast
      }
    }

    const updatedPlayers = {
      ...(targetRoom.players || {}),
      [studentUid]: {
        uid: studentUid,
        name: cleanName,
        teamName: studentTeamInput.trim() || 'Tim Garuda',
        avatar: studentAvatarInput,
        score: 0,
        correctCount: 0,
        isReady: false,
        isOnline: true,
        answeredQuestions: {},
        finishTimeMs: 0,
        joinedAt: Date.now()
      }
    };

    const updatedRoom: GameRoom = {
      ...targetRoom,
      players: updatedPlayers
    };

    setIsPracticeMode(false);
    await saveRoomToBackend(updatedRoom);
    setActivePage('lobby');
    showToast(`Berhasil bergabung ke room ${cleanCode}!`, 'success');
  };

  // Mulai Mode Latihan Mandiri (Self-Play Mode)
  const handleStartPracticeGame = (gameId: string) => {
    const selectedGame = games.find((g) => g.id === gameId);
    if (!selectedGame || !selectedGame.playable) {
      showToast('Game ini belum dipublikasikan.', 'info');
      return;
    }

    const playerUid = currentUser?.uid || `guest_${Date.now()}`;
    const playerName = currentUser?.name || 'Siswa Latihan';
    const playerAvatar = currentUser?.avatar || '🚀';

    if (!currentUser) {
      setCurrentUser({
        uid: playerUid,
        username: 'siswa_latihan',
        name: playerName,
        email: 'latihan@darulfikri.sch.id',
        role: 'student',
        avatar: playerAvatar,
        xp: 500,
        wins: 0
      });
    }

    const practiceRoom: GameRoom = {
      id: `practice_${Date.now()}`,
      code: 'SELFPLAY',
      gameId: selectedGame.id,
      gameTitle: `${selectedGame.title} (Self-Play Mode)`,
      templateType: selectedGame.templateType,
      hostUid: 'system',
      hostName: 'Arena Latihan Mandiri',
      playMode: 'individu',
      maxPlayers: 1,
      durationPerQuestion: selectedGame.multiplayerConfig?.durationPerQuestion || 25,
      difficulty: selectedGame.difficulty,
      status: 'playing',
      currentQuestionIndex: 0,
      questionStartTime: Date.now(),
      showAnswerReveal: false,
      players: {
        [playerUid]: {
          uid: playerUid,
          name: playerName,
          avatar: playerAvatar,
          score: 0,
          correctCount: 0,
          isReady: true,
          answeredQuestions: {},
          finishTimeMs: 0,
          joinedAt: Date.now()
        }
      },
      createdAt: Date.now()
    };

    setIsPracticeMode(true);
    setActiveRoom(practiceRoom);
    setActivePage('game');
  };

  // Login Guru / Admin / Super Admin via Supabase Auth (mendukung username seperti admin_darulfikri atau email)
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawId = staffIdentifierInput.trim();
    if (!rawId || staffPasswordInput.length < 6) {
      showToast('Masukkan username/email dan kata sandi minimal 6 karakter.', 'error');
      return;
    }

    if (!sbClient) {
      showToast(
        'Backend Supabase belum dihubungkan. Klik tombol "Setup Supabase" di kanan atas untuk memasukkan URL & Anon Key project Anda.',
        'error'
      );
      return;
    }

    let resolvedEmail = rawId;
    let resolvedProfile: any = null;

    // Jika user mengetik username (misal: admin_darulfikri), cari email-nya di tabel profiles
    if (!rawId.includes('@')) {
      const { data: profData, error: profErr } = await sbClient
        .from('profiles')
        .select('*')
        .eq('username', rawId.toLowerCase())
        .single();

      if (profErr || !profData?.email) {
        showToast(
          `Username "${rawId}" belum terdaftar di tabel profiles Supabase. Gunakan Bootstrap Super Admin jika baru pertama kali setup.`,
          'error'
        );
        return;
      }
      if (profData.is_active === false) {
        showToast('Akun Anda dinonaktifkan oleh Administrator Sekolah.', 'error');
        return;
      }
      resolvedEmail = profData.email;
      resolvedProfile = profData;
    }

    const { data, error } = await sbClient.auth.signInWithPassword({
      email: resolvedEmail,
      password: staffPasswordInput
    });

    if (error || !data?.user) {
      showToast(
        error?.message || 'Autentikasi Supabase gagal. Periksa email/username dan kata sandi Anda.',
        'error'
      );
      return;
    }

    // Ambil profil & role aktual dari tabel profiles
    if (!resolvedProfile) {
      const { data: pRow } = await sbClient
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      resolvedProfile = pRow;
    }

    if (resolvedProfile && resolvedProfile.is_active === false) {
      await sbClient.auth.signOut();
      showToast('Akun Anda berstatus nonaktif.', 'error');
      return;
    }

    const rawRole = String(
      resolvedProfile?.role_code || data.user.user_metadata?.role || loginTab || 'teacher'
    ).toLowerCase();
    const actualRole: 'super_admin' | 'admin' | 'teacher' | 'student' =
      rawRole === 'super_admin'
        ? 'super_admin'
        : rawRole === 'admin'
        ? 'admin'
        : rawRole === 'student'
        ? 'student'
        : 'teacher';

    const displayName =
      resolvedProfile?.full_name ||
      staffNameInput.trim() ||
      (actualRole === 'super_admin' ? 'Super Admin Darul Fikri' : resolvedEmail);

    const displayUsername =
      resolvedProfile?.username ||
      data.user.user_metadata?.username ||
      resolvedEmail.split('@')[0];

    setCurrentUser({
      uid: data.user.id,
      username: displayUsername,
      name: displayName,
      email: resolvedEmail,
      role: actualRole,
      avatar: actualRole === 'super_admin' ? '👑' : actualRole === 'admin' ? '🛡️' : '👨‍🏫',
      xp: Number(resolvedProfile?.total_xp) || 9999,
      wins: Number(resolvedProfile?.total_wins) || 50
    });

    setAdminMenuTab('overview');
    setActivePage('dashboard');
    showToast(`Login berhasil sebagai ${displayName} (${actualRole})!`, 'success');
  };

  // Reset Password Aman via Supabase Auth
  const handleSendPasswordReset = async (targetEmail: string) => {
    if (!targetEmail || !targetEmail.includes('@')) {
      showToast('Masukkan alamat email akun yang valid untuk reset kata sandi.', 'error');
      return;
    }
    if (!sbClient) {
      showToast('Hubungkan Supabase terlebih dahulu untuk mengirim email reset password.', 'error');
      return;
    }
    const { error } = await sbClient.auth.resetPasswordForEmail(targetEmail);
    if (error) {
      showToast(error.message || 'Gagal mengirim tautan reset password.', 'error');
    } else {
      await recordAuditLog('PASSWORD_RESET_SENT', 'auth.users', { email: targetEmail });
      showToast(`Tautan reset password aman telah dikirim ke ${targetEmail}.`, 'success');
    }
  };

  // Bootstrap Super Admin Pertama Kali via Edge Function (bootstrap-super-admin)
  const handleBootstrapSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbClient) {
      showToast('Hubungkan URL & Anon Key Supabase terlebih dahulu.', 'error');
      return;
    }
    if (!bootstrapEmail.includes('@') || bootstrapPassword.length < 8 || !bootstrapSecret) {
      showToast('Isi email valid, password minimal 8 karakter, dan Bootstrap Secret dari server.', 'error');
      return;
    }
    const { data, error } = await sbClient.functions.invoke('bootstrap-super-admin', {
      headers: { 'x-bootstrap-secret': bootstrapSecret },
      body: {
        email: bootstrapEmail.trim(),
        password: bootstrapPassword,
        full_name: 'Super Admin Darul Fikri'
      }
    });
    if (error || data?.error) {
      showToast(
        data?.error || error?.message || 'Gagal menjalankan Edge Function bootstrap-super-admin.',
        'error'
      );
      return;
    }
    setShowBootstrapModal(false);
    setStaffIdentifierInput('admin_darulfikri');
    showToast('Akun super_admin (admin_darulfikri) berhasil dibuat di server! Silakan login.', 'success');
  };

  // Toggle Status Siap Siswa di Lobby
  const handleToggleReady = async () => {
    if (!activeRoom || !currentUser) return;
    const player = activeRoom.players[currentUser.uid];
    if (!player) return;

    const updatedRoom: GameRoom = {
      ...activeRoom,
      players: {
        ...activeRoom.players,
        [currentUser.uid]: {
          ...player,
          isReady: !player.isReady
        }
      }
    };
    await saveRoomToBackend(updatedRoom);
  };

  // Guru Memulai Permainan dari Lobby (Edge Function: start-game)
  const handleStartMultiplayerGame = async () => {
    if (!activeRoom || !currentUser) return;
    if (activeRoom.hostUid !== currentUser.uid && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      showToast('Hanya Guru/Host yang dapat memulai pertandingan.', 'error');
      return;
    }

    const playerCount = Object.keys(activeRoom.players).length;
    if (playerCount === 0) {
      showToast('Belum ada siswa yang bergabung ke room. Tunggu minimal 1 siswa.', 'error');
      return;
    }

    if (sbClient) {
      try {
        await sbClient.functions.invoke('start-game', {
          body: { room_id: activeRoom.id }
        });
      } catch {
        // fallback broadcast
      }
    }

    const startedRoom: GameRoom = {
      ...activeRoom,
      status: 'playing',
      currentQuestionIndex: 0,
      questionStartTime: Date.now(),
      showAnswerReveal: false
    };
    await saveRoomToBackend(startedRoom);
    setActivePage('game');
    showToast('Pertandingan dimulai! Timer server & soal tersinkronisasi ke seluruh peserta.', 'success');
  };

  // Guru Menutup Room
  const handleCloseRoom = async (roomToClose?: GameRoom) => {
    const target = roomToClose || activeRoom;
    if (!target) return;
    const closed: GameRoom = { ...target, status: 'closed' };
    await saveRoomToBackend(closed);
    if (activeRoom?.id === target.id) {
      setActiveRoom(null);
      setActivePage('dashboard');
    }
    showToast(`Room ${target.code} telah ditutup.`, 'info');
  };

  // ==========================================================================
  // 8. KOMPONEN NAVBAR FUTURISTIK
  // ==========================================================================
  const Navbar = () => {
    const isCreatorAllowed =
      currentUser && ['super_admin', 'admin', 'teacher'].includes(currentUser.role);

    return (
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070B19]/85 border-b border-indigo-500/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button
            onClick={() => setActivePage('landing')}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-cyan-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/25">
              <div className="w-full h-full bg-[#0A0F24] rounded-[10px] flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-black tracking-wider text-base sm:text-lg bg-gradient-to-r from-emerald-300 via-cyan-400 to-purple-400 bg-clip-text text-transparent block leading-none">
                EDU GAME ARENA
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
                Supabase Multiplayer Builder
              </span>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {[
              { id: 'landing', label: 'Beranda', icon: Home },
              { id: 'catalog', label: 'Daftar Game', icon: LayoutGrid },
              ...(isCreatorAllowed
                ? [{ id: 'creator', label: 'Game Creator Studio', icon: Wand2 }]
                : []),
              { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
              { id: 'about', label: 'Tentang', icon: Info }
            ].map((item) => {
              const IconComp = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'creator') setCreatorSubView('list');
                    setActivePage(item.id as any);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenProtectedSupabaseSetup}
              title="Dilindungi Sandi Admin / Super Admin"
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer ${
                isSupabaseConnected
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {isSupabaseConnected ? 'Supabase Live' : 'Setup Supabase'}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivePage('dashboard')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 hover:border-cyan-400 transition-all text-xs font-bold text-white cursor-pointer"
                >
                  <span className="text-base">{currentUser.avatar}</span>
                  <span className="hidden sm:inline max-w-[110px] truncate">{currentUser.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] uppercase">
                    {currentUser.role.replace('_', ' ')}
                  </span>
                </button>
                <button
                  onClick={async () => {
                    if (sbClient) await sbClient.auth.signOut();
                    setCurrentUser(null);
                    setActiveRoom(null);
                    setActivePage('landing');
                    showToast('Berhasil keluar dari sesi.', 'info');
                  }}
                  title="Keluar"
                  className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    setLoginTab('teacher');
                    setActivePage('login');
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/10 transition-all cursor-pointer"
                >
                  Login Guru
                </button>
                <button
                  onClick={() => {
                    setLoginTab('student');
                    setActivePage('login');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                >
                  Main Sekarang
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigasi Mobile */}
        <div className="flex lg:hidden border-t border-indigo-500/20 px-2 py-1.5 overflow-x-auto gap-1 justify-around bg-[#070B19]">
          {[
            { id: 'landing', label: 'Beranda', icon: Home },
            { id: 'catalog', label: 'Game', icon: LayoutGrid },
            ...(isCreatorAllowed
              ? [{ id: 'creator', label: 'Studio', icon: Wand2 }]
              : []),
            { id: 'leaderboard', label: 'Rank', icon: Trophy },
            { id: 'supabase-guide', label: 'Supabase', icon: Database }
          ].map((item) => {
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'supabase-guide') {
                    handleOpenProtectedSupabaseSetup();
                  } else {
                    setActivePage(item.id as any);
                  }
                }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold ${
                  activePage === item.id ? 'text-cyan-400' : 'text-slate-400'
                }`}
              >
                <IconComp className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </header>
    );
  };

  // ==========================================================================
  // 9. KARTU GAME KATALOG (GAME CARD)
  // ==========================================================================
  const GameCard: React.FC<{ game: GameCatalogItem }> = ({ game }) => {
    const getIcon = () => {
      switch (game.iconType) {
        case 'swords':
          return <Swords className="w-6 h-6 text-white" />;
        case 'book':
          return <BookOpen className="w-6 h-6 text-white" />;
        case 'cpu':
          return <Cpu className="w-6 h-6 text-white" />;
        case 'wifi':
          return <Wifi className="w-6 h-6 text-white" />;
        case 'grid':
          return <LayoutGrid className="w-6 h-6 text-white" />;
        default:
          return <Zap className="w-6 h-6 text-white" />;
      }
    };

    return (
      <div className="group rounded-3xl bg-[#0D132B] border border-indigo-500/25 hover:border-cyan-400/60 overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between shadow-xl">
        <div>
          <div className={`h-32 bg-gradient-to-br ${game.accentColor} p-5 relative overflow-hidden`}>
            {game.thumbnailUrl && (
              <img
                src={game.thumbnailUrl}
                alt={game.title}
                className="absolute inset-0 w-full h-full object-cover opacity-35"
              />
            )}
            <div className="relative z-10 flex items-start justify-between">
              <div className="w-11 h-11 rounded-2xl bg-slate-950/35 backdrop-blur-md flex items-center justify-center border border-white/20">
                {getIcon()}
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider bg-slate-950/50 text-white backdrop-blur-md">
                {game.badge}
              </span>
            </div>
            <div className="relative z-10 mt-4 flex items-center gap-2 text-[11px] font-bold text-white/95">
              <span>{game.category}</span>
              <span>•</span>
              <span>{game.questions?.length || 0} Soal</span>
            </div>
          </div>

          <div className="p-5 space-y-2.5">
            <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
              {game.title}
            </h3>
            <p className="text-[11px] font-semibold text-cyan-400">
              Oleh: {game.creatorName} • {game.gradeLevel}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{game.description}</p>

            <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-950/90 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                {game.minPlayers}–{game.maxPlayers} Pemain
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg border ${
                  game.difficulty === 'Mudah'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : game.difficulty === 'Sedang'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}
              >
                {game.difficulty}
              </span>
              <span className="px-2 py-1 rounded-lg bg-white/5 text-amber-300 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {game.rating || 4.8} ({game.playsCount || 120}x)
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-2 flex gap-2">
          <button
            onClick={() => setSelectedGameDetail(game)}
            className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
          >
            Detail
          </button>
          <button
            onClick={() => handleStartPracticeGame(game.id)}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:brightness-110 transition-all cursor-pointer"
          >
            Self-Play
          </button>
          <button
            onClick={() => {
              if (currentUser && ['teacher', 'admin', 'super_admin'].includes(currentUser.role)) {
                setNewRoomGameId(game.id);
                setShowCreateRoomModal(true);
              } else {
                setLoginTab('student');
                setActivePage('login');
              }
            }}
            className="py-2.5 px-3 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all cursor-pointer"
          >
            Multiplayer
          </button>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 10. HALAMAN UTAMA (LANDING PAGE)
  // ==========================================================================
  const LandingPage = () => (
    <div className="space-y-20 pb-20">
      <section className="relative overflow-hidden pt-12 pb-8 sm:pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <Database className="w-4 h-4 text-emerald-400" />
                POWERED BY SUPABASE POSTGRESQL & REALTIME
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
                Rancang & Mainkan{' '}
                <span className="bg-gradient-to-r from-emerald-300 via-cyan-400 to-purple-500 bg-clip-text text-transparent">
                  Game Edukasi Live
                </span>{' '}
                Bersama Kelas!
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Guru dapat membuat kuis interaktif, tebak gambar, matching puzzle, hingga drag-and-drop tanpa coding melalui <strong>Game Creator Studio</strong>, didukung validasi skor server-side & Supabase Realtime!
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => {
                    setLoginTab('student');
                    setActivePage('login');
                  }}
                  className="px-7 py-4 rounded-2xl font-black text-sm sm:text-base text-slate-950 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 hover:brightness-110 shadow-xl shadow-cyan-500/25 flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-slate-950" />
                  Main Sekarang (Gabung Room)
                </button>

                <button
                  onClick={() => {
                    if (currentUser && ['teacher', 'admin', 'super_admin'].includes(currentUser.role)) {
                      setActivePage('creator');
                    } else {
                      setLoginTab('teacher');
                      setActivePage('login');
                    }
                  }}
                  className="px-7 py-4 rounded-2xl font-bold text-sm sm:text-base text-white bg-white/5 hover:bg-white/10 border border-indigo-400/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Wand2 className="w-5 h-5 text-cyan-400" />
                  Buka Game Creator Studio
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-indigo-500/20 max-w-lg">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-300">16 Tabel</div>
                  <div className="text-xs text-slate-400 font-medium">PostgreSQL + RLS</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-cyan-400">8 Edge Func</div>
                  <div className="text-xs text-slate-400 font-medium">Anti-Cheat Server</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-purple-400">Presence</div>
                  <div className="text-xs text-slate-400 font-medium">Realtime & Broadcast</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-gradient-to-br from-[#0F1736] via-[#131C42] to-[#1A133B] border border-emerald-400/30 p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-xs font-mono text-slate-400 ml-2">SUPABASE // REALTIME</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                    • 32 SISWA ONLINE
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#070B19]/80 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400">ROOM CODE</span>
                    <span className="font-mono text-lg font-black tracking-widest text-white bg-emerald-500/20 px-3 py-0.5 rounded-lg border border-emerald-400/40">
                      SMK99X
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: 'Raka (XII RPL 1)', score: '1.450 PTS', avatar: '🦊', rank: 1 },
                      { name: 'Nadia (XII TKJ 2)', score: '1.380 PTS', avatar: '🚀', rank: 2 },
                      { name: 'Dimas (XI RPL 2)', score: '1.210 PTS', avatar: '⚡', rank: 3 }
                    ].map((p) => (
                      <div
                        key={p.rank}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 text-xs font-black text-amber-400">#{p.rank}</span>
                          <span className="text-lg">{p.avatar}</span>
                          <span className="text-xs font-bold text-slate-200">{p.name}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-cyan-300">{p.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Arena Populer & Buatan Guru
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Katalog Game Edukasi SMK
            </h2>
          </div>
          <button
            onClick={() => setActivePage('catalog')}
            className="text-sm font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
          >
            Lihat Semua Katalog & Filter <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games
            .filter((g) => g.status === 'published')
            .slice(0, 6)
            .map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
        </div>
      </section>
    </div>
  );

  // ==========================================================================
  // 11. GAME CREATOR STUDIO (BUILDER 8 TEMPLATE + SUPABASE STORAGE + PREVIEW)
  // ==========================================================================
  const GameCreatorStudioPage = () => {
    if (!currentUser || !['teacher', 'admin', 'super_admin'].includes(currentUser.role)) {
      return (
        <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <Lock className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-2xl font-black text-white">Akses Game Creator Studio Terbatas</h2>
          <p className="text-sm text-slate-400">
            Silakan login sebagai Guru (Teacher), Admin, atau Super Admin untuk membuat dan mengelola game.
          </p>
          <button
            onClick={() => {
              setLoginTab('teacher');
              setActivePage('login');
            }}
            className="px-6 py-3 rounded-xl bg-cyan-400 text-slate-950 font-black text-sm cursor-pointer"
          >
            Login Guru / Admin
          </button>
        </div>
      );
    }

    const createBlankQuestionForTemplate = (tpl: GameTemplateType): CustomGameQuestion => {
      const qId = crypto.randomUUID ? crypto.randomUUID() : `q_${Date.now()}_${Math.floor(Math.random() * 999)}`;
      switch (tpl) {
        case 'quiz-battle':
          return {
            id: qId,
            prompt: 'Tuliskan pertanyaan pilihan ganda di sini...',
            options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
            correctIndex: 0,
            points: 100,
            durationSec: 20,
            explanation: ''
          };
        case 'tebak-kata':
          return {
            id: qId,
            prompt: 'Teka-teki / Kategori Istilah',
            answerWord: 'SERVER',
            clue: 'Komputer penyedia layanan data dalam jaringan.',
            maxAttempts: 3,
            displayMode: 'boxes',
            points: 150,
            durationSec: 25
          };
        case 'tebak-gambar':
          return {
            id: qId,
            prompt: 'Tebak nama komponen atau objek pada gambar berikut!',
            answerWord: 'ROUTER',
            clue: 'Perangkat penghubung antar segmen jaringan IP.',
            points: 150,
            durationSec: 25
          };
        case 'matching-puzzle':
          return {
            id: qId,
            prompt: 'Pasangkan istilah di sebelah kiri dengan definisi di sebelah kanan',
            points: 200,
            durationSec: 40,
            pairs: [
              { id: 'p1', left: 'CPU', right: 'Otak Pemroses Komputer' },
              { id: 'p2', left: 'RAM', right: 'Memori Sementara' }
            ]
          };
        case 'drag-and-drop':
          return {
            id: qId,
            prompt: 'Kelompokkan setiap item ke dalam kategori tujuannya',
            points: 200,
            durationSec: 45,
            categories: ['Kategori 1', 'Kategori 2'],
            dragItems: [
              { id: 'd1', label: 'Objek A', targetCategory: 'Kategori 1' },
              { id: 'd2', label: 'Objek B', targetCategory: 'Kategori 2' }
            ]
          };
        case 'susun-kata':
          return {
            id: qId,
            prompt: 'Susun huruf acak berikut menjadi istilah yang tepat',
            answerWord: 'JARINGAN',
            clue: 'Koneksi antar dua atau lebih perangkat komputer.',
            points: 150,
            durationSec: 25
          };
        case 'memory-match':
          return {
            id: qId,
            prompt: 'Temukan seluruh pasangan kartu memori berikut',
            points: 200,
            durationSec: 50,
            pairs: [
              { id: 'm1', left: 'HTML', right: 'Struktur Web' },
              { id: 'm2', left: 'CSS', right: 'Gaya Tampilan' }
            ]
          };
        case 'benar-salah':
          return {
            id: qId,
            prompt: 'Tuliskan pernyataan Benar atau Salah di sini...',
            isTrueStatement: true,
            explanation: 'Penjelasan singkat mengapa pernyataan tersebut benar atau salah.',
            points: 100,
            durationSec: 15
          };
      }
    };

    const startNewGameWithTemplate = (tpl: GameTemplateType) => {
      const meta = GAME_TEMPLATES_META.find((m) => m.type === tpl)!;
      const newGame: GameCatalogItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : `game_${Date.now()}`,
        ownerId: currentUser.uid,
        creatorName: currentUser.name,
        title: `${meta.name} Baru - ${currentUser.name}`,
        templateType: tpl,
        category: 'Game Buatan Guru',
        subject: 'Produktif SMK',
        gradeLevel: 'Kelas XI',
        description: `Game edukasi interaktif berbasis ${meta.name} yang dibuat oleh ${currentUser.name}.`,
        minPlayers: 1,
        maxPlayers: 35,
        difficulty: 'Sedang',
        status: 'draft',
        playable: true,
        accentColor: meta.accent,
        badge: 'KARYA GURU',
        iconType: 'swords',
        playsCount: 0,
        rating: 5.0,
        multiplayerConfig: { ...DEFAULT_MULTIPLAYER_CONFIG },
        questions: [createBlankQuestionForTemplate(tpl)],
        createdAt: Date.now()
      };
      setEditingGame(newGame);
      setCreatorSubView('editor');
    };

    const manageableGames = games.filter((g) => {
      if (currentUser.role === 'admin' || currentUser.role === 'super_admin') return true;
      return g.ownerId === currentUser.uid;
    });

    if (creatorSubView === 'list' || !editingGame) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#0F1736] to-[#1D154A] border border-purple-500/30">
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black">
                SUPABASE GAME BUILDER STUDIO
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
                Game Creator Studio
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Pilih satu dari 8 template interaktif di bawah ini. Gambar otomatis tersimpan ke Supabase Storage.
              </p>
            </div>
            <button
              onClick={() => setActivePage('dashboard')}
              className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold self-start cursor-pointer"
            >
              ← Kembali ke Dashboard
            </button>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-cyan-400" />
              Pilih Template Permainan Baru
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {GAME_TEMPLATES_META.map((tpl) => (
                <button
                  key={tpl.type}
                  onClick={() => startNewGameWithTemplate(tpl.type)}
                  className="text-left p-5 rounded-2xl bg-[#0D132B] border border-indigo-500/25 hover:border-cyan-400 transition-all group space-y-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white bg-gradient-to-r ${tpl.accent}`}>
                      {tpl.badge}
                    </span>
                    <Plus className="w-4 h-4 text-cyan-400 group-hover:scale-125 transition-transform" />
                  </div>
                  <div className="text-base font-black text-white group-hover:text-cyan-300">
                    {tpl.name}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{tpl.shortDesc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">
                {currentUser.role === 'teacher'
                  ? `Game Saya (${manageableGames.length})`
                  : `Manajemen Seluruh Game (${manageableGames.length})`}
              </h2>
              <select
                value={selectedTemplateFilter}
                onChange={(e) => setSelectedTemplateFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-xs text-white"
              >
                <option value="Semua">Semua Template</option>
                {GAME_TEMPLATES_META.map((t) => (
                  <option key={t.type} value={t.type}>{t.name}</option>
                ))}
              </select>
            </div>

            {manageableGames.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-700 rounded-2xl">
                Belum ada game yang dibuat. Pilih salah satu template di atas untuk mulai membuat!
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {manageableGames
                  .filter((g) => selectedTemplateFilter === 'Semua' || g.templateType === selectedTemplateFilter)
                  .map((g) => (
                    <div
                      key={g.id}
                      className="p-5 rounded-2xl bg-[#070B19] border border-slate-800 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
                            {g.templateType}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                              g.status === 'published'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : g.status === 'draft'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {g.status}
                          </span>
                        </div>
                        <h3 className="font-bold text-white text-base">{g.title}</h3>
                        <p className="text-xs text-slate-400">
                          Pembuat: {g.creatorName} • {g.questions?.length || 0} Soal
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setEditingGame(g);
                            setCreatorSubView('editor');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={async () => {
                            const copyGame: GameCatalogItem = {
                              ...g,
                              id: crypto.randomUUID ? crypto.randomUUID() : `game_copy_${Date.now()}`,
                              ownerId: currentUser.uid,
                              creatorName: currentUser.name,
                              title: `${g.title} (Salinan)`,
                              status: 'draft',
                              createdAt: Date.now()
                            };
                            await persistGameToDatabase(copyGame);
                            showToast('Game berhasil diduplikasi sebagai Draft.', 'success');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" /> Duplikat
                        </button>
                        <button
                          onClick={async () => {
                            await deleteGameFromDatabase(g.id);
                            showToast('Game telah dihapus.', 'info');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    const updateQuestionAt = (idx: number, patch: Partial<CustomGameQuestion>) => {
      const nextQs = [...editingGame.questions];
      nextQs[idx] = { ...nextQs[idx], ...patch };
      setEditingGame({ ...editingGame, questions: nextQs });
    };

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#0D132B] border border-cyan-500/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCreatorSubView('list')}
              className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold text-white cursor-pointer"
            >
              ← Kembali
            </button>
            <div>
              <span className="text-[10px] font-black uppercase text-cyan-400">
                EDITOR TEMPLATE: {editingGame.templateType.toUpperCase()}
              </span>
              <h2 className="text-lg font-black text-white">{editingGame.title}</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPreviewOverlayOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4" /> Preview Game
            </button>
            <button
              onClick={async () => {
                const draftGame: GameCatalogItem = { ...editingGame, status: 'draft' };
                setEditingGame(draftGame);
                await persistGameToDatabase(draftGame);
                showToast('Draft game berhasil disimpan ke PostgreSQL!', 'success');
              }}
              className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Simpan Draft
            </button>
            <button
              onClick={async () => {
                if (!editingGame.title.trim() || editingGame.questions.length === 0) {
                  showToast('Judul game dan minimal 1 soal wajib diisi sebelum publikasi.', 'error');
                  return;
                }
                const pubGame: GameCatalogItem = {
                  ...editingGame,
                  status: 'published',
                  playable: true
                };
                setEditingGame(pubGame);
                await persistGameToDatabase(pubGame);
                showToast('Game berhasil dipublikasikan ke Katalog & siap dimainkan Multiplayer!', 'success');
                setCreatorSubView('list');
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="w-4 h-4" /> Publikasikan
            </button>
          </div>
        </div>

        {/* Form Informasi Umum & Pengaturan Multiplayer */}
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-4">
            <h3 className="text-base font-black text-white">1. Informasi Umum Game</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Nama Game</label>
                <input
                  type="text"
                  value={editingGame.title}
                  onChange={(e) => setEditingGame({ ...editingGame, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Kategori Pelajaran</label>
                <select
                  value={editingGame.category}
                  onChange={(e) => setEditingGame({ ...editingGame, category: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                >
                  {lessonCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  value={editingGame.subject}
                  onChange={(e) => setEditingGame({ ...editingGame, subject: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Kelas & Kesulitan</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={editingGame.gradeLevel}
                    onChange={(e) => setEditingGame({ ...editingGame, gradeLevel: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                  />
                  <select
                    value={editingGame.difficulty}
                    onChange={(e) =>
                      setEditingGame({
                        ...editingGame,
                        difficulty: e.target.value as 'Mudah' | 'Sedang' | 'Sulit'
                      })
                    }
                    className="px-3 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                  >
                    <option value="Mudah">Mudah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Sulit">Sulit</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Deskripsi Game</label>
              <textarea
                rows={2}
                value={editingGame.description}
                onChange={(e) => setEditingGame({ ...editingGame, description: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Upload Thumbnail Game (Bucket: game-thumbnails)
              </label>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingAsset}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setUploadingAsset(true);
                    const url = await handleUploadAssetFile(file, 'game-thumbnails');
                    setEditingGame({ ...editingGame, thumbnailUrl: url });
                    showToast('Thumbnail diunggah ke bucket game-thumbnails!', 'success');
                  } catch (err: any) {
                    showToast(err.message || 'Gagal mengunggah thumbnail.', 'error');
                  } finally {
                    setUploadingAsset(false);
                  }
                }}
                className="text-xs text-slate-300"
              />
            </div>
          </div>

          <div className="lg:col-span-5 rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-4">
            <h3 className="text-base font-black text-white">2. Pengaturan Multiplayer & Poin</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Mode Tim</label>
                <select
                  value={editingGame.multiplayerConfig.playMode}
                  onChange={(e) =>
                    setEditingGame({
                      ...editingGame,
                      multiplayerConfig: {
                        ...editingGame.multiplayerConfig,
                        playMode: e.target.value as 'individu' | 'kelompok'
                      }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-white"
                >
                  <option value="individu">Individu</option>
                  <option value="kelompok">Kelompok / Tim</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Durasi Default (Detik)</label>
                <input
                  type="number"
                  value={editingGame.multiplayerConfig.durationPerQuestion}
                  onChange={(e) =>
                    setEditingGame({
                      ...editingGame,
                      multiplayerConfig: {
                        ...editingGame.multiplayerConfig,
                        durationPerQuestion: Number(e.target.value)
                      }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingGame.multiplayerConfig.speedBonus}
                  onChange={(e) =>
                    setEditingGame({
                      ...editingGame,
                      multiplayerConfig: {
                        ...editingGame.multiplayerConfig,
                        speedBonus: e.target.checked
                      }
                    })
                  }
                />
                Aktifkan Bonus Kecepatan Menjawab (Validasi Edge Function)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingGame.multiplayerConfig.shuffleQuestions}
                  onChange={(e) =>
                    setEditingGame({
                      ...editingGame,
                      multiplayerConfig: {
                        ...editingGame.multiplayerConfig,
                        shuffleQuestions: e.target.checked
                      }
                    })
                  }
                />
                Acak Urutan Soal Otomatis
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingGame.multiplayerConfig.allowSelfPlay}
                  onChange={(e) =>
                    setEditingGame({
                      ...editingGame,
                      multiplayerConfig: {
                        ...editingGame.multiplayerConfig,
                        allowSelfPlay: e.target.checked
                      }
                    })
                  }
                />
                Izinkan Self-Play Mode (Latihan Mandiri Siswa)
              </label>
            </div>
          </div>
        </div>

        {/* Editor Daftar Soal / Konten Game */}
        <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white">
              3. Daftar Soal / Tantangan ({editingGame.questions.length})
            </h3>
            <button
              onClick={() =>
                setEditingGame({
                  ...editingGame,
                  questions: [
                    ...editingGame.questions,
                    createBlankQuestionForTemplate(editingGame.templateType)
                  ]
                })
              }
              className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Soal
            </button>
          </div>

          <div className="space-y-4">
            {editingGame.questions.map((q, qIdx) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-[#070B19] border border-slate-800 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-950 text-cyan-300 text-xs font-black">
                    SOAL #{qIdx + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-slate-400">Poin:</span>
                      <input
                        type="number"
                        value={q.points}
                        onChange={(e) => updateQuestionAt(qIdx, { points: Number(e.target.value) })}
                        className="w-16 px-2 py-1 rounded bg-[#0D132B] border border-slate-700 text-white"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-slate-400">Detik:</span>
                      <input
                        type="number"
                        value={q.durationSec}
                        onChange={(e) =>
                          updateQuestionAt(qIdx, { durationSec: Number(e.target.value) })
                        }
                        className="w-14 px-2 py-1 rounded bg-[#0D132B] border border-slate-700 text-white"
                      />
                    </div>
                    {editingGame.questions.length > 1 && (
                      <button
                        onClick={() =>
                          setEditingGame({
                            ...editingGame,
                            questions: editingGame.questions.filter((_, i) => i !== qIdx)
                          })
                        }
                        className="text-rose-400 hover:text-rose-300 text-xs font-bold cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Pertanyaan / Instruksi Soal
                  </label>
                  <input
                    type="text"
                    value={q.prompt}
                    onChange={(e) => updateQuestionAt(qIdx, { prompt: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0D132B] border border-slate-700 text-white text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-[11px] text-slate-400">Gambar Soal (Bucket: game-images):</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await handleUploadAssetFile(file, 'game-images');
                        updateQuestionAt(qIdx, { imageUrl: url });
                        showToast('Gambar soal diunggah ke Supabase Storage!', 'success');
                      } catch (err: any) {
                        showToast(err.message, 'error');
                      }
                    }}
                    className="text-xs text-slate-300"
                  />
                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="Preview" className="h-12 rounded-lg border border-cyan-500/30" />
                  )}
                </div>

                {editingGame.templateType === 'quiz-battle' && q.options && (
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct_${q.id}`}
                          checked={q.correctIndex === oIdx}
                          onChange={() => updateQuestionAt(qIdx, { correctIndex: oIdx })}
                        />
                        <span className="text-xs font-bold text-cyan-400">
                          {String.fromCharCode(65 + oIdx)}.
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const nextOpts = [...q.options!];
                            nextOpts[oIdx] = e.target.value;
                            updateQuestionAt(qIdx, { options: nextOpts });
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-[#0D132B] border border-slate-700 text-white text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {(editingGame.templateType === 'tebak-kata' ||
                  editingGame.templateType === 'tebak-gambar' ||
                  editingGame.templateType === 'susun-kata') && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Kata Kunci Jawaban</label>
                      <input
                        type="text"
                        value={q.answerWord || ''}
                        onChange={(e) =>
                          updateQuestionAt(qIdx, { answerWord: e.target.value.toUpperCase() })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#0D132B] border border-slate-700 text-cyan-300 font-mono font-bold text-xs uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Petunjuk (Clue)</label>
                      <input
                        type="text"
                        value={q.clue || ''}
                        onChange={(e) => updateQuestionAt(qIdx, { clue: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0D132B] border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                )}

                {(editingGame.templateType === 'matching-puzzle' ||
                  editingGame.templateType === 'memory-match') &&
                  q.pairs && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400">Pasangan Item</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuestionAt(qIdx, {
                              pairs: [
                                ...q.pairs!,
                                { id: `p_${Date.now()}`, left: 'Istilah Baru', right: 'Pasangan Baru' }
                              ]
                            })
                          }
                          className="text-xs text-cyan-400 font-bold"
                        >
                          + Tambah Pasangan
                        </button>
                      </div>
                      {q.pairs.map((pair, pIdx) => (
                        <div key={pair.id} className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={pair.left}
                            onChange={(e) => {
                              const nextPairs = [...q.pairs!];
                              nextPairs[pIdx] = { ...pair, left: e.target.value };
                              updateQuestionAt(qIdx, { pairs: nextPairs });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0D132B] border border-slate-700 text-white text-xs"
                          />
                          <input
                            type="text"
                            value={pair.right}
                            onChange={(e) => {
                              const nextPairs = [...q.pairs!];
                              nextPairs[pIdx] = { ...pair, right: e.target.value };
                              updateQuestionAt(qIdx, { pairs: nextPairs });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0D132B] border border-slate-700 text-purple-200 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                {editingGame.templateType === 'drag-and-drop' && q.categories && q.dragItems && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Area Kategori (Pisahkan dengan koma)
                      </label>
                      <input
                        type="text"
                        value={q.categories.join(', ')}
                        onChange={(e) =>
                          updateQuestionAt(qIdx, {
                            categories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-[#0D132B] border border-slate-700 text-amber-300 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Objek yang Diseret</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuestionAt(qIdx, {
                              dragItems: [
                                ...q.dragItems!,
                                {
                                  id: `di_${Date.now()}`,
                                  label: 'Objek Baru',
                                  targetCategory: q.categories![0] || 'Kategori 1'
                                }
                              ]
                            })
                          }
                          className="text-xs text-cyan-400 font-bold"
                        >
                          + Tambah Objek
                        </button>
                      </div>
                      {q.dragItems.map((di, dIdx) => (
                        <div key={di.id} className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={di.label}
                            onChange={(e) => {
                              const nextItems = [...q.dragItems!];
                              nextItems[dIdx] = { ...di, label: e.target.value };
                              updateQuestionAt(qIdx, { dragItems: nextItems });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0D132B] border border-slate-700 text-white text-xs"
                          />
                          <select
                            value={di.targetCategory}
                            onChange={(e) => {
                              const nextItems = [...q.dragItems!];
                              nextItems[dIdx] = { ...di, targetCategory: e.target.value };
                              updateQuestionAt(qIdx, { dragItems: nextItems });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0D132B] border border-slate-700 text-amber-300 text-xs"
                          >
                            {q.categories!.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editingGame.templateType === 'benar-salah' && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Kunci Jawaban</label>
                      <select
                        value={q.isTrueStatement ? 'true' : 'false'}
                        onChange={(e) =>
                          updateQuestionAt(qIdx, { isTrueStatement: e.target.value === 'true' })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#0D132B] border border-slate-700 text-white text-xs"
                      >
                        <option value="true">BENAR</option>
                        <option value="false">SALAH</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Penjelasan Pembahasan</label>
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) => updateQuestionAt(qIdx, { explanation: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0D132B] border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 12. HALAMAN LOGIN & GABUNG ROOM (STUDENT, TEACHER, ADMIN, SUPER_ADMIN)
  // ==========================================================================
  const LoginAndJoinPage = () => {
    const avatars = ['🎮', '🦊', '🚀', '⚡', '🤖', '🐉', '🔥', '🛡️'];
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/30 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-black text-white">Masuk ke EDU GAME ARENA</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Autentikasi Supabase Auth & Gabung Room Multiplayer
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-[#070B19] border border-indigo-500/20">
            {[
              { id: 'student', label: 'Siswa' },
              { id: 'teacher', label: 'Guru' },
              { id: 'admin', label: 'Admin' },
              { id: 'super_admin', label: 'Super Admin' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLoginTab(tab.id as any)}
                className={`py-2.5 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer ${
                  loginTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loginTab === 'student' ? (
            <form onSubmit={handleJoinRoomAsStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">
                  Kode Room dari Guru
                </label>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="Contoh: SMK99X"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#070B19] border border-cyan-500/40 text-white font-mono text-lg font-black tracking-[0.2em] uppercase focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Nama Lengkap & Kelas
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Raka Pratama (XI RPL 1)"
                  value={studentNameInput}
                  onChange={(e) => setStudentNameInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#070B19] border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Nama Kelompok / Tim (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tim Cyber Garuda"
                  value={studentTeamInput}
                  onChange={(e) => setStudentTeamInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Pilih Avatar Pemain
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {avatars.map((av) => (
                    <button
                      type="button"
                      key={av}
                      onClick={() => setStudentAvatarInput(av)}
                      className={`h-10 rounded-xl text-lg flex items-center justify-center border transition-all cursor-pointer ${
                        studentAvatarInput === av
                          ? 'bg-cyan-500/20 border-cyan-400 scale-105'
                          : 'bg-[#070B19] border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-black text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
              >
                GABUNG KE LOBBY MULTIPLAYER
              </button>
            </form>
          ) : (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              {loginTab === 'super_admin' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400" />
                    Akses Super Admin (admin_darulfikri)
                  </div>
                  <p className="text-[11px] text-amber-100/80">
                    Jika baru pertama kali menyiapkan database Supabase, jalankan proses bootstrap server-side terlebih dahulu.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowBootstrapModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer"
                  >
                    Bootstrap Super Admin (admin_darulfikri)
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Username atau Email Institusi
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    loginTab === 'super_admin'
                      ? 'admin_darulfikri atau admin@darulfikri.sch.id'
                      : 'username atau email@darulfikri.sch.id'
                  }
                  value={staffIdentifierInput}
                  onChange={(e) => setStaffIdentifierInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#070B19] border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSendPasswordReset(staffIdentifierInput)}
                    className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer"
                  >
                    Lupa / Reset Password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter..."
                  value={staffPasswordInput}
                  onChange={(e) => setStaffPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#070B19] border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:brightness-110 shadow-lg transition-all cursor-pointer"
              >
                MASUK SEBAGAI {loginTab.replace('_', ' ').toUpperCase()}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 13. DASHBOARD BERBASIS ROLE (TEACHER, ADMIN / SUPER_ADMIN, STUDENT)
  // ==========================================================================
  const RoleDashboard = () => {
    if (!currentUser) {
      return (
        <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <Lock className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-2xl font-black text-white">Silakan Login Terlebih Dahulu</h2>
          <button
            onClick={() => setActivePage('login')}
            className="px-6 py-3 rounded-xl bg-cyan-400 text-slate-950 font-black text-sm cursor-pointer"
          >
            Ke Halaman Login
          </button>
        </div>
      );
    }

    // DASHBOARD GURU / TEACHER
    if (currentUser.role === 'teacher') {
      const myRooms = allRooms.filter((r) => r.hostUid === currentUser.uid);
      const myGames = games.filter((g) => g.ownerId === currentUser.uid);
      const totalStudentsJoined = myRooms.reduce(
        (acc, r) => acc + Object.keys(r.players || {}).length,
        0
      );

      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#0F1736] to-[#1D154A] border border-indigo-500/30">
            <div>
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold">
                DASHBOARD GURU / HOST • SUPABASE
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
                Selamat Datang, {currentUser.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Rancang game di Creator Studio atau buka room multiplayer untuk memulai sesi belajar interaktif.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 self-start">
              <button
                onClick={() => {
                  setCreatorSubView('list');
                  setActivePage('creator');
                }}
                className="px-5 py-3.5 rounded-2xl font-black text-sm text-white bg-purple-600 hover:bg-purple-500 shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Wand2 className="w-5 h-5" />
                Game Creator Studio
              </button>
              <button
                onClick={() => setShowCreateRoomModal(true)}
                className="px-6 py-3.5 rounded-2xl font-black text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:brightness-110 shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Buat Room Multiplayer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Game Buatan Saya', val: myGames.length, icon: Wand2, color: 'text-purple-400' },
              { label: 'Total Room Dibuat', val: myRooms.length, icon: LayoutGrid, color: 'text-cyan-400' },
              { label: 'Siswa Bergabung', val: totalStudentsJoined, icon: Users, color: 'text-emerald-400' },
              {
                label: 'Katalog Tersedia',
                val: games.filter((g) => g.status === 'published').length,
                icon: Gamepad2,
                color: 'text-amber-400'
              }
            ].map((stat, i) => {
              const IconC = stat.icon;
              return (
                <div key={i} className="p-5 rounded-2xl bg-[#0D132B] border border-indigo-500/20">
                  <IconC className={`w-6 h-6 ${stat.color} mb-2`} />
                  <div className="text-2xl font-black text-white">{stat.val}</div>
                  <div className="text-xs text-slate-400 font-semibold">{stat.label}</div>
                </div>
              );
            })}
          </div>

          <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-4">
            <h2 className="text-lg font-black text-white">Riwayat & Room Aktif Anda</h2>
            {myRooms.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-700 rounded-2xl space-y-3">
                <p className="text-sm text-slate-400">Anda belum membuat room multiplayer.</p>
                <button
                  onClick={() => setShowCreateRoomModal(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/40"
                >
                  + Buat Room Sekarang
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {myRooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-5 rounded-2xl bg-[#070B19] border border-indigo-500/25 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-lg text-cyan-400">{room.code}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            room.status === 'waiting'
                              ? 'bg-amber-500/20 text-amber-300'
                              : room.status === 'playing'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white mt-1">{room.gameTitle}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {Object.keys(room.players || {}).length} / {room.maxPlayers} Pemain • {room.difficulty}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {room.status !== 'closed' && room.status !== 'finished' && (
                        <>
                          <button
                            onClick={() => {
                              setActiveRoom(room);
                              setActivePage(room.status === 'playing' ? 'game' : 'lobby');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold hover:bg-cyan-500/30"
                          >
                            Masuk Room
                          </button>
                          <button
                            onClick={() => handleCloseRoom(room)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 text-xs font-bold hover:bg-rose-500/25"
                          >
                            Tutup Room
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // DASHBOARD ADMIN & SUPER ADMIN
    if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
      const teachersList = managedAccounts.filter((a) => a.role === 'teacher');
      const studentsList = managedAccounts.filter((a) => a.role === 'student');
      const activeRoomsCount = allRooms.filter((r) => r.status === 'waiting' || r.status === 'playing').length;
      const avgScore =
        quizResults.length > 0
          ? Math.round(quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length)
          : 0;

      const triggerDownloadBlob = (content: BlobPart, fileName: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };

      const escapeXmlCell = (val: string) =>
        String(val ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');

      const colIndexToLetters = (idx: number): string => {
        let n = idx + 1;
        let letters = '';
        while (n > 0) {
          const rem = (n - 1) % 26;
          letters = String.fromCharCode(65 + rem) + letters;
          n = Math.floor((n - 1) / 26);
        }
        return letters;
      };

      // Generator File .XLSX Biner Asli (ZIP + Office Open XML SpreadsheetML + Styles) sesuai format tabel gambar_3.png
      const buildRealXlsxUint8Array = (
        sheetName: string,
        rowsData: string[][],
        options?: { styledTemplate?: boolean; blankRowsCount?: number }
      ): Uint8Array => {
        const encoder = new TextEncoder();
        const crcTable = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
          let c = i;
          for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
          }
          crcTable[i] = c;
        }
        const computeCrc32 = (bytes: Uint8Array) => {
          let crc = 0xffffffff;
          for (let i = 0; i < bytes.length; i++) {
            crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
          }
          return (crc ^ 0xffffffff) >>> 0;
        };

        const styled = Boolean(options?.styledTemplate);
        const totalBlankRows = options?.blankRowsCount ?? 0;
        const colCount = rowsData[0]?.length || 5;

        const dataRowsXml = rowsData
          .map((row, rIdx) => {
            const styleAttr = styled ? (rIdx === 0 ? ' s="1"' : ' s="2"') : '';
            const cellsXml = row
              .map((cellVal, cIdx) => {
                const ref = `${colIndexToLetters(cIdx)}${rIdx + 1}`;
                return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t>${escapeXmlCell(cellVal)}</t></is></c>`;
              })
              .join('');
            return `<row r="${rIdx + 1}"${rIdx === 0 && styled ? ' ht="22" customHeight="1"' : ''}>${cellsXml}</row>`;
          })
          .join('');

        let extraBlankXml = '';
        if (styled && totalBlankRows > 0) {
          const startRow = rowsData.length + 1;
          const blankRowsArr: string[] = [];
          for (let b = 0; b < totalBlankRows; b++) {
            const rNum = startRow + b;
            let cells = '';
            for (let cIdx = 0; cIdx < colCount; cIdx++) {
              const ref = `${colIndexToLetters(cIdx)}${rNum}`;
              cells += `<c r="${ref}" s="2"/>`;
            }
            blankRowsArr.push(`<row r="${rNum}" ht="19" customHeight="1">${cells}</row>`);
          }
          extraBlankXml = blankRowsArr.join('');
        }

        const colsXml = styled
          ? `<cols><col min="1" max="1" width="24" customWidth="1"/><col min="2" max="2" width="18" customWidth="1"/><col min="3" max="3" width="22" customWidth="1"/><col min="4" max="4" width="28" customWidth="1"/><col min="5" max="5" width="18" customWidth="1"/></cols>`
          : '';

        const stylesXml =
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
          `<fonts count="2">` +
          `<font><sz val="11"/><name val="Calibri"/></font>` +
          `<font><b/><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font>` +
          `</fonts>` +
          `<fills count="3">` +
          `<fill><patternFill patternType="none"/></fill>` +
          `<fill><patternFill patternType="gray125"/></fill>` +
          `<fill><patternFill patternType="solid"><fgColor rgb="FF00B0F0"/><bgColor indexed="64"/></patternFill></fill>` +
          `</fills>` +
          `<borders count="2">` +
          `<border><left/><right/><top/><bottom/><diagonal/></border>` +
          `<border>` +
          `<left style="thin"><color rgb="FF000000"/></left>` +
          `<right style="thin"><color rgb="FF000000"/></right>` +
          `<top style="thin"><color rgb="FF000000"/></top>` +
          `<bottom style="thin"><color rgb="FF000000"/></bottom>` +
          `<diagonal/>` +
          `</border>` +
          `</borders>` +
          `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
          `<cellXfs count="3">` +
          `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
          `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
          `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
          `</cellXfs>` +
          `</styleSheet>`;

        const safeSheetName = escapeXmlCell(sheetName.slice(0, 30) || 'Sheet1');
        const files: { name: string; content: Uint8Array }[] = [
          {
            name: '[Content_Types].xml',
            content: encoder.encode(
              `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
                `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
                `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
                `<Default Extension="xml" ContentType="application/xml"/>` +
                `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
                `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
                `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
                `</Types>`
            )
          },
          {
            name: '_rels/.rels',
            content: encoder.encode(
              `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
                `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
                `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
                `</Relationships>`
            )
          },
          {
            name: 'xl/workbook.xml',
            content: encoder.encode(
              `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
                `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
                `<sheets><sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/></sheets>` +
                `</workbook>`
            )
          },
          {
            name: 'xl/_rels/workbook.xml.rels',
            content: encoder.encode(
              `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
                `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
                `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
                `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
                `</Relationships>`
            )
          },
          {
            name: 'xl/styles.xml',
            content: encoder.encode(stylesXml)
          },
          {
            name: 'xl/worksheets/sheet1.xml',
            content: encoder.encode(
              `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
                `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
                `${colsXml}` +
                `<sheetData>${dataRowsXml}${extraBlankXml}</sheetData>` +
                `</worksheet>`
            )
          }
        ];

        const localChunks: Uint8Array[] = [];
        const centralChunks: Uint8Array[] = [];
        let offset = 0;

        for (const f of files) {
          const nameBytes = encoder.encode(f.name);
          const dataBytes = f.content;
          const crc = computeCrc32(dataBytes);

          const lfh = new Uint8Array(30 + nameBytes.length);
          const lView = new DataView(lfh.buffer);
          lView.setUint32(0, 0x04034b50, true);
          lView.setUint16(4, 20, true);
          lView.setUint16(6, 0, true);
          lView.setUint16(8, 0, true); // STORE (no compression)
          lView.setUint16(10, 0, true);
          lView.setUint16(12, 0, true);
          lView.setUint32(14, crc, true);
          lView.setUint32(18, dataBytes.length, true);
          lView.setUint32(22, dataBytes.length, true);
          lView.setUint16(26, nameBytes.length, true);
          lView.setUint16(28, 0, true);
          lfh.set(nameBytes, 30);

          localChunks.push(lfh, dataBytes);

          const cdh = new Uint8Array(46 + nameBytes.length);
          const cView = new DataView(cdh.buffer);
          cView.setUint32(0, 0x02014b50, true);
          cView.setUint16(4, 20, true);
          cView.setUint16(6, 20, true);
          cView.setUint16(8, 0, true);
          cView.setUint16(10, 0, true);
          cView.setUint16(12, 0, true);
          cView.setUint16(14, 0, true);
          cView.setUint32(16, crc, true);
          cView.setUint32(20, dataBytes.length, true);
          cView.setUint32(24, dataBytes.length, true);
          cView.setUint16(28, nameBytes.length, true);
          cView.setUint16(30, 0, true);
          cView.setUint16(32, 0, true);
          cView.setUint16(34, 0, true);
          cView.setUint16(36, 0, true);
          cView.setUint32(38, 0, true);
          cView.setUint32(42, offset, true);
          cdh.set(nameBytes, 46);

          centralChunks.push(cdh);
          offset += lfh.length + dataBytes.length;
        }

        const centralDirSize = centralChunks.reduce((acc, c) => acc + c.length, 0);
        const eocd = new Uint8Array(22);
        const eView = new DataView(eocd.buffer);
        eView.setUint32(0, 0x06054b50, true);
        eView.setUint16(4, 0, true);
        eView.setUint16(6, 0, true);
        eView.setUint16(8, files.length, true);
        eView.setUint16(10, files.length, true);
        eView.setUint32(12, centralDirSize, true);
        eView.setUint32(16, offset, true);
        eView.setUint16(20, 0, true);

        const totalLen = offset + centralDirSize + eocd.length;
        const result = new Uint8Array(totalLen);
        let pos = 0;
        for (const chunk of [...localChunks, ...centralChunks, eocd]) {
          result.set(chunk, pos);
          pos += chunk.length;
        }
        return result;
      };

      // Pembaca File .XLSX Biner (ZIP / Deflate via DecompressionStream) saat Admin mengunggah kembali file Excel
      const parseRealXlsxRows = async (buffer: ArrayBuffer): Promise<string[][]> => {
        const bytes = new Uint8Array(buffer);
        const view = new DataView(buffer);
        const decoder = new TextDecoder('utf-8');
        const entries: Record<string, string> = {};

        let i = 0;
        while (i + 30 < bytes.length) {
          const sig = view.getUint32(i, true);
          if (sig !== 0x04034b50) break;
          const flags = view.getUint16(i + 6, true);
          const method = view.getUint16(i + 8, true);
          let compSize = view.getUint32(i + 18, true);
          const nameLen = view.getUint16(i + 26, true);
          const extraLen = view.getUint16(i + 28, true);
          const fileName = decoder.decode(bytes.slice(i + 30, i + 30 + nameLen));
          const dataStart = i + 30 + nameLen + extraLen;

          if ((flags & 0x08) !== 0 && compSize === 0) {
            let scan = dataStart;
            while (scan + 16 <= bytes.length) {
              if (view.getUint32(scan, true) === 0x08074b50) {
                compSize = view.getUint32(scan + 8, true);
                break;
              }
              scan++;
            }
          }

          const compData = bytes.slice(dataStart, dataStart + compSize);
          if (fileName.endsWith('.xml')) {
            try {
              if (method === 0) {
                entries[fileName] = decoder.decode(compData);
              } else if (method === 8 && typeof DecompressionStream !== 'undefined') {
                const ds = new DecompressionStream('deflate-raw');
                const writer = ds.writable.getWriter();
                writer.write(compData);
                writer.close();
                const outBuf = await new Response(ds.readable).arrayBuffer();
                entries[fileName] = decoder.decode(outBuf);
              }
            } catch {
              // skip unreadable entry
            }
          }

          i = dataStart + compSize + ((flags & 0x08) !== 0 ? 16 : 0);
        }

        const parser = new DOMParser();
        const sharedStrings: string[] = [];
        if (entries['xl/sharedStrings.xml']) {
          const ssDoc = parser.parseFromString(entries['xl/sharedStrings.xml'], 'application/xml');
          ssDoc.querySelectorAll('si').forEach((si) => {
            sharedStrings.push(si.textContent || '');
          });
        }

        const sheetKey = Object.keys(entries)
          .filter((k) => k.startsWith('xl/worksheets/sheet') && k.endsWith('.xml'))
          .sort()[0];
        if (!sheetKey) return [];

        const sheetDoc = parser.parseFromString(entries[sheetKey], 'application/xml');
        const rows: string[][] = [];
        sheetDoc.querySelectorAll('row').forEach((rowEl) => {
          const rowVals: string[] = [];
          rowEl.querySelectorAll('c').forEach((cEl) => {
            const ref = cEl.getAttribute('r') || '';
            const colLetters = ref.replace(/[0-9]/g, '');
            let colIdx = 0;
            for (let k = 0; k < colLetters.length; k++) {
              colIdx = colIdx * 26 + (colLetters.charCodeAt(k) - 64);
            }
            const targetIdx = colIdx > 0 ? colIdx - 1 : rowVals.length;
            const tAttr = cEl.getAttribute('t');
            let val = '';
            if (tAttr === 's') {
              const sIdx = Number(cEl.querySelector('v')?.textContent || 0);
              val = sharedStrings[sIdx] ?? '';
            } else if (tAttr === 'inlineStr') {
              val = cEl.querySelector('t')?.textContent || '';
            } else {
              val = cEl.querySelector('v')?.textContent || '';
            }
            while (rowVals.length < targetIdx) rowVals.push('');
            rowVals[targetIdx] = val.trim();
          });
          if (rowVals.some(Boolean)) rows.push(rowVals);
        });
        return rows;
      };

      const downloadImportTemplate = (roleType: 'teacher' | 'student', format: 'xlsx' | 'csv' | 'docx') => {
        const headers = ['Nama', 'User_name', 'NIP', 'Email', 'Password'];

        if (format === 'csv') {
          const csv = `${headers.join(',')}\n`;
          triggerDownloadBlob(csv, `template_import_${roleType}.csv`, 'text/csv;charset=utf-8;');
        } else if (format === 'xlsx') {
          const xlsxBytes = buildRealXlsxUint8Array(`Template_${roleType}`, [headers], {
            styledTemplate: true,
            blankRowsCount: 20
          });
          triggerDownloadBlob(
            xlsxBytes,
            `template_import_${roleType}.xlsx`,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          );
        } else {
          const emptyTrs = Array.from({ length: 15 })
            .map(() => `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>`)
            .join('');
          const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset='utf-8'></head><body>
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;">
<tr style="background:#00B0F0;font-weight:bold;">${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
${emptyTrs}
</table></body></html>`;
          triggerDownloadBlob(docHtml, `template_import_${roleType}.docx`, 'application/msword');
        }
        showToast(`Template ${format.toUpperCase()} (${headers.join(' | ')}) berhasil diunduh!`, 'success');
      };

      const handleParseImportFile = async (file: File) => {
        setImportFileName(file.name);
        const buf = await file.arrayBuffer();
        const headerBytes = new Uint8Array(buf.slice(0, 4));
        let parsedRows: string[][] = [];

        // Cek signature ZIP (PK\x03\x04) untuk file .xlsx asli dari Microsoft Excel
        if (
          headerBytes[0] === 0x50 &&
          headerBytes[1] === 0x4b &&
          headerBytes[2] === 0x03 &&
          headerBytes[3] === 0x04
        ) {
          parsedRows = await parseRealXlsxRows(buf);
        } else {
          const text = new TextDecoder('utf-8').decode(buf);
          if (text.includes('<tr') || text.includes('<Row')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const trs = Array.from(doc.querySelectorAll('tr, Row'));
            parsedRows = trs
              .map((tr) =>
                Array.from(tr.querySelectorAll('th, td, Cell')).map((c) => (c.textContent || '').trim())
              )
              .filter((r) => r.length >= 3 && r.some(Boolean));
          } else {
            const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
            parsedRows = lines
              .map((line) =>
                line
                  .split(/[,;\t]/)
                  .map((cell) => cell.replace(/^"|"$/g, '').trim())
              )
              .filter((r) => r.some(Boolean));
          }
        }

        const nonEmptyDataRows = parsedRows.slice(1).filter((r) => r.some((cell) => cell && cell.trim().length > 0));
        if (parsedRows.length === 0 || nonEmptyDataRows.length === 0) {
          showToast('File template masih kosong. Isi minimal 1 baris data (Nama, User_name, NIP, Email, Password) lalu unggah kembali.', 'error');
          return;
        }
        setImportRawHeaders(parsedRows[0]);
        setImportRawRows(nonEmptyDataRows);
        setColMap({ fullName: 0, username: 1, nipNis: 2, email: 3, password: 4 });
      };

      // Validasi baris import format 5 kolom: NAMA, USERNAME, NIP, EMAIL, PASSWORD
      const validatedImportRows = importRawRows.map((row, idx) => {
        const fullName = (row[colMap.fullName] || '').trim();
        const username = (row[colMap.username] || '').trim().toLowerCase();
        const nipNis = (row[colMap.nipNis] || '').trim();
        const email = (row[colMap.email] || '').trim().toLowerCase();
        const password = (row[colMap.password] || '').trim();

        const errors: string[] = [];
        if (!fullName || fullName.length < 2) errors.push('NAMA wajib diisi');
        if (!username || !/^[a-z0-9_]{3,30}$/.test(username)) errors.push('USERNAME tidak valid');
        if (!nipNis) errors.push('NIP/NIS kosong');
        if (!email || !email.includes('@')) errors.push('EMAIL tidak valid');
        if (!password || password.length < 6) errors.push('PASSWORD min. 6 karakter');

        const dupEmail = managedAccounts.some((a) => a.email.toLowerCase() === email);
        const dupUser = managedAccounts.some((a) => a.username.toLowerCase() === username);
        const dupNip = managedAccounts.some((a) => a.nipNis === nipNis);
        if (dupEmail) errors.push('Duplikat EMAIL');
        if (dupUser) errors.push('Duplikat USERNAME');
        if (dupNip) errors.push('Duplikat NIP/NIS');

        return {
          rowNum: idx + 2,
          fullName,
          username,
          nipNis,
          email,
          password,
          isValid: errors.length === 0,
          errors
        };
      });

      const handleExecuteValidImport = async () => {
        const validItems = validatedImportRows.filter((r) => r.isValid);
        if (validItems.length === 0) {
          showToast('Tidak ada baris data valid yang dapat diimpor.', 'error');
          return;
        }
        setIsImportingServer(true);
        try {
          if (sbClient) {
            await sbClient.functions.invoke('admin-provision-users', {
              body: {
                users: validItems.map((v) => ({
                  full_name: v.fullName,
                  username: v.username,
                  nip_nis: v.nipNis,
                  email: v.email,
                  password: v.password,
                  role: importTargetRole
                }))
              }
            });
          }

          const newlyAdded: ManagedAccount[] = validItems.map((v, i) => ({
            id: `imp_${Date.now()}_${i}`,
            username: v.username,
            fullName: v.fullName,
            email: v.email,
            nipNis: v.nipNis,
            role: importTargetRole,
            className: importTargetRole === 'student' ? 'Semua Kelas' : '',
            isActive: true,
            createdAt: new Date().toISOString().slice(0, 10)
          }));

          setManagedAccounts((prev) => [...newlyAdded, ...prev]);
          await recordAuditLog('BULK_IMPORT_USERS', 'profiles', {
            role: importTargetRole,
            count: validItems.length
          });
          showToast(
            `${validItems.length} akun ${importTargetRole === 'teacher' ? 'Guru' : 'Siswa'} berhasil diimpor dari file Excel!`,
            'success'
          );
          setImportRawRows([]);
          setImportFileName('');
        } finally {
          setIsImportingServer(false);
        }
      };

      const exportAccountsReport = (roleFilter: 'teacher' | 'student', format: 'xlsx' | 'csv' | 'docx') => {
        const list = managedAccounts.filter((a) => a.role === roleFilter);
        const headers =
          roleFilter === 'teacher'
            ? ['Nama Lengkap', 'Username', 'NIP', 'Email', 'Status']
            : ['Nama Lengkap', 'Username', 'NIS', 'Email', 'Kelas', 'Status'];
        const rows = list.map((a) =>
          roleFilter === 'teacher'
            ? [a.fullName, a.username, a.nipNis, a.email, a.isActive ? 'Aktif' : 'Nonaktif']
            : [a.fullName, a.username, a.nipNis, a.email, a.className || '-', a.isActive ? 'Aktif' : 'Nonaktif']
        );

        if (format === 'csv') {
          const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
          triggerDownloadBlob(csv, `data_${roleFilter}_darulfikri.csv`, 'text/csv;charset=utf-8;');
        } else if (format === 'xlsx') {
          const xlsxBytes = buildRealXlsxUint8Array(`Data_${roleFilter}`, [headers, ...rows]);
          triggerDownloadBlob(
            xlsxBytes,
            `data_${roleFilter}_darulfikri.xlsx`,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          );
        } else {
          const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset='utf-8'></head><body>
<h2>Laporan Data ${roleFilter === 'teacher' ? 'Guru' : 'Siswa'} - EDU GAME ARENA</h2>
<table border="1" cellpadding="6" cellspacing="0">
<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
</table></body></html>`;
          triggerDownloadBlob(docHtml, `data_${roleFilter}_darulfikri.docx`, 'application/msword');
        }
        recordAuditLog('EXPORT_ACCOUNTS', 'profiles', { roleFilter, format });
        showToast(`Export data ${roleFilter} (${format.toUpperCase()}) berhasil diunduh!`, 'success');
      };

      const filteredResults = quizResults.filter((r) => {
        const matchText =
          r.studentName.toLowerCase().includes(resSearch.toLowerCase()) ||
          r.gameTitle.toLowerCase().includes(resSearch.toLowerCase());
        const matchClass = resClassFilter === 'Semua' || r.className === resClassFilter;
        const matchTeacher = resTeacherFilter === 'Semua' || r.teacherName === resTeacherFilter;
        const matchGame = resGameFilter === 'Semua' || r.gameTitle === resGameFilter;
        const matchDate = !resDateFilter || r.playedDate === resDateFilter;
        return matchText && matchClass && matchTeacher && matchGame && matchDate;
      });

      const exportQuizResults = (format: 'xlsx' | 'csv' | 'docx' | 'pdf') => {
        const headers = ['Peringkat', 'Nama Siswa', 'Kelas', 'Guru', 'Nama Game', 'Tanggal', 'Skor', 'Benar', 'Salah', 'Durasi (d)', 'Rincian Jawaban'];
        const rows = filteredResults.map((r) => [
          `#${r.rank}`,
          r.studentName,
          r.className,
          r.teacherName,
          r.gameTitle,
          r.playedDate,
          String(r.score),
          String(r.correctCount),
          String(r.wrongCount),
          `${r.durationSec}s`,
          r.answersDetail
        ]);

        if (format === 'pdf') {
          const printWin = window.open('', '_blank', 'width=960,height=700');
          if (printWin) {
            printWin.document.write(`<html><head><title>Laporan Hasil Kuis - EDU GAME ARENA</title>
<style>body{font-family:Arial,sans-serif;padding:24px;}table{width:100%;border-collapse:collapse;font-size:12px;}th,td{border:1px solid #333;padding:6px;text-align:left;}th{background:#f0f4f8;}</style>
</head><body><h2>Rekapitulasi Hasil Kuis - EDU GAME ARENA</h2>
<p>Total Peserta: ${filteredResults.length} | Rata-rata Nilai: ${avgScore}</p>
<table><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
</table><script>window.onload=function(){window.print();}</script></body></html>`);
            printWin.document.close();
          }
        } else if (format === 'csv') {
          const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
          triggerDownloadBlob(csv, 'laporan_hasil_kuis.csv', 'text/csv;charset=utf-8;');
        } else if (format === 'xlsx') {
          const xlsxBytes = buildRealXlsxUint8Array('Hasil_Kuis', [headers, ...rows]);
          triggerDownloadBlob(
            xlsxBytes,
            'laporan_hasil_kuis.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          );
        } else {
          const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset='utf-8'></head><body>
<h2>Laporan Rekapitulasi Hasil Kuis - EDU GAME ARENA</h2>
<table border="1" cellpadding="6" cellspacing="0">
<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
</table></body></html>`;
          triggerDownloadBlob(docHtml, 'laporan_hasil_kuis.docx', 'application/msword');
        }
        recordAuditLog('EXPORT_QUIZ_RESULTS', 'game_results', { format, rows: filteredResults.length });
        showToast(`Laporan hasil kuis (${format.toUpperCase()}) siap!`, 'success');
      };

      const renderAccountsTable = (roleType: 'teacher' | 'student') => {
        const filtered = managedAccounts.filter(
          (a) =>
            a.role === roleType &&
            (a.fullName.toLowerCase().includes(accountSearch.toLowerCase()) ||
              a.username.toLowerCase().includes(accountSearch.toLowerCase()) ||
              a.email.toLowerCase().includes(accountSearch.toLowerCase()) ||
              a.nipNis.includes(accountSearch))
        );
        const pageSize = 5;
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        const paginated = filtered.slice((accountPage - 1) * pageSize, accountPage * pageSize);

        return (
          <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">
                  {roleType === 'teacher' ? 'Manajemen Data Guru' : 'Manajemen Data Siswa'} ({filtered.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Pembuatan akun memanggil Edge Function aman tanpa password default.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => exportAccountsReport(roleType, 'xlsx')}
                  className="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export XLSX
                </button>
                <button
                  onClick={() => {
                    setFormAccFullName('');
                    setFormAccUsername('');
                    setFormAccEmail('');
                    setFormAccNipNis('');
                    setNewAccModalOpen(roleType);
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> Tambah {roleType === 'teacher' ? 'Guru' : 'Siswa'}
                </button>
              </div>
            </div>

            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder={`Cari nama, username, email, atau ${roleType === 'teacher' ? 'NIP' : 'NIS'}...`}
                value={accountSearch}
                onChange={(e) => {
                  setAccountSearch(e.target.value);
                  setAccountPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#070B19] border-b border-slate-800 text-slate-400 uppercase">
                    <th className="py-3 px-4">Nama & Username</th>
                    <th className="py-3 px-4">{roleType === 'teacher' ? 'NIP' : 'NIS'}</th>
                    <th className="py-3 px-4">Email</th>
                    {roleType === 'student' && <th className="py-3 px-4">Kelas</th>}
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginated.map((acc) => (
                    <tr key={acc.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{acc.fullName}</div>
                        <div className="text-[11px] text-cyan-400 font-mono">@{acc.username}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{acc.nipNis}</td>
                      <td className="py-3 px-4 text-slate-300">{acc.email}</td>
                      {roleType === 'student' && (
                        <td className="py-3 px-4 text-slate-300">{acc.className || 'Semua Kelas'}</td>
                      )}
                      <td className="py-3 px-4">
                        <button
                          onClick={async () => {
                            const nextActive = !acc.isActive;
                            setManagedAccounts((prev) =>
                              prev.map((item) => (item.id === acc.id ? { ...item, isActive: nextActive } : item))
                            );
                            if (sbClient) {
                              await sbClient.from('profiles').update({ is_active: nextActive }).eq('id', acc.id);
                            }
                            await recordAuditLog('TOGGLE_ACCOUNT_STATUS', 'profiles', {
                              username: acc.username,
                              is_active: nextActive
                            });
                            showToast(`Status ${acc.fullName} diubah menjadi ${nextActive ? 'Aktif' : 'Nonaktif'}.`, 'info');
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                            acc.isActive
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {acc.isActive ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleSendPasswordReset(acc.email)}
                          title="Kirim Reset Password"
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 font-bold cursor-pointer"
                        >
                          Reset PW
                        </button>
                        <button
                          onClick={async () => {
                            setManagedAccounts((prev) => prev.filter((item) => item.id !== acc.id));
                            await recordAuditLog('DELETE_ACCOUNT', 'profiles', { username: acc.username });
                            showToast(`Akun ${acc.fullName} dihapus.`, 'info');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 font-bold cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
              <span>
                Halaman {accountPage} dari {totalPages}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={accountPage <= 1}
                  onClick={() => setAccountPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg bg-[#070B19] border border-slate-700 disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={accountPage >= totalPages}
                  onClick={() => setAccountPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg bg-[#070B19] border border-slate-700 disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </div>
        );
      };

      const adminSidebarItems = [
        { id: 'overview', label: 'Dashboard', icon: BarChart3 },
        { id: 'teachers', label: 'Data Guru', icon: UserCheck },
        { id: 'students', label: 'Data Siswa', icon: Users },
        { id: 'classes', label: 'Data Kelas', icon: Building2 },
        { id: 'games', label: 'Manajemen Game', icon: Gamepad2 },
        { id: 'results', label: 'Hasil Kuis', icon: ClipboardList },
        { id: 'import', label: 'Import Data', icon: Upload },
        { id: 'export', label: 'Export Laporan', icon: Download },
        { id: 'settings', label: 'Pengaturan', icon: Sliders }
      ];

      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar Navigasi Admin */}
            <aside className="lg:col-span-3 rounded-3xl bg-[#0D132B] border border-indigo-500/30 p-4 space-y-2 lg:sticky lg:top-20">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1A103C] to-[#0F1736] border border-purple-500/30 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{currentUser.avatar}</span>
                  <div>
                    <div className="text-xs font-black text-white">{currentUser.name}</div>
                    <div className="text-[11px] font-mono text-emerald-400">
                      @{currentUser.username} • {currentUser.role}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
                {adminSidebarItems.map((item) => {
                  const IconComp = item.icon;
                  const active = adminMenuTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setAdminMenuTab(item.id as any)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-black shadow-md'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <IconComp className="w-4 h-4 shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Konten Utama Admin */}
            <div className="lg:col-span-9 space-y-6">
              {adminMenuTab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Guru', val: teachersList.length, icon: UserCheck, color: 'text-cyan-400' },
                      { label: 'Total Siswa', val: studentsList.length, icon: Users, color: 'text-emerald-400' },
                      { label: 'Data Kelas', val: schoolClasses.length, icon: Building2, color: 'text-purple-400' },
                      { label: 'Total Game', val: games.length, icon: Gamepad2, color: 'text-blue-400' },
                      { label: 'Room Aktif', val: activeRoomsCount, icon: Wifi, color: 'text-amber-400' },
                      { label: 'Total Kuis Selesai', val: quizResults.length, icon: ClipboardList, color: 'text-pink-400' },
                      { label: 'Rata-Rata Nilai', val: `${avgScore} PTS`, icon: Award, color: 'text-emerald-300' },
                      { label: 'Audit Log Tercatat', val: auditLogs.length, icon: History, color: 'text-indigo-300' }
                    ].map((card, i) => {
                      const IconC = card.icon;
                      return (
                        <div key={i} className="p-4 rounded-2xl bg-[#0D132B] border border-indigo-500/20">
                          <IconC className={`w-5 h-5 ${card.color} mb-2`} />
                          <div className="text-xl font-black text-white">{card.val}</div>
                          <div className="text-[11px] text-slate-400 font-semibold">{card.label}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <History className="w-4 h-4 text-cyan-400" />
                        Audit Log Aktivitas Administrator
                      </h3>
                      <button
                        onClick={() => setActivePage('supabase-guide')}
                        className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
                      >
                        Lihat SQL & Edge Functions →
                      </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl bg-[#070B19] border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-cyan-300">@{log.actorUsername}</span>{' '}
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                              {log.action}
                            </span>{' '}
                            <span className="text-slate-300">pada {log.target}</span>
                          </div>
                          <span className="text-[11px] text-slate-500">{log.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {adminMenuTab === 'teachers' && renderAccountsTable('teacher')}
              {adminMenuTab === 'students' && renderAccountsTable('student')}

              {adminMenuTab === 'classes' && (
                <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-5">
                  <div>
                    <h2 className="text-xl font-black text-white">Manajemen Data Kelas</h2>
                    <p className="text-xs text-slate-400">
                      Semua guru dapat memberikan tugas/kuis ke seluruh siswa menggunakan kode room.
                    </p>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newClassName.trim()) return;
                      const created: SchoolClassItem = {
                        id: `cls_${Date.now()}`,
                        name: newClassName.trim().toUpperCase(),
                        gradeLevel: newClassName.trim().split(' ')[0] || 'XI',
                        major: newClassMajor,
                        academicYear: '2026/2027',
                        studentCount: 0,
                        isActive: true
                      };
                      setSchoolClasses((prev) => [created, ...prev]);
                      if (sbClient) {
                        await sbClient.from('classes').insert({
                          name: created.name,
                          grade_level: created.gradeLevel,
                          major: created.major,
                          academic_year: created.academicYear
                        });
                      }
                      await recordAuditLog('CREATE_CLASS', 'classes', { name: created.name });
                      setNewClassName('');
                      showToast(`Kelas ${created.name} berhasil ditambahkan!`, 'success');
                    }}
                    className="grid sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#070B19] border border-slate-800"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Nama Kelas (mis: XII TKJ 1)"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#0D132B] border border-slate-700 text-white text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Kompetensi Keahlian"
                      value={newClassMajor}
                      onChange={(e) => setNewClassMajor(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#0D132B] border border-slate-700 text-white text-xs"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                    >
                      + Tambah Kelas
                    </button>
                  </form>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {schoolClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="p-4 rounded-2xl bg-[#070B19] border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-black text-white text-base">{cls.name}</div>
                          <div className="text-xs text-cyan-400">{cls.major}</div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Tahun Ajaran {cls.academicYear}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            setSchoolClasses((prev) => prev.filter((c) => c.id !== cls.id));
                            await recordAuditLog('DELETE_CLASS', 'classes', { name: cls.name });
                            showToast(`Kelas ${cls.name} dihapus.`, 'info');
                          }}
                          className="p-2 rounded-lg bg-rose-500/15 text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminMenuTab === 'import' && (
                <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                        Import Data Guru & Siswa via Excel / CSV
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Format wajib 5 kolom (1 kolom per masukan):{' '}
                        <code className="text-cyan-300 font-bold">Nama | User_name | NIP | Email | Password</code>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => downloadImportTemplate(importTargetRole, 'xlsx')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Template Excel (.XLSX)
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadImportTemplate(importTargetRole, 'csv')}
                        className="px-3.5 py-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Template CSV
                      </button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#070B19] border border-slate-800">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                        1. Pilih Role Akun yang Diimpor
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'teacher', label: 'Data Guru' },
                          { id: 'student', label: 'Data Siswa' }
                        ].map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setImportTargetRole(r.id as 'teacher' | 'student')}
                            className={`py-2.5 rounded-xl text-xs font-black border cursor-pointer ${
                              importTargetRole === r.id
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                                : 'bg-[#0D132B] border-slate-700 text-slate-400'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                        2. Unggah File Excel (.xlsx / .xls / .csv)
                      </label>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleParseImportFile(file);
                        }}
                        className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-400 file:text-slate-950 cursor-pointer"
                      />
                    </div>
                  </div>

                  {importRawRows.length > 0 && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-[#070B19] border border-cyan-500/30 space-y-3">
                        <div className="text-xs font-black text-cyan-300">
                          Pemetaan 5 Kolom ({importFileName}):
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                          {[
                            { key: 'fullName', label: 'Kolom NAMA' },
                            { key: 'username', label: 'Kolom USERNAME' },
                            { key: 'nipNis', label: 'Kolom NIP / NIS' },
                            { key: 'email', label: 'Kolom EMAIL' },
                            { key: 'password', label: 'Kolom PASSWORD' }
                          ].map((m) => (
                            <div key={m.key}>
                              <label className="text-[10px] text-slate-400 block mb-1">{m.label}</label>
                              <select
                                value={(colMap as any)[m.key]}
                                onChange={(e) =>
                                  setColMap({ ...colMap, [m.key]: Number(e.target.value) })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D132B] border border-slate-700 text-white"
                              >
                                {importRawHeaders.map((h, i) => (
                                  <option key={i} value={i}>
                                    #{i + 1}: {h}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-[#070B19] border-b border-slate-800 text-slate-400 uppercase">
                              <th className="py-2.5 px-3">Baris</th>
                              <th className="py-2.5 px-3">NAMA</th>
                              <th className="py-2.5 px-3">USERNAME</th>
                              <th className="py-2.5 px-3">NIP / NIS</th>
                              <th className="py-2.5 px-3">EMAIL</th>
                              <th className="py-2.5 px-3">PASSWORD</th>
                              <th className="py-2.5 px-3">Validasi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {validatedImportRows.map((r) => (
                              <tr key={r.rowNum} className="bg-[#070B19]/60">
                                <td className="py-2.5 px-3 font-mono text-slate-400">#{r.rowNum}</td>
                                <td className="py-2.5 px-3 font-bold text-white">{r.fullName || '-'}</td>
                                <td className="py-2.5 px-3 font-mono text-cyan-300">{r.username || '-'}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-300">{r.nipNis || '-'}</td>
                                <td className="py-2.5 px-3 text-slate-300">{r.email || '-'}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-400">
                                  {r.password ? '•'.repeat(Math.min(10, r.password.length)) : '-'}
                                </td>
                                <td className="py-2.5 px-3">
                                  {r.isValid ? (
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                      Valid ✓
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                                      {r.errors.join(', ')}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-slate-300">
                          Valid: <strong className="text-emerald-400">{validatedImportRows.filter((r) => r.isValid).length}</strong> dari{' '}
                          {validatedImportRows.length} baris
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setImportRawRows([]);
                              setImportFileName('');
                            }}
                            className="px-4 py-2.5 rounded-xl bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                          >
                            Batalkan
                          </button>
                          <button
                            type="button"
                            disabled={isImportingServer}
                            onClick={handleExecuteValidImport}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-black text-xs cursor-pointer disabled:opacity-50"
                          >
                            {isImportingServer ? 'Memproses ke Supabase...' : 'Import Data Valid Sekarang'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {adminMenuTab === 'export' && (
                <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-5">
                  <h2 className="text-xl font-black text-white">Export Laporan Data Sekolah & Hasil Kuis</h2>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-[#070B19] border border-slate-800 space-y-3">
                      <div className="font-bold text-white text-sm">Data Guru ({teachersList.length})</div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => exportAccountsReport('teacher', 'xlsx')} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold cursor-pointer">XLSX</button>
                        <button onClick={() => exportAccountsReport('teacher', 'csv')} className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold cursor-pointer">CSV</button>
                        <button onClick={() => exportAccountsReport('teacher', 'docx')} className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold cursor-pointer">DOCX</button>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#070B19] border border-slate-800 space-y-3">
                      <div className="font-bold text-white text-sm">Data Siswa ({studentsList.length})</div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => exportAccountsReport('student', 'xlsx')} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold cursor-pointer">XLSX</button>
                        <button onClick={() => exportAccountsReport('student', 'csv')} className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold cursor-pointer">CSV</button>
                        <button onClick={() => exportAccountsReport('student', 'docx')} className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold cursor-pointer">DOCX</button>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#070B19] border border-slate-800 space-y-3">
                      <div className="font-bold text-white text-sm">Rekap Hasil Kuis ({filteredResults.length})</div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => exportQuizResults('xlsx')} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold cursor-pointer">XLSX</button>
                        <button onClick={() => exportQuizResults('csv')} className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold cursor-pointer">CSV</button>
                        <button onClick={() => exportQuizResults('docx')} className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold cursor-pointer">DOCX</button>
                        <button onClick={() => exportQuizResults('pdf')} className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold cursor-pointer">PDF</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {adminMenuTab === 'results' && (
                <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-black text-white">Hasil Kuis Siswa ({filteredResults.length})</h2>
                    <div className="flex gap-2">
                      <button onClick={() => exportQuizResults('xlsx')} className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold cursor-pointer">Export XLSX</button>
                      <button onClick={() => exportQuizResults('pdf')} className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold cursor-pointer">Cetak PDF</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#070B19] border-b border-slate-800 text-slate-400 uppercase">
                          <th className="py-3 px-3">Rank</th>
                          <th className="py-3 px-3">Nama Siswa</th>
                          <th className="py-3 px-3">Game</th>
                          <th className="py-3 px-3">Guru</th>
                          <th className="py-3 px-3">Skor</th>
                          <th className="py-3 px-3">Benar/Salah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredResults.map((r) => (
                          <tr key={r.id}>
                            <td className="py-3 px-3 font-black text-cyan-400">#{r.rank}</td>
                            <td className="py-3 px-3 font-bold text-white">{r.studentName}</td>
                            <td className="py-3 px-3 text-slate-300">{r.gameTitle}</td>
                            <td className="py-3 px-3 text-slate-400">{r.teacherName}</td>
                            <td className="py-3 px-3 font-mono font-bold text-amber-300">{r.score}</td>
                            <td className="py-3 px-3 text-emerald-400">{r.correctCount}✓ / {r.wrongCount}✗</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adminMenuTab === 'games' && (
                <div className="space-y-6">
                  {/* Manajemen Kategori Pelajaran oleh Admin & Super Admin */}
                  <div className="rounded-3xl bg-[#0D132B] border border-cyan-500/25 p-6 space-y-4">
                    <div>
                      <h2 className="text-lg font-black text-white">Manajemen Kategori Pelajaran</h2>
                      <p className="text-xs text-slate-400">
                        Tambah atau hapus kategori pelajaran yang tersedia di Game Creator Studio dan filter Katalog Game.
                      </p>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const cleanCat = newCategoryInput.trim();
                        if (!cleanCat) return;
                        if (lessonCategories.some((c) => c.toLowerCase() === cleanCat.toLowerCase())) {
                          showToast('Kategori pelajaran tersebut sudah ada.', 'error');
                          return;
                        }
                        setLessonCategories((prev) => [...prev, cleanCat]);
                        setNewCategoryInput('');
                        if (sbClient) {
                          const slug = cleanCat
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-|-$/g, '');
                          await sbClient.from('game_categories').insert({
                            name: cleanCat,
                            slug: `${slug}-${Date.now().toString().slice(-4)}`
                          });
                        }
                        await recordAuditLog('CREATE_CATEGORY', 'game_categories', { name: cleanCat });
                        showToast(`Kategori "${cleanCat}" berhasil ditambahkan!`, 'success');
                      }}
                      className="flex flex-col sm:flex-row gap-2.5"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Nama kategori baru (mis: Game Desain Grafis)"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Tambah Kategori
                      </button>
                    </form>

                    <div className="flex flex-wrap gap-2">
                      {lessonCategories.map((cat) => (
                        <div
                          key={cat}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#070B19] border border-indigo-500/30 text-xs font-bold text-slate-200"
                        >
                          <span>{cat}</span>
                          <button
                            type="button"
                            title={`Hapus kategori ${cat}`}
                            onClick={async () => {
                              if (lessonCategories.length <= 1) {
                                showToast('Minimal harus tersisa 1 kategori pelajaran.', 'error');
                                return;
                              }
                              setLessonCategories((prev) => prev.filter((item) => item !== cat));
                              if (sbClient) {
                                await sbClient.from('game_categories').delete().eq('name', cat);
                              }
                              await recordAuditLog('DELETE_CATEGORY', 'game_categories', { name: cat });
                              showToast(`Kategori "${cat}" telah dihapus.`, 'info');
                            }}
                            className="text-rose-400 hover:text-rose-300 p-0.5 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-xl font-black text-white">Manajemen Seluruh Game ({games.length})</h2>
                      <button
                        onClick={() => {
                          setCreatorSubView('list');
                          setActivePage('creator');
                        }}
                        className="px-4 py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Wand2 className="w-4 h-4" /> Buka Game Creator Studio
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {games.map((g) => (
                        <div
                          key={g.id}
                          className="p-4 rounded-2xl bg-[#070B19] border border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-bold text-white text-sm">{g.title}</div>
                            <div className="text-[11px] text-slate-400">
                              {g.creatorName} • {g.category} • {g.questions.length} Soal
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={async () => {
                                const nextStatus = g.status === 'published' ? 'disabled' : 'published';
                                await persistGameToDatabase({ ...g, status: nextStatus });
                                await recordAuditLog('TOGGLE_GAME_STATUS', 'games', { title: g.title, status: nextStatus });
                                showToast(`Status game "${g.title}" diubah menjadi ${nextStatus}.`, 'info');
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                                g.status === 'published'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {g.status === 'published' ? 'Aktif' : 'Nonaktif'}
                            </button>
                            <button
                              onClick={async () => {
                                await deleteGameFromDatabase(g.id);
                                await recordAuditLog('DELETE_GAME', 'games', { title: g.title });
                                showToast(`Game "${g.title}" dihapus.`, 'info');
                              }}
                              className="p-2 rounded-xl bg-rose-500/15 text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {adminMenuTab === 'settings' && (
                <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-4">
                  <h2 className="text-xl font-black text-white">Pengaturan Sistem & Keamanan Supabase</h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Kelola koneksi project Supabase, jalankan migrasi SQL 16 tabel & RLS policies, atau deploy Edge Functions untuk bootstrap <code>admin_darulfikri</code> dan provisioning akun.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setActivePage('supabase-guide')}
                      className="px-5 py-3 rounded-xl bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                    >
                      Buka Konfigurasi SQL, RLS & Edge Functions
                    </button>
                    <button
                      onClick={() => setShowBootstrapModal(true)}
                      className="px-5 py-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs cursor-pointer"
                    >
                      Bootstrap Super Admin (admin_darulfikri)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Tambah Akun Guru / Siswa Tunggal via Edge Function */}
          {newAccModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-3xl bg-[#0D132B] border border-cyan-500/40 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white">
                    Tambah Akun {newAccModalOpen === 'teacher' ? 'Guru' : 'Siswa'} Baru
                  </h3>
                  <button onClick={() => setNewAccModalOpen(null)} className="text-slate-400 font-bold">
                    ✕
                  </button>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const cleanUser = formAccUsername.trim().toLowerCase();
                    const cleanEmail = formAccEmail.trim().toLowerCase();
                    if (
                      managedAccounts.some(
                        (a) => a.username === cleanUser || a.email === cleanEmail || a.nipNis === formAccNipNis.trim()
                      )
                    ) {
                      showToast('Duplikasi Username, Email, atau NIP/NIS terdeteksi!', 'error');
                      return;
                    }
                    if (sbClient) {
                      await sbClient.functions.invoke('admin-provision-users', {
                        body: {
                          send_invite: true,
                          users: [
                            {
                              full_name: formAccFullName.trim(),
                              username: cleanUser,
                              email: cleanEmail,
                              nip_nis: formAccNipNis.trim(),
                              class_name: formAccClass,
                              role: newAccModalOpen
                            }
                          ]
                        }
                      });
                    }
                    const created: ManagedAccount = {
                      id: `acc_${Date.now()}`,
                      username: cleanUser,
                      fullName: formAccFullName.trim(),
                      email: cleanEmail,
                      nipNis: formAccNipNis.trim(),
                      role: newAccModalOpen,
                      className: newAccModalOpen === 'student' ? formAccClass : '',
                      isActive: true,
                      createdAt: new Date().toISOString().slice(0, 10)
                    };
                    setManagedAccounts((prev) => [created, ...prev]);
                    await recordAuditLog('CREATE_USER_ACCOUNT', 'profiles', {
                      username: created.username,
                      role: created.role
                    });
                    setNewAccModalOpen(null);
                    showToast(
                      `Akun ${created.fullName} dibuat via Edge Function & tautan undangan password dikirim ke email.`,
                      'success'
                    );
                  }}
                  className="space-y-3"
                >
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap & Gelar"
                    value={formAccFullName}
                    onChange={(e) => setFormAccFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Username (huruf kecil & underscore)"
                    value={formAccUsername}
                    onChange={(e) => setFormAccUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs font-mono"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email Institusi"
                    value={formAccEmail}
                    onChange={(e) => setFormAccEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder={newAccModalOpen === 'teacher' ? 'Nomor Induk Pegawai (NIP)' : 'Nomor Induk Siswa (NIS)'}
                    value={formAccNipNis}
                    onChange={(e) => setFormAccNipNis(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs font-mono"
                  />
                  {newAccModalOpen === 'student' && (
                    <select
                      value={formAccClass}
                      onChange={(e) => setFormAccClass(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                    >
                      {schoolClasses.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    Simpan & Kirim Undangan Password Aman
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="p-6 rounded-3xl bg-[#0D132B] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-3xl">
              {currentUser.avatar}
            </div>
            <div>
              <h1 className="text-xl font-black text-white">{currentUser.name}</h1>
              <p className="text-xs text-cyan-300 font-bold">
                Level {Math.floor(currentUser.xp / 500) + 1} • {currentUser.xp} XP • {currentUser.wins} Kemenangan
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActivePage('catalog')}
              className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs cursor-pointer"
            >
              Self-Play Katalog
            </button>
            <button
              onClick={() => {
                setLoginTab('student');
                setActivePage('login');
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-black text-xs cursor-pointer"
            >
              Masukkan Kode Room Baru
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 14. HALAMAN RUANG TUNGGU (MULTIPLAYER LOBBY + SUPABASE PRESENCE)
  // ==========================================================================
  const MultiplayerLobby = () => {
    if (!activeRoom) {
      return (
        <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <p className="text-slate-400">Tidak ada room multiplayer yang aktif.</p>
          <button
            onClick={() => setActivePage(currentUser ? 'dashboard' : 'landing')}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm"
          >
            Kembali
          </button>
        </div>
      );
    }

    const playersList = Object.values(activeRoom.players || {}).sort(
      (a, b) => a.joinedAt - b.joinedAt
    );
    const isHost =
      currentUser &&
      (currentUser.uid === activeRoom.hostUid ||
        currentUser.role === 'teacher' ||
        currentUser.role === 'admin' ||
        currentUser.role === 'super_admin');
    const currentPlayer = currentUser ? activeRoom.players?.[currentUser.uid] : null;

    const handleCopyCode = () => {
      navigator.clipboard?.writeText(activeRoom.code);
      setLobbyCodeCopied(true);
      showToast(`Kode room ${activeRoom.code} disalin ke clipboard!`, 'success');
      setTimeout(() => setLobbyCodeCopied(false), 2000);
    };

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-[#0F1736] via-[#141D47] to-[#1D154A] border border-emerald-500/40 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                SUPABASE REALTIME & PRESENCE ({Math.max(1, onlinePresenceUids.length)} KONEKSI AKTIF)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{activeRoom.gameTitle}</h1>
              <p className="text-sm text-slate-300">
                Host / Guru: <strong className="text-cyan-300">{activeRoom.hostName}</strong> • Tingkat:{' '}
                <strong className="text-purple-300">{activeRoom.difficulty}</strong> ({activeRoom.durationPerQuestion} detik/soal)
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#070B19]/90 border-2 border-emerald-400/50 text-center min-w-[210px]">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">
                KODE ROOM
              </span>
              <div className="font-mono text-3xl sm:text-4xl font-black tracking-[0.2em] text-emerald-300 my-1">
                {activeRoom.code}
              </div>
              <button
                onClick={handleCopyCode}
                className="w-full py-1.5 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {lobbyCodeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {lobbyCodeCopied ? 'Tersalin!' : 'Salin Kode'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Daftar Pemain Bergabung ({playersList.length} / {activeRoom.maxPlayers})
            </h2>

            {isHost && !isSupabaseConnected && (
              <button
                onClick={async () => {
                  const demoNames = ['Andi (XII RPL)', 'Bella (XII TKJ)', 'Candra (XI RPL)', 'Dina (XI TKJ)'];
                  const pick = demoNames[playersList.length % demoNames.length];
                  const botId = `demo_${Date.now()}`;
                  const updated: GameRoom = {
                    ...activeRoom,
                    players: {
                      ...activeRoom.players,
                      [botId]: {
                        uid: botId,
                        name: pick,
                        teamName: 'Tim Garuda',
                        avatar: ['🦊', '⚡', '🤖', '🐉'][playersList.length % 4],
                        score: 0,
                        correctCount: 0,
                        isReady: true,
                        isOnline: true,
                        answeredQuestions: {},
                        finishTimeMs: 0,
                        joinedAt: Date.now()
                      }
                    }
                  };
                  await saveRoomToBackend(updated);
                  showToast(`Simulasi siswa "${pick}" bergabung ke lobby.`, 'info');
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-bold cursor-pointer"
              >
                + Simulasi Siswa Masuk (Demo)
              </button>
            )}
          </div>

          {playersList.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-700 rounded-2xl">
              <p className="text-slate-400 text-sm">
                Menunggu siswa memasukkan kode <strong className="text-cyan-300">{activeRoom.code}</strong>...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {playersList.map((player) => (
                <div
                  key={player.uid}
                  className="p-3.5 rounded-2xl bg-[#070B19] border border-indigo-500/25 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{player.avatar}</span>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        {player.name}
                        <span className="w-2 h-2 rounded-full bg-emerald-400" title="Online Presence" />
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {activeRoom.playMode === 'kelompok' && player.teamName
                          ? `${player.teamName} • `
                          : ''}
                        {player.uid === currentUser?.uid ? 'Kamu' : 'Peserta'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      player.isReady
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    {player.isReady ? 'SIAP ✓' : 'Menunggu'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => {
                if (isHost) {
                  handleCloseRoom();
                } else {
                  setActiveRoom(null);
                  setActivePage(currentUser ? 'dashboard' : 'landing');
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 text-xs font-bold"
            >
              {isHost ? 'Batalkan & Tutup Room' : 'Keluar Lobby'}
            </button>

            <div className="flex items-center gap-3">
              {currentPlayer && (
                <button
                  onClick={handleToggleReady}
                  className={`px-6 py-3 rounded-xl font-black text-sm transition-all cursor-pointer ${
                    currentPlayer.isReady
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400'
                  }`}
                >
                  {currentPlayer.isReady ? '✓ STATUS: SIAP BERMAIN' : 'TANDAI SIAP'}
                </button>
              )}

              {isHost && (
                <button
                  onClick={handleStartMultiplayerGame}
                  className="px-7 py-3.5 rounded-xl font-black text-sm text-slate-950 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 hover:brightness-110 shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-slate-950" />
                  MULAI GAME SEKARANG
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 15. ARENA PERMAINAN LIVE (8 TEMPLATE + EDGE FUNCTION VALIDATION + PREVIEW)
  // ==========================================================================
  const LiveGameArena: React.FC<{ previewGameOverride?: GameCatalogItem; onClosePreview?: () => void }> = ({
    previewGameOverride,
    onClosePreview
  }) => {
    const activeGameDef: GameCatalogItem = useMemo(() => {
      if (previewGameOverride) return previewGameOverride;
      return games.find((g) => g.id === activeRoom?.gameId) || INITIAL_GAMES[0];
    }, [previewGameOverride, activeRoom?.gameId, games]);

    const effectiveRoom: GameRoom = useMemo(() => {
      if (previewGameOverride) {
        return {
          id: 'preview_room',
          code: 'PREVIEW',
          gameId: previewGameOverride.id,
          gameTitle: `${previewGameOverride.title} (Mode Preview Guru)`,
          templateType: previewGameOverride.templateType,
          hostUid: 'preview_host',
          hostName: currentUser?.name || 'Guru Preview',
          playMode: 'individu',
          maxPlayers: 1,
          durationPerQuestion: previewGameOverride.multiplayerConfig.durationPerQuestion || 25,
          difficulty: previewGameOverride.difficulty,
          status: 'playing',
          currentQuestionIndex: 0,
          questionStartTime: Date.now(),
          showAnswerReveal: false,
          players: {
            preview_player: {
              uid: 'preview_player',
              name: currentUser?.name || 'Guru Uji Coba',
              avatar: currentUser?.avatar || '👨‍🏫',
              score: 0,
              correctCount: 0,
              isReady: true,
              answeredQuestions: {},
              finishTimeMs: 0,
              joinedAt: Date.now()
            }
          },
          createdAt: Date.now()
        };
      }
      return activeRoom!;
    }, [previewGameOverride, activeRoom, currentUser]);

    const [previewRoomState, setPreviewRoomState] = useState<GameRoom>(effectiveRoom);
    const roomObj = previewGameOverride ? previewRoomState : activeRoom!;
    const playerUid = previewGameOverride ? 'preview_player' : currentUser?.uid || '';

    const questionsList =
      activeGameDef.questions && activeGameDef.questions.length > 0
        ? activeGameDef.questions
        : INITIAL_GAMES[0].questions;

    const totalQuestions = questionsList.length;
    const qIndex = Math.min(roomObj.currentQuestionIndex, totalQuestions - 1);
    const currentQ = questionsList[qIndex];

    const [timeLeft, setTimeLeft] = useState<number>(currentQ.durationSec || roomObj.durationPerQuestion || 20);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [wordGuessInput, setWordGuessInput] = useState<string>('');
    const [scrambledChosen, setScrambledChosen] = useState<string[]>([]);
    const [selectedLeftMatch, setSelectedLeftMatch] = useState<string | null>(null);
    const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
    const [dragAssignments, setDragAssignments] = useState<Record<string, string>>({});
    const [selectedDragItem, setSelectedDragItem] = useState<string | null>(null);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [matchedMemoryIds, setMatchedMemoryIds] = useState<string[]>([]);
    const [memoryAttempts, setMemoryAttempts] = useState<number>(0);
    const [questionLocked, setQuestionLocked] = useState<boolean>(false);
    const [feedbackMsg, setFeedbackMsg] = useState<{ correct: boolean; text: string } | null>(null);

    const isHost =
      !previewGameOverride &&
      !isPracticeMode &&
      currentUser &&
      (currentUser.uid === roomObj.hostUid ||
        currentUser.role === 'teacher' ||
        currentUser.role === 'admin' ||
        currentUser.role === 'super_admin');

    const myPlayerData = roomObj.players?.[playerUid];
    const hasAnsweredThisQuestion = Boolean(myPlayerData?.answeredQuestions?.[`q_${qIndex}`]);

    const memoryDeck = useMemo(() => {
      if (activeGameDef.templateType !== 'memory-match' || !currentQ.pairs) return [];
      const cards: { idx: number; pairId: string; text: string }[] = [];
      currentQ.pairs.forEach((p, i) => {
        cards.push({ idx: i * 2, pairId: p.id, text: p.left });
        cards.push({ idx: i * 2 + 1, pairId: p.id, text: p.right });
      });
      return cards.sort((a, b) => a.text.localeCompare(b.text));
    }, [activeGameDef.templateType, currentQ]);

    const scrambledLetters = useMemo(() => {
      const word = (currentQ.answerWord || 'KOMPUTER').toUpperCase();
      return word.split('').reverse();
    }, [currentQ]);

    // Sinkronisasi timer berdasarkan server timestamp (questionStartTime)
    useEffect(() => {
      setSelectedOption(null);
      setWordGuessInput('');
      setScrambledChosen([]);
      setSelectedLeftMatch(null);
      setMatchedPairIds([]);
      setDragAssignments({});
      setSelectedDragItem(null);
      setFlippedCards([]);
      setMatchedMemoryIds([]);
      setMemoryAttempts(0);
      setQuestionLocked(false);
      setFeedbackMsg(null);

      const dur = currentQ.durationSec || roomObj.durationPerQuestion || 20;
      const elapsed = Math.floor((Date.now() - (roomObj.questionStartTime || Date.now())) / 1000);
      setTimeLeft(Math.max(1, dur - Math.max(0, elapsed)));
    }, [qIndex, roomObj.id, roomObj.questionStartTime]);

    useEffect(() => {
      if (roomObj.status !== 'playing') return;
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setQuestionLocked(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }, [qIndex, roomObj.status]);

    const persistRoomUpdate = async (updated: GameRoom) => {
      if (previewGameOverride) {
        setPreviewRoomState(updated);
      } else {
        await saveRoomToBackend(updated);
      }
    };

    const submitAnswer = async (
      isCorrect: boolean,
      pointsEarned: number,
      detailText: string,
      rawPayload?: any
    ) => {
      if (hasAnsweredThisQuestion || questionLocked) return;
      setQuestionLocked(true);
      setFeedbackMsg({ correct: isCorrect, text: detailText });

      // Panggil Supabase Edge Function 'submit-answer' untuk validasi server-side
      if (sbClient && !previewGameOverride && !isPracticeMode) {
        try {
          await sbClient.functions.invoke('submit-answer', {
            body: {
              room_id: roomObj.id,
              question_id: currentQ.id,
              player_id: playerUid,
              submitted_payload: rawPayload ?? { isCorrect }
            }
          });
        } catch {
          // Fallback broadcast state
        }
      }

      if (!myPlayerData) return;

      const updatedPlayer: PlayerInRoom = {
        ...myPlayerData,
        score: myPlayerData.score + pointsEarned,
        correctCount: myPlayerData.correctCount + (isCorrect ? 1 : 0),
        answeredQuestions: {
          ...(myPlayerData.answeredQuestions || {}),
          [`q_${qIndex}`]: true
        },
        finishTimeMs: Date.now() - roomObj.createdAt
      };

      const updatedPlayers = {
        ...roomObj.players,
        [playerUid]: updatedPlayer
      };

      Object.keys(updatedPlayers).forEach((pid) => {
        if (pid.startsWith('demo_') || pid.startsWith('bot-')) {
          const botCorrect = Math.random() > 0.35;
          updatedPlayers[pid] = {
            ...updatedPlayers[pid],
            score: updatedPlayers[pid].score + (botCorrect ? 140 : 0),
            correctCount: updatedPlayers[pid].correctCount + (botCorrect ? 1 : 0),
            answeredQuestions: {
              ...updatedPlayers[pid].answeredQuestions,
              [`q_${qIndex}`]: true
            }
          };
        }
      });

      await persistRoomUpdate({
        ...roomObj,
        players: updatedPlayers
      });
    };

    const handleNextStep = async () => {
      if (qIndex + 1 < totalQuestions) {
        if (sbClient && !previewGameOverride && !isPracticeMode) {
          try {
            await sbClient.functions.invoke('next-question', {
              body: { room_id: roomObj.id, next_index: qIndex + 1 }
            });
          } catch {
            // fallback
          }
        }
        await persistRoomUpdate({
          ...roomObj,
          currentQuestionIndex: qIndex + 1,
          questionStartTime: Date.now(),
          showAnswerReveal: false
        });
      } else {
        if (previewGameOverride) {
          showToast('Preview selesai! Semua soal berjalan dengan baik.', 'success');
          onClosePreview?.();
          return;
        }
        if (sbClient && !isPracticeMode) {
          try {
            await sbClient.functions.invoke('finish-game', {
              body: { room_id: roomObj.id }
            });
          } catch {
            // fallback
          }
        }
        const finishedRoom: GameRoom = { ...roomObj, status: 'finished' };
        await saveRoomToBackend(finishedRoom);

        if (myPlayerData && currentUser) {
          const gainedXp = Math.max(50, Math.round(myPlayerData.score * 0.4));
          setCurrentUser((prev) =>
            prev ? { ...prev, xp: prev.xp + gainedXp, wins: prev.wins + 1 } : null
          );
          const newEntry: LeaderboardEntry = {
            id: `lb_${currentUser.uid}_${Date.now()}`,
            name: currentUser.name,
            role: currentUser.role,
            avatar: currentUser.avatar,
            totalScore: myPlayerData.score,
            xp: (currentUser.xp || 0) + gainedXp,
            wins: (currentUser.wins || 0) + 1,
            period: 'harian'
          };
          setLeaderboard((prev) => [newEntry, ...prev]);
        }
        setActivePage('results');
      }
    };

    const sortedLivePlayers = Object.values(roomObj.players || {}).sort(
      (a, b) => b.score - a.score
    );
    const canAdvance =
      Boolean(previewGameOverride) ||
      isPracticeMode ||
      Boolean(isHost) ||
      timeLeft === 0 ||
      hasAnsweredThisQuestion;

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D132B] border border-cyan-500/30">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 font-black text-xs">
              SOAL {qIndex + 1} / {totalQuestions}
            </span>
            <span className="text-sm font-bold text-white">{roomObj.gameTitle}</span>
            {roomObj.status === 'paused' && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black animate-pulse">
                DIJEDA HOST
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isHost && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    persistRoomUpdate({
                      ...roomObj,
                      status: roomObj.status === 'paused' ? 'playing' : 'paused'
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1"
                >
                  {roomObj.status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  {roomObj.status === 'paused' ? 'Lanjutkan' : 'Jeda'}
                </button>
                <button
                  onClick={async () => {
                    await saveRoomToBackend({ ...roomObj, status: 'finished' });
                    setActivePage('results');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  Akhiri
                </button>
              </div>
            )}

            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-mono font-black text-lg border ${
                timeLeft <= 5
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                  : 'bg-[#070B19] border-cyan-500/40 text-cyan-300'
              }`}
            >
              <Clock className="w-5 h-5" />
              {timeLeft}s
            </div>

            {!isHost && myPlayerData && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Skor Kamu</span>
                <span className="text-base font-black text-amber-400">{myPlayerData.score} PTS</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-3xl bg-[#0D132B] border border-indigo-500/30 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl">
            <div className="space-y-3">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase">
                Template: {activeGameDef.templateType.replace('-', ' ')}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                {currentQ.prompt}
              </h2>
              {currentQ.imageUrl && (
                <img
                  src={currentQ.imageUrl}
                  alt="Media Soal"
                  className="max-h-56 rounded-2xl border border-cyan-500/30 object-contain bg-[#070B19] p-2"
                />
              )}
            </div>

            {activeGameDef.templateType === 'quiz-battle' && (
              <div className="grid sm:grid-cols-2 gap-3.5">
                {(currentQ.options || []).map((opt, idx) => {
                  const isPicked = selectedOption === idx;
                  const revealCorrect = timeLeft === 0 && idx === currentQ.correctIndex;
                  return (
                    <button
                      key={idx}
                      disabled={hasAnsweredThisQuestion || questionLocked || timeLeft === 0 || Boolean(isHost)}
                      onClick={async () => {
                        setSelectedOption(idx);
                        const isCorrect = idx === currentQ.correctIndex;
                        const speedBonus = activeGameDef.multiplayerConfig.speedBonus
                          ? Math.round((timeLeft / (currentQ.durationSec || 20)) * 50)
                          : 0;
                        const pts = isCorrect ? (currentQ.points || 100) + speedBonus : 0;
                        await submitAnswer(
                          isCorrect,
                          pts,
                          isCorrect ? `Tepat! +${pts} Poin` : 'Jawaban kurang tepat.',
                          { selectedOption: idx }
                        );
                      }}
                      className={`p-4 rounded-2xl border text-left font-bold text-sm sm:text-base transition-all flex items-center gap-3 ${
                        revealCorrect
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                          : isPicked
                          ? 'bg-cyan-500/25 border-cyan-400 text-white'
                          : 'bg-[#070B19] border-slate-700/80 text-slate-200 hover:border-cyan-400/60'
                      }`}
                    >
                      <span className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-xs font-black text-cyan-300 shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {(activeGameDef.templateType === 'tebak-kata' ||
              activeGameDef.templateType === 'tebak-gambar') && (
              <div className="space-y-4">
                {currentQ.clue && (
                  <p className="text-sm sm:text-base text-slate-200 bg-[#070B19] p-4 rounded-2xl border border-slate-800">
                    <strong>Petunjuk:</strong> {currentQ.clue}
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-2 py-2">
                  {(currentQ.answerWord || 'ARENA').split('').map((char, i, arr) => {
                    const showHint = i === 0 || i === arr.length - 1 || timeLeft === 0;
                    return (
                      <div
                        key={i}
                        className="w-10 h-12 rounded-xl bg-[#070B19] border-2 border-cyan-500/50 flex items-center justify-center font-mono text-xl font-black text-cyan-300"
                      >
                        {showHint ? char : '_'}
                      </div>
                    );
                  })}
                </div>
                {!isHost && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const clean = wordGuessInput.trim().toUpperCase();
                      if (!clean) return;
                      const target = (currentQ.answerWord || '').toUpperCase();
                      const isCorrect = clean === target;
                      const pts = isCorrect ? currentQ.points || 150 : 0;
                      await submitAnswer(
                        isCorrect,
                        pts,
                        isCorrect ? `Benar! "${target}" (+${pts} Poin)` : `Jawaban "${clean}" belum tepat.`,
                        { guess: clean }
                      );
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      disabled={hasAnsweredThisQuestion || questionLocked || timeLeft === 0}
                      placeholder="Ketik jawaban..."
                      value={wordGuessInput}
                      onChange={(e) => setWordGuessInput(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-3 rounded-xl bg-[#070B19] border border-cyan-500/40 text-white font-mono font-bold uppercase"
                    />
                    <button
                      type="submit"
                      disabled={hasAnsweredThisQuestion || questionLocked || timeLeft === 0}
                      className="px-5 py-3 rounded-xl font-black text-sm text-slate-950 bg-cyan-400 cursor-pointer"
                    >
                      Jawab
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeGameDef.templateType === 'matching-puzzle' && currentQ.pairs && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase">Istilah / Item</div>
                    {currentQ.pairs.map((p) => {
                      const done = matchedPairIds.includes(p.id);
                      const active = selectedLeftMatch === p.id;
                      return (
                        <button
                          key={p.id}
                          disabled={done || questionLocked}
                          onClick={() => setSelectedLeftMatch(p.id)}
                          className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-bold transition-all ${
                            done
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 opacity-60'
                              : active
                              ? 'bg-cyan-500/25 border-cyan-400 text-white'
                              : 'bg-[#070B19] border-slate-700 text-slate-200'
                          }`}
                        >
                          {p.left}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase">Pasangan Cocok</div>
                    {[...currentQ.pairs].reverse().map((p) => {
                      const done = matchedPairIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          disabled={done || !selectedLeftMatch || questionLocked}
                          onClick={async () => {
                            if (selectedLeftMatch === p.id) {
                              const nextMatched = [...matchedPairIds, p.id];
                              setMatchedPairIds(nextMatched);
                              setSelectedLeftMatch(null);
                              if (nextMatched.length === currentQ.pairs!.length) {
                                await submitAnswer(
                                  true,
                                  currentQ.points || 200,
                                  `Semua ${nextMatched.length} pasangan berhasil dicocokkan!`,
                                  { matchedPairIds: nextMatched }
                                );
                              }
                            } else {
                              showToast('Pasangan belum cocok, coba lagi!', 'error');
                              setSelectedLeftMatch(null);
                            }
                          }}
                          className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-bold transition-all ${
                            done
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 opacity-60'
                              : 'bg-[#070B19] border-slate-700 hover:border-purple-400 text-purple-200'
                          }`}
                        >
                          {p.right}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeGameDef.templateType === 'drag-and-drop' && currentQ.categories && currentQ.dragItems && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {currentQ.dragItems.map((item) => {
                    const assigned = dragAssignments[item.id];
                    const selected = selectedDragItem === item.id;
                    return (
                      <button
                        key={item.id}
                        draggable
                        onDragStart={() => setSelectedDragItem(item.id)}
                        onClick={() => setSelectedDragItem(item.id)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold cursor-grab ${
                          selected
                            ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                            : assigned
                            ? 'bg-indigo-950/60 border-indigo-500/40 text-cyan-200'
                            : 'bg-[#070B19] border-slate-700 text-white'
                        }`}
                      >
                        {item.label} {assigned ? `→ [${assigned}]` : ''}
                      </button>
                    );
                  })}
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {currentQ.categories.map((cat) => (
                    <div
                      key={cat}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (selectedDragItem) {
                          setDragAssignments((prev) => ({ ...prev, [selectedDragItem]: cat }));
                          setSelectedDragItem(null);
                        }
                      }}
                      onClick={() => {
                        if (selectedDragItem) {
                          setDragAssignments((prev) => ({ ...prev, [selectedDragItem]: cat }));
                          setSelectedDragItem(null);
                        }
                      }}
                      className="p-4 rounded-2xl bg-[#070B19] border-2 border-dashed border-amber-500/40 hover:border-amber-400 min-h-[100px] space-y-2 cursor-pointer"
                    >
                      <div className="text-xs font-black text-amber-300 uppercase">{cat}</div>
                      {currentQ.dragItems!
                        .filter((i) => dragAssignments[i.id] === cat)
                        .map((i) => (
                          <div key={i.id} className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-xs text-white font-semibold">
                            {i.label}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
                {!questionLocked && (
                  <button
                    onClick={async () => {
                      const correctCount = currentQ.dragItems!.filter(
                        (i) => dragAssignments[i.id] === i.targetCategory
                      ).length;
                      const isAllRight = correctCount === currentQ.dragItems!.length;
                      const pts = Math.round(
                        ((currentQ.points || 200) * correctCount) / currentQ.dragItems!.length
                      );
                      await submitAnswer(
                        isAllRight,
                        pts,
                        `Kamu menempatkan ${correctCount} dari ${currentQ.dragItems!.length} objek dengan tepat (+${pts} Poin).`,
                        { dragAssignments }
                      );
                    }}
                    className="px-5 py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    Validasi Klasifikasi
                  </button>
                )}
              </div>
            )}

            {activeGameDef.templateType === 'susun-kata' && (
              <div className="space-y-4">
                {currentQ.clue && <p className="text-xs text-slate-300">Petunjuk: {currentQ.clue}</p>}
                <div className="min-h-[52px] p-3 rounded-2xl bg-[#070B19] border border-cyan-500/40 flex flex-wrap gap-2 justify-center">
                  {scrambledChosen.map((ch, idx) => (
                    <button
                      key={idx}
                      onClick={() => setScrambledChosen((prev) => prev.filter((_, i) => i !== idx))}
                      className="w-10 h-10 rounded-xl bg-cyan-500 text-slate-950 font-mono font-black text-lg"
                    >
                      {ch}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {scrambledLetters.map((ch, idx) => (
                    <button
                      key={idx}
                      disabled={questionLocked}
                      onClick={() => setScrambledChosen((prev) => [...prev, ch])}
                      className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/40 text-white font-mono font-black text-lg hover:border-cyan-400"
                    >
                      {ch}
                    </button>
                  ))}
                </div>
                {!questionLocked && (
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => setScrambledChosen([])}
                      className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold"
                    >
                      Reset
                    </button>
                    <button
                      onClick={async () => {
                        const formed = scrambledChosen.join('');
                        const target = (currentQ.answerWord || 'KOMPUTER').toUpperCase();
                        const ok = formed === target;
                        await submitAnswer(
                          ok,
                          ok ? currentQ.points || 150 : 0,
                          ok ? `Tepat! Kata tersusun: ${target}` : `Susunan "${formed}" belum sesuai (${target}).`,
                          { formed }
                        );
                      }}
                      className="px-5 py-2 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs"
                    >
                      Cek Susunan Kata
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeGameDef.templateType === 'memory-match' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">Percobaan Membalik Kartu: {memoryAttempts}x</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {memoryDeck.map((card) => {
                    const isOpen = flippedCards.includes(card.idx) || matchedMemoryIds.includes(card.pairId);
                    return (
                      <button
                        key={card.idx}
                        disabled={isOpen || questionLocked}
                        onClick={async () => {
                          if (flippedCards.length >= 2) return;
                          const nextFlipped = [...flippedCards, card.idx];
                          setFlippedCards(nextFlipped);
                          if (nextFlipped.length === 2) {
                            setMemoryAttempts((a) => a + 1);
                            const c1 = memoryDeck.find((c) => c.idx === nextFlipped[0])!;
                            const c2 = memoryDeck.find((c) => c.idx === nextFlipped[1])!;
                            if (c1.pairId === c2.pairId) {
                              const nextMatched = [...matchedMemoryIds, c1.pairId];
                              setMatchedMemoryIds(nextMatched);
                              setFlippedCards([]);
                              if (nextMatched.length === (currentQ.pairs?.length || 0)) {
                                await submitAnswer(
                                  true,
                                  currentQ.points || 200,
                                  `Semua pasangan kartu ditemukan dalam ${memoryAttempts + 1} percobaan!`,
                                  { attempts: memoryAttempts + 1 }
                                );
                              }
                            } else {
                              setTimeout(() => setFlippedCards([]), 700);
                            }
                          }
                        }}
                        className={`h-20 p-2 rounded-2xl border font-bold text-xs flex items-center justify-center text-center transition-all ${
                          isOpen
                            ? 'bg-cyan-500/20 border-cyan-400 text-white'
                            : 'bg-[#070B19] border-indigo-500/30 text-indigo-400 hover:border-cyan-400'
                        }`}
                      >
                        {isOpen ? card.text : '?'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeGameDef.templateType === 'benar-salah' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'BENAR', val: true, color: 'from-emerald-500 to-teal-600' },
                    { label: 'SALAH', val: false, color: 'from-rose-500 to-pink-600' }
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      disabled={hasAnsweredThisQuestion || questionLocked || timeLeft === 0 || Boolean(isHost)}
                      onClick={async () => {
                        const ok = btn.val === Boolean(currentQ.isTrueStatement);
                        await submitAnswer(
                          ok,
                          ok ? currentQ.points || 100 : 0,
                          `${ok ? 'Tepat!' : 'Kurang tepat.'} ${currentQ.explanation || ''}`,
                          { choice: btn.val }
                        );
                      }}
                      className={`py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-r ${btn.color} hover:brightness-110 shadow-lg cursor-pointer`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {feedbackMsg && (
              <div
                className={`p-4 rounded-2xl border text-sm font-bold ${
                  feedbackMsg.correct
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                }`}
              >
                {feedbackMsg.text}
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {previewGameOverride
                  ? 'Mode Preview Guru (Skor tidak masuk leaderboard)'
                  : isHost
                  ? 'Kontrol Host / Guru'
                  : hasAnsweredThisQuestion
                  ? 'Jawaban terkunci & tervalidasi di server.'
                  : 'Selesaikan tantangan sebelum waktu habis!'}
              </span>

              {(previewGameOverride || isHost || (isPracticeMode && canAdvance)) && (
                <button
                  onClick={handleNextStep}
                  className="px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm text-slate-950 bg-cyan-400 hover:bg-cyan-300 flex items-center gap-1.5 cursor-pointer"
                >
                  {qIndex + 1 < totalQuestions
                    ? 'Soal Berikutnya'
                    : previewGameOverride
                    ? 'Selesai Preview'
                    : 'Lihat Hasil Akhir'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-5 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Klasemen Live Room
            </h3>
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {sortedLivePlayers.map((p, idx) => (
                <div
                  key={p.uid}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-[#070B19] border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 text-xs font-black text-slate-400">#{idx + 1}</span>
                    <span className="text-lg">{p.avatar}</span>
                    <div>
                      <div className="text-xs font-bold text-white">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.correctCount} Benar</div>
                    </div>
                  </div>
                  <span className="font-mono font-black text-sm text-cyan-300">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 16. HALAMAN HASIL GAME (PODIUM JUARA 1, 2, 3 & XP)
  // ==========================================================================
  const GameResultsPage = () => {
    if (!activeRoom) return null;

    const rankedPlayers = Object.values(activeRoom.players || {}).sort(
      (a, b) => b.score - a.score
    );

    const top3 = [rankedPlayers[0], rankedPlayers[1], rankedPlayers[2]];

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="text-center space-y-2">
          <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-widest">
            Pertandingan Selesai
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Podium Juara Arena</h1>
          <p className="text-sm text-slate-400">{activeRoom.gameTitle} • Room {activeRoom.code}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
          {top3[1] && (
            <div className="order-2 md:order-1 p-6 rounded-3xl bg-[#0D132B] border border-slate-400/40 text-center space-y-2">
              <div className="text-3xl">{top3[1].avatar}</div>
              <div className="inline-block px-3 py-0.5 rounded-full bg-slate-400/20 text-slate-200 text-xs font-black">
                JUARA 2
              </div>
              <div className="font-bold text-white text-base">{top3[1].name}</div>
              <div className="font-mono text-2xl font-black text-cyan-300">{top3[1].score} PTS</div>
              <div className="text-xs text-emerald-400">+{Math.round(top3[1].score * 0.4)} XP</div>
            </div>
          )}

          {top3[0] && (
            <div className="order-1 md:order-2 p-8 rounded-3xl bg-gradient-to-b from-amber-500/20 to-[#0D132B] border-2 border-amber-400 text-center space-y-2 shadow-2xl shadow-amber-500/15">
              <Crown className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
              <div className="text-4xl">{top3[0].avatar}</div>
              <div className="inline-block px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
                JUARA 1 CHAMPION
              </div>
              <div className="font-black text-white text-lg">{top3[0].name}</div>
              <div className="font-mono text-3xl font-black text-amber-300">{top3[0].score} PTS</div>
              <div className="text-xs font-bold text-emerald-400">
                +{Math.max(80, Math.round(top3[0].score * 0.5))} XP Bonus
              </div>
            </div>
          )}

          {top3[2] && (
            <div className="order-3 p-6 rounded-3xl bg-[#0D132B] border border-orange-500/40 text-center space-y-2">
              <div className="text-3xl">{top3[2].avatar}</div>
              <div className="inline-block px-3 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-xs font-black">
                JUARA 3
              </div>
              <div className="font-bold text-white text-base">{top3[2].name}</div>
              <div className="font-mono text-2xl font-black text-cyan-300">{top3[2].score} PTS</div>
              <div className="text-xs text-emerald-400">+{Math.round(top3[2].score * 0.35)} XP</div>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/25 p-6">
          <h3 className="text-base font-black text-white mb-4">Rincian Hasil Seluruh Peserta</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                  <th className="py-3 px-3">Peringkat</th>
                  <th className="py-3 px-3">Pemain</th>
                  <th className="py-3 px-3">Jawaban Benar</th>
                  <th className="py-3 px-3">Total Skor</th>
                  <th className="py-3 px-3">XP Diperoleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rankedPlayers.map((p, idx) => (
                  <tr key={p.uid}>
                    <td className="py-3 px-3 font-black text-cyan-400">#{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <span>{p.avatar}</span> {p.name}
                    </td>
                    <td className="py-3 px-3 text-slate-300">{p.correctCount} Soal</td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-300">{p.score}</td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">
                      +{Math.max(40, Math.round(p.score * 0.4))} XP
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => {
              if (isPracticeMode) {
                handleStartPracticeGame(activeRoom.gameId);
              } else {
                setActivePage('dashboard');
              }
            }}
            className="px-6 py-3.5 rounded-xl font-black text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-500 cursor-pointer"
          >
            Main Lagi
          </button>
          <button
            onClick={() => {
              setActiveRoom(null);
              setActivePage(currentUser ? 'dashboard' : 'landing');
            }}
            className="px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-white/10 hover:bg-white/15 border border-white/15"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 17. HALAMAN LEADERBOARD GLOBAL
  // ==========================================================================
  const LeaderboardPage = () => {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Hall of Fame SMK
            </span>
            <h1 className="text-3xl font-black text-white mt-1">Leaderboard Arena</h1>
          </div>

          <div className="flex p-1 rounded-xl bg-[#0D132B] border border-indigo-500/30">
            {(['harian', 'mingguan', 'keseluruhan'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setLeaderboardFilter(period)}
                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                  leaderboardFilter === period
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#070B19] border-b border-slate-800 text-xs uppercase text-slate-400">
                  <th className="py-4 px-5">Rank</th>
                  <th className="py-4 px-5">Siswa / Pemain</th>
                  <th className="py-4 px-5">Level</th>
                  <th className="py-4 px-5">Total XP</th>
                  <th className="py-4 px-5">Menang</th>
                  <th className="py-4 px-5 text-right">Total Skor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sortedLeaderboardList.map((entry, idx) => {
                  const level = Math.max(1, Math.floor(entry.xp / 500));
                  return (
                    <tr key={entry.id} className="hover:bg-white/[0.02]">
                      <td className="py-4 px-5 font-black text-base">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </td>
                      <td className="py-4 px-5 font-bold text-white flex items-center gap-3">
                        <span className="text-2xl">{entry.avatar}</span>
                        <span>{entry.name}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold">
                          LVL {level}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-semibold text-cyan-300">{entry.xp} XP</td>
                      <td className="py-4 px-5 text-slate-300">{entry.wins}x</td>
                      <td className="py-4 px-5 text-right font-mono font-black text-amber-300 text-base">
                        {entry.totalScore.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 18. HALAMAN KONFIGURASI SUPABASE, SQL MIGRATION, RLS, STORAGE & EDGE FUNCTIONS
  // ==========================================================================
  const SupabaseGuidePage = () => {
    const copyText = (txt: string, label: string) => {
      navigator.clipboard?.writeText(txt);
      showToast(`${label} disalin ke clipboard!`, 'success');
    };

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="rounded-3xl bg-[#0D132B] border border-emerald-500/30 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                <Database className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Arsitektur & Setup Supabase</h1>
                <p className="text-xs text-slate-400">
                  PostgreSQL (16 Tabel), RLS Policies, 4 Storage Buckets, Realtime & 8 Edge Functions
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 bg-[#070B19] p-1.5 rounded-2xl border border-slate-800">
              {[
                { id: 'connect', label: '1. Koneksi ENV' },
                { id: 'structure', label: '2. Struktur Folder' },
                { id: 'sql', label: '3. SQL Migration & RLS' },
                { id: 'edge', label: '4. Edge Functions' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveDocTab(t.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    activeDocTab === t.id
                      ? 'bg-emerald-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {activeDocTab === 'connect' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed">
                <strong>Keamanan Kredensial:</strong> Hanya gunakan <code>VITE_SUPABASE_URL</code> dan{' '}
                <code>VITE_SUPABASE_ANON_KEY</code> (Publishable Key) pada sisi frontend. Jangan pernah memasukkan{' '}
                <code>service_role</code> key ke dalam kode client.
              </div>

              <form onSubmit={handleConnectManualSupabase} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    VITE_SUPABASE_URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseUrlInput}
                    onChange={(e) => setSupabaseUrlInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#070B19] border border-slate-700 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    VITE_SUPABASE_ANON_KEY (Publishable Key)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseAnonKeyInput}
                    onChange={(e) => setSupabaseAnonKeyInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#070B19] border border-slate-700 text-white font-mono text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-black text-xs cursor-pointer"
                >
                  Simpan & Hubungkan ke Supabase
                </button>
              </form>
            </div>
          )}

          {activeDocTab === 'structure' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300">Struktur Folder Proyek Full-Stack</span>
                <button
                  onClick={() => copyText(SUPABASE_PROJECT_STRUCTURE, 'Struktur folder')}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold text-white flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" /> Salin
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-[#070B19] border border-slate-800 text-xs text-emerald-200 overflow-x-auto font-mono leading-relaxed">
                {SUPABASE_PROJECT_STRUCTURE}
              </pre>
            </div>
          )}

          {activeDocTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300">
                  SQL Migration Lengkap (16 Tabel + RLS + 4 Storage Buckets)
                </span>
                <button
                  onClick={() => copyText(SUPABASE_SQL_MIGRATION, 'SQL Migration')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" /> Salin SQL Migration
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-[#070B19] border border-slate-800 text-xs text-cyan-200 overflow-x-auto max-h-[420px] font-mono leading-relaxed">
                {SUPABASE_SQL_MIGRATION}
              </pre>
            </div>
          )}

          {activeDocTab === 'edge' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300">
                  Edge Functions: create-room, join-room, start-game, submit-answer, calculate-score, next-question, finish-game, get-leaderboard
                </span>
                <button
                  onClick={() => copyText(SUPABASE_EDGE_FUNCTIONS_CODE, 'Kode Edge Function')}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-200 text-xs font-bold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" /> Salin Kode
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-[#070B19] border border-slate-800 text-xs text-purple-200 overflow-x-auto max-h-[420px] font-mono leading-relaxed">
                {SUPABASE_EDGE_FUNCTIONS_CODE}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 19. MODAL BUAT ROOM MULTIPLAYER (GURU / HOST)
  // ==========================================================================
  const CreateRoomModal = () => {
    if (!showCreateRoomModal) return null;
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-[#0D132B] border border-cyan-500/40 p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-white">Buat Room Multiplayer</h3>
            <button
              onClick={() => setShowCreateRoomModal(false)}
              className="text-slate-400 hover:text-white text-sm font-bold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                Pilih Game Edukasi
              </label>
              <select
                value={newRoomGameId}
                onChange={(e) => setNewRoomGameId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#070B19] border border-slate-700 text-white text-sm"
              >
                {games
                  .filter((g) => g.status === 'published' && g.playable)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} [{g.templateType.toUpperCase()}]
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                Mode Bermain
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['individu', 'kelompok'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setNewRoomPlayMode(m)}
                    className={`py-2 rounded-xl text-xs font-bold capitalize border ${
                      newRoomPlayMode === m
                        ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                        : 'bg-[#070B19] border-slate-700 text-slate-400'
                    }`}
                  >
                    Mode {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  Maksimal Siswa
                </label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={newRoomMaxPlayers}
                  onChange={(e) => setNewRoomMaxPlayers(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  Durasi / Soal (Detik)
                </label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={newRoomDuration}
                  onChange={(e) => setNewRoomDuration(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                Tingkat Kesulitan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Mudah', 'Sedang', 'Sulit'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setNewRoomDifficulty(lvl)}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      newRoomDifficulty === lvl
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-[#070B19] border-slate-700 text-slate-400'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-black text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:brightness-110 cursor-pointer"
            >
              GENERATE KODE ROOM & BUKA LOBBY
            </button>
          </form>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 20. RENDER UTAMA APLIKASI
  // ==========================================================================
  const filteredCatalogGames = useMemo(() => {
    return games.filter((g) => {
      if (g.status !== 'published') return false;
      const matchSearch =
        g.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        g.creatorName.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        g.subject.toLowerCase().includes(catalogSearch.toLowerCase());
      const matchCat = catalogCategoryFilter === 'Semua' || g.category === catalogCategoryFilter;
      const matchGrade = catalogGradeFilter === 'Semua' || g.gradeLevel.includes(catalogGradeFilter);
      const matchDiff = catalogDifficultyFilter === 'Semua' || g.difficulty === catalogDifficultyFilter;
      return matchSearch && matchCat && matchGrade && matchDiff;
    });
  }, [games, catalogSearch, catalogCategoryFilter, catalogGradeFilter, catalogDifficultyFilter]);

  return (
    <div className="min-h-screen bg-[#070B19] text-slate-100 font-sans selection:bg-emerald-400 selection:text-slate-950">
      {Navbar()}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-400 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-400 text-rose-200'
                : 'bg-indigo-950/95 border-cyan-400 text-cyan-200'
            }`}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <main>
        {activePage === 'landing' && LandingPage()}
        {activePage === 'creator' && GameCreatorStudioPage()}

        {activePage === 'catalog' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                  Katalog Publik & Karya Guru
                </span>
                <h1 className="text-3xl font-black text-white mt-1">Katalog Game Edukasi</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Temukan permainan interaktif berdasarkan mata pelajaran, kelas, dan tingkat kesulitan.
                </p>
              </div>
              {currentUser && ['teacher', 'admin', 'super_admin'].includes(currentUser.role) && (
                <button
                  onClick={() => {
                    setCreatorSubView('list');
                    setActivePage('creator');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 self-start"
                >
                  <Wand2 className="w-4 h-4" />
                  + Buat Game Baru
                </button>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#0D132B] border border-indigo-500/25 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Cari judul game, mapel, guru..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                />
              </div>
              <select
                value={catalogCategoryFilter}
                onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
              >
                <option value="Semua">Semua Kategori</option>
                {lessonCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={catalogGradeFilter}
                onChange={(e) => setCatalogGradeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
              >
                <option value="Semua">Semua Kelas</option>
                <option value="Kelas X">Kelas X</option>
                <option value="Kelas XI">Kelas XI</option>
                <option value="Kelas XII">Kelas XII</option>
              </select>
              <select
                value={catalogDifficultyFilter}
                onChange={(e) => setCatalogDifficultyFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
              >
                <option value="Semua">Semua Kesulitan</option>
                <option value="Mudah">Mudah</option>
                <option value="Sedang">Sedang</option>
                <option value="Sulit">Sulit</option>
              </select>
            </div>

            {filteredCatalogGames.length === 0 ? (
              <div className="text-center py-14 rounded-3xl bg-[#0D132B] border border-dashed border-slate-700">
                <p className="text-slate-400 text-sm">Tidak ada game yang sesuai dengan filter pencarian.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCatalogGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </div>
        )}

        {activePage === 'leaderboard' && LeaderboardPage()}

        {activePage === 'about' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
            <div className="rounded-3xl bg-[#0D132B] border border-indigo-500/30 p-8 space-y-4">
              <h1 className="text-3xl font-black text-white">Tentang EDU GAME ARENA</h1>
              <p className="text-slate-300 leading-relaxed">
                <strong>EDU GAME ARENA</strong> adalah platform pembelajaran berbasis permainan (Game-Based Learning) modern berbasis <strong>Supabase PostgreSQL, Realtime, Storage & Edge Functions</strong> yang dirancang khusus untuk meningkatkan antusiasme siswa SMK.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 pt-4">
                <div className="p-4 rounded-2xl bg-[#070B19] border border-slate-800">
                  <div className="font-bold text-emerald-400 mb-1">Supabase Realtime</div>
                  <p className="text-xs text-slate-400">
                    Presence status online siswa, broadcast pergantian soal, dan klasemen langsung.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#070B19] border border-slate-800">
                  <div className="font-bold text-cyan-400 mb-1">Edge Functions Anti-Cheat</div>
                  <p className="text-xs text-slate-400">
                    Kunci jawaban dikunci dengan RLS dan skor divalidasi langsung di server.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#070B19] border border-slate-800">
                  <div className="font-bold text-purple-400 mb-1">Game Creator Studio</div>
                  <p className="text-xs text-slate-400">
                    8 template interaktif siap pakai dengan penyimpanan aset di Supabase Storage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePage === 'login' && LoginAndJoinPage()}
        {activePage === 'dashboard' && RoleDashboard()}
        {activePage === 'lobby' && MultiplayerLobby()}
        {activePage === 'game' && <LiveGameArena />}
        {activePage === 'results' && GameResultsPage()}
        {activePage === 'supabase-guide' &&
          (currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin') ? (
            SupabaseGuidePage()
          ) : (
            <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
              <Lock className="w-12 h-12 text-amber-400 mx-auto" />
              <h2 className="text-xl font-black text-white">Panel Supabase Terkunci</h2>
              <p className="text-xs text-slate-400">
                Verifikasi akun Admin atau Super Admin diperlukan untuk membuka pengaturan Supabase.
              </p>
              <button
                onClick={handleOpenProtectedSupabaseSetup}
                className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                Verifikasi Sandi Admin
              </button>
            </div>
          ))}
      </main>

      {CreateRoomModal()}

      {/* Modal Verifikasi Sandi Admin / Super Admin untuk Tombol Supabase Live */}
      {showSupabaseAuthGate && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0D132B] border border-emerald-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Verifikasi Admin / Super Admin
              </h3>
              <button
                onClick={() => setShowSupabaseAuthGate(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Demi keamanan konfigurasi backend, masukkan username/email dan kata sandi{' '}
              <strong className="text-emerald-300">Admin</strong> atau{' '}
              <strong className="text-amber-300">Super Admin</strong> untuk mengakses pengaturan Supabase.
            </p>
            <form onSubmit={handleVerifySupabaseGate} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Username atau Email Admin / Super Admin
                </label>
                <input
                  type="text"
                  required
                  placeholder="admin_darulfikri atau admin@darulfikri.sch.id"
                  value={sbGateIdentifier}
                  onChange={(e) => setSbGateIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Kata Sandi Admin / Super Admin
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Masukkan kata sandi..."
                  value={sbGatePassword}
                  onChange={(e) => setSbGatePassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSupabaseAuthGate(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={sbGateVerifying}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-black text-xs cursor-pointer disabled:opacity-50"
                >
                  {sbGateVerifying ? 'Memverifikasi...' : 'Buka Panel Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bootstrap Super Admin (admin_darulfikri) via Server-Side Edge Function */}
      {showBootstrapModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0D132B] border border-amber-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                Bootstrap Super Admin
              </h3>
              <button
                onClick={() => setShowBootstrapModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Membuat akun awal <code className="text-amber-300">admin_darulfikri</code> melalui Edge Function{' '}
              <code>bootstrap-super-admin</code>. Password tidak pernah disimpan di kode frontend.
            </p>
            <form onSubmit={handleBootstrapSuperAdmin} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Username Awal</label>
                <input
                  type="text"
                  disabled
                  value="admin_darulfikri"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B19] border border-slate-800 text-amber-300 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Email Super Admin</label>
                <input
                  type="email"
                  required
                  placeholder="admin@darulfikri.sch.id"
                  value={bootstrapEmail}
                  onChange={(e) => setBootstrapEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Password Awal (Min. 8 Karakter)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={bootstrapPassword}
                  onChange={(e) => setBootstrapPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Server BOOTSTRAP_SECRET (dari Supabase Edge Secrets)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan secret key server..."
                  value={bootstrapSecret}
                  onChange={(e) => setBootstrapSecret(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B19] border border-slate-700 text-white text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs cursor-pointer"
              >
                Jalankan Bootstrap Server-Side
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedGameDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#0D132B] border border-cyan-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase">
                  {selectedGameDetail.category} • {selectedGameDetail.templateType}
                </span>
                <h3 className="text-xl font-black text-white mt-1">{selectedGameDetail.title}</h3>
                <p className="text-xs text-slate-400">
                  Dibuat oleh {selectedGameDetail.creatorName} • {selectedGameDetail.subject} ({selectedGameDetail.gradeLevel})
                </p>
              </div>
              <button
                onClick={() => setSelectedGameDetail(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{selectedGameDetail.description}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-[#070B19]">
                <div className="text-[10px] text-slate-400">Jumlah Soal</div>
                <div className="font-black text-cyan-300 text-sm">{selectedGameDetail.questions?.length || 0}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#070B19]">
                <div className="text-[10px] text-slate-400">Kesulitan</div>
                <div className="font-black text-purple-300 text-sm">{selectedGameDetail.difficulty}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#070B19]">
                <div className="text-[10px] text-slate-400">Dimainkan</div>
                <div className="font-black text-amber-300 text-sm">{selectedGameDetail.playsCount}x</div>
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => {
                  const id = selectedGameDetail.id;
                  setSelectedGameDetail(null);
                  handleStartPracticeGame(id);
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                Mainkan Sekarang (Self-Play)
              </button>
              <button
                onClick={() => setSelectedGameDetail(null)}
                className="px-4 py-3 rounded-xl bg-white/10 text-white font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {isPreviewOverlayOpen && editingGame && (
        <div className="fixed inset-0 z-50 bg-[#070B19]/95 backdrop-blur-md overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 pt-4 flex justify-between items-center">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black">
              SIMULASI PREVIEW GAME CREATOR STUDIO
            </span>
            <button
              onClick={() => setIsPreviewOverlayOpen(false)}
              className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold cursor-pointer"
            >
              ✕ Tutup Preview & Kembali ke Editor
            </button>
          </div>
          <LiveGameArena
            previewGameOverride={editingGame}
            onClosePreview={() => setIsPreviewOverlayOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
