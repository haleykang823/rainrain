import { useState, useCallback } from 'react';
import { User } from '../../types';
import { authService } from '../../services/authService';

/**
 * 인증 관련 Hook
 * 로그인, 회원가입, 로그아웃 기능 제공
 */
export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 회원가입
   */
  const signUp = useCallback(async (nickname: string, password: string, passwordConfirm: string) => {
    setLoading(true);
    setError(null);

    try {
      // 비밀번호 확인 검사
      if (password !== passwordConfirm) {
        setError('비밀번호가 일치하지 않습니다.');
        setLoading(false);
        return { user: null, error: '비밀번호가 일치하지 않습니다.' };
      }

      const result = await authService.signUp(nickname, password);
      
      if (result.error) {
        setError(result.error);
      }

      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = '회원가입 중 오류가 발생했습니다.';
      setError(errorMessage);
      setLoading(false);
      return { user: null, error: errorMessage };
    }
  }, []);

  /**
   * 로그인
   */
  const signIn = useCallback(async (nickname: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await authService.signIn(nickname, password);
      
      if (result.error) {
        setError(result.error);
      }

      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = '로그인 중 오류가 발생했습니다.';
      setError(errorMessage);
      setLoading(false);
      return { user: null, error: errorMessage };
    }
  }, []);

  /**
   * 로그아웃
   */
  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await authService.signOut();
      
      if (result.error) {
        setError(result.error);
      }

      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = '로그아웃 중 오류가 발생했습니다.';
      setError(errorMessage);
      setLoading(false);
      return { error: errorMessage };
    }
  }, []);

  /**
   * 현재 사용자 정보 가져오기
   */
  const getCurrentUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await authService.getCurrentUser();
      
      if (result.error) {
        setError(result.error);
      }

      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = '사용자 정보를 가져오는데 실패했습니다.';
      setError(errorMessage);
      setLoading(false);
      return { user: null, error: errorMessage };
    }
  }, []);

  /**
   * 에러 초기화
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    clearError,
  };
};

