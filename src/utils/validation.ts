// 유효성 검사 유틸리티

/**
 * 닉네임 유효성 검사
 * - 2자 이상 20자 이하
 * - 한글, 영문, 숫자만 허용
 */
export const validateNickname = (nickname: string): { valid: boolean; error?: string } => {
  if (!nickname || nickname.trim().length === 0) {
    return { valid: false, error: '닉네임을 입력해주세요.' };
  }

  if (nickname.length < 2) {
    return { valid: false, error: '닉네임은 2자 이상이어야 합니다.' };
  }

  if (nickname.length > 20) {
    return { valid: false, error: '닉네임은 20자 이하여야 합니다.' };
  }

  // 한글, 영문, 숫자만 허용
  const nicknameRegex = /^[가-힣a-zA-Z0-9]+$/;
  if (!nicknameRegex.test(nickname)) {
    return { valid: false, error: '닉네임은 한글, 영문, 숫자만 사용 가능합니다.' };
  }

  return { valid: true };
};

/**
 * 비밀번호 유효성 검사
 * - 6자 이상
 */
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password || password.length === 0) {
    return { valid: false, error: '비밀번호를 입력해주세요.' };
  }

  if (password.length < 6) {
    return { valid: false, error: '비밀번호는 6자 이상이어야 합니다.' };
  }

  return { valid: true };
};

/**
 * 비밀번호 확인 검사
 */
export const validatePasswordConfirm = (
  password: string,
  passwordConfirm: string
): { valid: boolean; error?: string } => {
  if (password !== passwordConfirm) {
    return { valid: false, error: '비밀번호가 일치하지 않습니다.' };
  }

  return { valid: true };
};

/**
 * 방 코드 유효성 검사
 * - 6자리 영숫자
 */
export const validateRoomCode = (roomCode: string): { valid: boolean; error?: string } => {
  if (!roomCode || roomCode.length === 0) {
    return { valid: false, error: '방 코드를 입력해주세요.' };
  }

  if (roomCode.length !== 6) {
    return { valid: false, error: '방 코드는 6자리여야 합니다.' };
  }

  const roomCodeRegex = /^[A-Z0-9]{6}$/;
  if (!roomCodeRegex.test(roomCode.toUpperCase())) {
    return { valid: false, error: '올바른 방 코드 형식이 아닙니다.' };
  }

  return { valid: true };
};

