# 멀티플레이어 문제 동기화 설정 가이드

## 1. 데이터베이스 스키마 업데이트

멀티플레이어 모드에서 모든 플레이어가 같은 문제를 풀 수 있도록 하기 위해 데이터베이스 스키마를 업데이트해야 합니다.

### Supabase SQL Editor에서 실행

1. Supabase 대시보드에 로그인
2. SQL Editor로 이동
3. `supabase-schema-update-problems.sql` 파일의 내용을 복사하여 실행

또는 직접 실행:

```sql
-- rooms 테이블에 현재 문제 정보 컬럼 추가
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS current_problem JSONB DEFAULT NULL;

-- 문제 생성 시간 추적용 컬럼 추가
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS problem_created_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_rooms_current_problem ON public.rooms(id) WHERE current_problem IS NOT NULL;
```

## 2. 작동 방식

### 문제 생성 및 동기화 흐름

1. **방장이 문제 생성**
   - 게임이 시작되면 방장이 주기적으로 문제를 생성
   - 생성된 문제는 `rooms.current_problem`에 JSON 형태로 저장

2. **실시간 동기화**
   - 모든 플레이어가 `rooms` 테이블의 `UPDATE` 이벤트를 구독
   - 새로운 문제가 생성되면 실시간으로 모든 플레이어에게 전달

3. **문제 제거**
   - 문제가 답변되거나 화면 밖으로 떨어지면 방장이 DB에서 제거
   - 제거되면 모든 플레이어의 화면에서도 사라짐

### 주요 변경 사항

- **새로운 Hook**: `useMultiplayerDroplets`
  - 멀티플레이어 전용 droplets 관리
  - 실시간으로 동기화된 문제를 받아서 표시

- **서비스 함수 추가**:
  - `generateRoomProblem`: 방장이 문제 생성
  - `getRoomProblem`: 현재 문제 가져오기
  - `clearRoomProblem`: 문제 제거

- **실시간 구독 확장**:
  - `useRoomRealtime`에 `currentProblem` 상태 추가
  - 방 상태 변경 시 문제 정보도 함께 업데이트

## 3. 테스트 방법

1. 두 개의 브라우저 창을 열어서 같은 방에 접속
2. 방장이 게임 시작
3. 두 화면에서 같은 문제가 떨어지는지 확인
4. 한 플레이어가 문제를 맞추면 다른 플레이어의 화면에서도 사라지는지 확인

## 4. 주의사항

- 방장만 문제를 생성할 수 있습니다
- 문제가 답변되거나 떨어지면 자동으로 제거됩니다
- 네트워크 지연이 있을 경우 약간의 동기화 지연이 발생할 수 있습니다

