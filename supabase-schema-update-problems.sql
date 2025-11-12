-- ================================================
-- 멀티플레이어 문제 동기화를 위한 스키마 업데이트
-- ================================================

-- rooms 테이블에 현재 문제 정보 컬럼 추가
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS current_problem JSONB DEFAULT NULL;

-- 문제 생성 시간 추적용 컬럼 추가
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS problem_created_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_rooms_current_problem ON public.rooms(id) WHERE current_problem IS NOT NULL;

-- ================================================
-- 완료!
-- ================================================
-- 이 SQL 파일을 Supabase SQL Editor에서 실행하세요.

