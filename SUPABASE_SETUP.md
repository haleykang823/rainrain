# Supabase 설정 가이드

이 가이드는 구구단 산성비 게임의 백엔드인 Supabase를 설정하는 방법을 설명합니다.

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com/)에 접속하여 계정 생성 (무료)
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Project Name**: `multiplication-rain` (또는 원하는 이름)
   - **Database Password**: 안전한 비밀번호 생성 (복사해두기!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (가장 빠름)
4. "Create new project" 클릭
5. 프로젝트 생성 완료 대기 (약 2분 소요)

## 2. 환경 변수 설정

1. Supabase 대시보드에서 **Settings** → **API** 이동
2. 다음 정보 복사:
   - **Project URL** (예: `https://abcdefgh.supabase.co`)
   - **anon public** key

3. 프로젝트 루트에 `.env` 파일 생성:

```bash
# .env 파일
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ **중요**: `.env` 파일은 Git에 커밋하지 마세요! (이미 `.gitignore`에 포함됨)

## 3. 데이터베이스 스키마 생성

⚠️ **중요**: 회원가입을 먼저 한 후 스키마를 생성해야 합니다!

### 방법 1: SQL Editor 사용 (권장)

1. **먼저 웹사이트에서 회원가입을 1번 해주세요!**
   - 개발 서버 접속 → 회원가입 (예: `admin` / `password`)
   - 이렇게 하면 `auth.users` 테이블에 사용자가 생성됩니다

2. Supabase 대시보드에서 **SQL Editor** 메뉴 선택
3. "New query" 클릭
4. `supabase-schema.sql` 파일의 내용을 **전체 복사**하여 붙여넣기
5. 우측 하단의 **"Run"** 버튼 클릭
6. 성공 메시지 확인

### 방법 2: 테이블이 이미 있는 경우

기존 테이블을 삭제하고 다시 생성:

1. **Table Editor** → 각 테이블(`users`, `rooms` 등) 우클릭 → **Delete table**
2. 위의 **방법 1** 반복

## 4. Realtime 활성화

1. Supabase 대시보드에서 **Database** → **Replication** 이동
2. 다음 테이블의 **Realtime** 토글을 **ON**으로 변경:
   - `rooms`
   - `room_participants`
   - `game_sessions`

## 5. Auth 설정 (**필수**)

### 이메일 확인 비활성화 (닉네임 기반 인증에 필요)
1. **Authentication** → **Providers** 이동
2. **Email** 항목 클릭
3. **"Confirm email"** 토글을 **OFF**로 변경
4. **Save** 버튼 클릭

⚠️ **중요**: 이 설정을 하지 않으면 회원가입 후 로그인이 불가능합니다!

## 6. 설정 확인

### 테이블 확인
**Table Editor** 메뉴에서 다음 테이블이 생성되었는지 확인:
- ✅ users
- ✅ rooms
- ✅ room_participants
- ✅ game_sessions
- ✅ leaderboard

### RLS 정책 확인
각 테이블의 **Policies** 탭에서 정책이 생성되었는지 확인

## 7. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속하여 확인

## 문제 해결

### "Supabase URL과 Anon Key가 설정되지 않았습니다"
→ `.env` 파일이 올바르게 생성되었는지 확인
→ 개발 서버를 재시작하세요

### "relation does not exist" 에러
→ SQL 스키마가 제대로 실행되었는지 확인
→ Supabase 대시보드의 Table Editor에서 테이블 확인

### Realtime이 작동하지 않음
→ Database → Replication에서 해당 테이블의 Realtime이 활성화되었는지 확인

## 다음 단계

✅ Supabase 설정 완료!  
→ 이제 프로젝트를 실행하고 개발을 시작할 수 있습니다.

회원가입/로그인 기능이 정상적으로 작동하는지 테스트해보세요.

