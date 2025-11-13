import { supabase } from '../utils/supabase';
import { User } from '../types';
import { clearAuthStorage } from '../utils/authStorage';

/**
 * 간단하고 명확한 인증 서비스
 */
export const authService = {
  /**
   * 회원가입
   */
  async signUp(nickname: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      console.log('[authService] signUp 시작:', nickname);
      
      // 1. 닉네임 중복 확인
      console.log('[authService] 닉네임 중복 확인 중...');
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('nickname', nickname)
        .maybeSingle();

      if (checkError) {
        console.error('[authService] 닉네임 중복 확인 에러:', checkError);
        // 테이블이 없는 경우를 위한 에러 메시지
        if (checkError.code === '42P01' || checkError.message?.includes('does not exist')) {
          return { user: null, error: '데이터베이스 테이블이 생성되지 않았습니다. Supabase 설정을 확인해주세요.' };
        }
        return { user: null, error: checkError.message || '닉네임 확인 중 오류가 발생했습니다.' };
      }

      if (existing) {
        return { user: null, error: '이미 사용 중인 닉네임입니다.' };
      }

      // 2. Supabase Auth 회원가입 (닉네임을 이메일 형식으로 변환)
      console.log('[authService] Supabase Auth 회원가입 시도...');
      const email = `${nickname}@game.local`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname },
        },
      });

      if (authError) {
        console.error('[authService] Auth 회원가입 에러:', authError);
        return { user: null, error: authError.message || '회원가입에 실패했습니다.' };
      }

      if (!authData.user) {
        console.error('[authService] 사용자 데이터 없음');
        return { user: null, error: '회원가입에 실패했습니다. 사용자 정보를 생성할 수 없습니다.' };
      }

      console.log('[authService] Auth 회원가입 성공, 사용자 ID:', authData.user.id);

      // 3. public.users 테이블에 프로필 생성
      console.log('[authService] users 테이블에 프로필 생성 시도...');
      const { data: userData, error: insertError } = await supabase
        .from('users')
        .insert([{
            id: authData.user.id,
            nickname,
            best_score: 0,
        }])
        .select()
        .single();

      if (insertError) {
        console.error('[authService] 프로필 생성 에러:', insertError);
        // 이미 존재하는 경우 조회
        if (insertError.code === '23505') {
          console.log('[authService] 중복 키 에러, 기존 사용자 조회 시도...');
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();
          
          if (data) {
            console.log('[authService] 기존 사용자 조회 성공');
            return { user: data as User, error: null };
          }
        }
        // 테이블이 없는 경우를 위한 에러 메시지
        if (insertError.code === '42P01' || insertError.message?.includes('does not exist')) {
          return { user: null, error: '데이터베이스 테이블이 생성되지 않았습니다. Supabase 설정을 확인해주세요.' };
        }
        return { user: null, error: insertError.message || '프로필 생성에 실패했습니다.' };
      }

      console.log('[authService] 회원가입 완료:', userData.nickname);
      return { user: userData as User, error: null };
    } catch (error: any) {
      console.error('[authService] signUp 예외 발생:', error);
      return { user: null, error: error.message || '회원가입 중 오류가 발생했습니다.' };
    }
  },

  /**
   * 로그인
   */
  async signIn(nickname: string, password: string): Promise<{ user: User | null; error: string | null }> {
    console.log('[authService] signIn 시작:', nickname);
    
    try {
      // 1. 기존 세션 정리
      console.log('[authService] 기존 세션 정리');
      await supabase.auth.signOut({ scope: 'local' });
      clearAuthStorage();
      
      // 2. 짧은 대기 (세션 정리 완료 대기)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 3. 로그인 시도
      const email = `${nickname}@game.local`;
      console.log('[authService] signInWithPassword 호출:', email);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[authService] signInWithPassword 결과:', { 
        hasUser: !!authData?.user, 
        error: authError?.message 
      });

      if (authError) {
        console.error('[authService] 로그인 실패:', authError);
        return { user: null, error: '닉네임 또는 비밀번호가 올바르지 않습니다.' };
      }

      if (!authData?.user) {
        console.error('[authService] 사용자 데이터 없음');
        return { user: null, error: '로그인에 실패했습니다.' };
      }

      // 4. 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[authService] 세션 확인:', { hasSession: !!session, userId: session?.user?.id });

      if (!session) {
        console.error('[authService] 세션이 생성되지 않음');
        return { user: null, error: '세션 생성에 실패했습니다.' };
      }

      // 5. users 테이블에서 사용자 정보 가져오기
      console.log('[authService] 사용자 정보 조회:', authData.user.id);
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      console.log('[authService] 사용자 정보 조회 결과:', { 
        hasData: !!userData, 
        error: fetchError?.message 
      });

      if (fetchError || !userData) {
        // 없으면 생성
        console.log('[authService] 사용자 정보 없음, 생성 시도');
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            nickname,
            best_score: 0,
          }])
          .select()
          .single();

        if (insertError) {
          console.error('[authService] 사용자 생성 실패:', insertError);
          return { user: null, error: '사용자 정보를 생성하는데 실패했습니다.' };
        }

        if (newUser) {
          console.log('[authService] 사용자 생성 성공:', newUser.nickname);
          return { user: newUser as User, error: null };
        }
        
        return { user: null, error: '사용자 정보를 가져오는데 실패했습니다.' };
      }

      console.log('[authService] 로그인 성공:', userData.nickname);
      return { user: userData as User, error: null };
    } catch (error: any) {
      console.error('[authService] 예외 발생:', error);
      return { user: null, error: error.message || '로그인 중 오류가 발생했습니다.' };
    }
  },

  /**
   * 로그아웃
   */
  async signOut(): Promise<{ error: string | null }> {
    try {
      // 1. Supabase 로그아웃
      const { error } = await supabase.auth.signOut();
      
      // 2. 모든 인증 관련 스토리지 정리
      clearAuthStorage();
      
      return { error: error?.message || null };
    } catch (error: any) {
      // 오류가 발생해도 스토리지는 정리
      clearAuthStorage();
      return { error: error.message || '로그아웃 중 오류가 발생했습니다.' };
    }
  },

  /**
   * 현재 사용자 가져오기
   */
  async getCurrentUser(): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        return { user: null, error: null };
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error || !userData) {
        return { user: null, error: null };
      }

      return { user: userData as User, error: null };
    } catch (error) {
      return { user: null, error: null };
    }
  },
};
