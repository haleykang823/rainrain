import { storageKey, projectRef } from './supabase';

/**
 * 인증 관련 스토리지 정리 유틸리티
 */
export function clearAuthStorage() {
  console.log('[clearAuthStorage] 시작');
  console.log('[clearAuthStorage] 프로젝트 참조:', projectRef);
  console.log('[clearAuthStorage] 스토리지 키:', storageKey);
  
  // 모든 localStorage 키 확인
  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      allKeys.push(key);
    }
  }
  
  console.log('[clearAuthStorage] 현재 localStorage 키:', allKeys);
  
  // Supabase 관련 키 정리
  const keysToRemove: string[] = [];
  
  for (const key of allKeys) {
    if (
      key === storageKey || // 정확한 스토리지 키
      key.includes('supabase') ||
      key.includes('auth') ||
      key.startsWith('sb-') ||
      key.includes(projectRef) ||
      key.includes('multiplication-rain')
    ) {
      keysToRemove.push(key);
    }
  }
  
  console.log('[clearAuthStorage] 제거할 키:', keysToRemove);
  
  keysToRemove.forEach(key => {
    console.log('[clearAuthStorage] 키 제거:', key);
    localStorage.removeItem(key);
  });
  
  // sessionStorage도 정리
  sessionStorage.clear();
  
  // 제거 후 남은 키 확인
  const remainingKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      remainingKeys.push(key);
    }
  }
  console.log('[clearAuthStorage] 남은 키:', remainingKeys);
  console.log('[clearAuthStorage] 완료');
}
