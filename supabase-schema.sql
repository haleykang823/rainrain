-- ================================================
-- 구구단 산성비 게임 데이터베이스 스키마
-- ================================================

-- 1. users 테이블 생성
-- id는 auth.users의 id를 참조하므로 DEFAULT 제거
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT UNIQUE NOT NULL,
  best_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. rooms 테이블 생성
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'normal', 'hard', 'custom')),
  custom_tables INTEGER[],
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  max_players INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE
);

-- 3. room_participants 테이블 생성
CREATE TABLE IF NOT EXISTS public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- 4. game_sessions 테이블 생성
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  accuracy FLOAT NOT NULL,
  difficulty TEXT NOT NULL,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. leaderboard 테이블 생성 (캐시용, 선택사항)
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_score INTEGER DEFAULT 0,
  weekly_score INTEGER DEFAULT 0,
  monthly_score INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 인덱스 생성 (성능 최적화)
-- ================================================

CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON public.rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON public.room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_room_id ON public.game_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_played_at ON public.game_sessions(played_at DESC);

-- ================================================
-- Row Level Security (RLS) 정책
-- ================================================

-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- users 테이블 RLS 정책
-- 모든 사용자가 다른 사용자 정보 읽기 가능
CREATE POLICY "Anyone can view users" ON public.users
  FOR SELECT USING (true);

-- 자신의 정보만 수정 가능
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 회원가입 시 자신의 레코드만 생성 가능
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- rooms 테이블 RLS 정책
-- 모든 사용자가 방 목록 조회 가능
CREATE POLICY "Anyone can view rooms" ON public.rooms
  FOR SELECT USING (true);

-- 로그인한 사용자는 방 생성 가능
CREATE POLICY "Authenticated users can create rooms" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);

-- 방장만 방 수정 가능
CREATE POLICY "Room hosts can update rooms" ON public.rooms
  FOR UPDATE USING (auth.uid() = host_id);

-- 방장만 방 삭제 가능
CREATE POLICY "Room hosts can delete rooms" ON public.rooms
  FOR DELETE USING (auth.uid() = host_id);

-- room_participants 테이블 RLS 정책
-- 모든 사용자가 참여자 목록 조회 가능
CREATE POLICY "Anyone can view room participants" ON public.room_participants
  FOR SELECT USING (true);

-- 로그인한 사용자는 방 참여 가능
CREATE POLICY "Authenticated users can join rooms" ON public.room_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 자신의 참여 정보 삭제 가능 (방 나가기)
CREATE POLICY "Users can leave rooms" ON public.room_participants
  FOR DELETE USING (auth.uid() = user_id);

-- game_sessions 테이블 RLS 정책
-- 모든 사용자가 게임 세션 조회 가능
CREATE POLICY "Anyone can view game sessions" ON public.game_sessions
  FOR SELECT USING (true);

-- 자신의 게임 결과만 생성 가능
CREATE POLICY "Users can create own game sessions" ON public.game_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- leaderboard 테이블 RLS 정책
-- 모든 사용자가 리더보드 조회 가능
CREATE POLICY "Anyone can view leaderboard" ON public.leaderboard
  FOR SELECT USING (true);

-- 시스템만 leaderboard 수정 가능 (트리거로 처리)
-- 사용자는 직접 수정 불가

-- ================================================
-- 트리거 함수 및 트리거
-- ================================================

-- users 테이블의 updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- game_sessions 삽입 시 users.best_score 자동 업데이트
CREATE OR REPLACE FUNCTION update_user_best_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET best_score = GREATEST(best_score, NEW.score)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_best_score_on_game_session
  AFTER INSERT ON public.game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_best_score();

-- ================================================
-- Realtime 활성화
-- ================================================

-- Realtime 구독을 위한 테이블 발행
-- Supabase 대시보드에서 수동으로 설정하거나 아래 명령어 실행
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;

-- ================================================
-- 초기 데이터 (선택사항)
-- ================================================

-- 테스트용 사용자 (실제 배포 시 제거)
-- INSERT INTO public.users (id, nickname, best_score) VALUES
--   (gen_random_uuid(), '테스트유저1', 100),
--   (gen_random_uuid(), '테스트유저2', 200);

-- ================================================
-- 유용한 뷰 (선택사항)
-- ================================================

-- 리더보드 뷰 (전체)
CREATE OR REPLACE VIEW public.total_leaderboard AS
SELECT 
  u.id as user_id,
  u.nickname,
  u.best_score,
  COALESCE(SUM(gs.score), 0) as total_score,
  COUNT(gs.id) as game_count,
  ROW_NUMBER() OVER (ORDER BY u.best_score DESC, COALESCE(SUM(gs.score), 0) DESC) as rank
FROM public.users u
LEFT JOIN public.game_sessions gs ON u.id = gs.user_id
GROUP BY u.id, u.nickname, u.best_score
ORDER BY rank;

-- 주간 리더보드 뷰
CREATE OR REPLACE VIEW public.weekly_leaderboard AS
SELECT 
  u.id as user_id,
  u.nickname,
  COALESCE(SUM(gs.score), 0) as weekly_score,
  COUNT(gs.id) as game_count,
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(gs.score), 0) DESC) as rank
FROM public.users u
LEFT JOIN public.game_sessions gs ON u.id = gs.user_id
  AND gs.played_at >= NOW() - INTERVAL '7 days'
GROUP BY u.id, u.nickname
ORDER BY rank;

-- 월간 리더보드 뷰
CREATE OR REPLACE VIEW public.monthly_leaderboard AS
SELECT 
  u.id as user_id,
  u.nickname,
  COALESCE(SUM(gs.score), 0) as monthly_score,
  COUNT(gs.id) as game_count,
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(gs.score), 0) DESC) as rank
FROM public.users u
LEFT JOIN public.game_sessions gs ON u.id = gs.user_id
  AND gs.played_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.nickname
ORDER BY rank;

-- ================================================
-- 완료!
-- ================================================
-- 이 SQL 파일을 Supabase SQL Editor에서 실행하세요.

