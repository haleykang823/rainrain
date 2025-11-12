import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
}

// Supabase URL에서 프로젝트 참조 추출 (스토리지 키 생성용)
const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown';
const storageKey = `sb-${projectRef}-auth-token`;

console.log('[supabase] 프로젝트 참조:', projectRef);
console.log('[supabase] 스토리지 키:', storageKey);

// 명시적으로 스토리지 설정
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: window.localStorage,
    storageKey: storageKey,
  },
});

export type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// 스토리지 키를 export하여 clearAuthStorage에서 사용
export { storageKey, projectRef };
