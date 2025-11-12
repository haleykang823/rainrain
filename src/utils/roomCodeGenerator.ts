/**
 * 6자리 영숫자 방 코드 생성
 * 예: ABC123, XYZ789
 */
export const generateRoomCode = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  
  return code;
};

/**
 * 방 코드 중복 체크 (Supabase에서 확인)
 */
export const isRoomCodeUnique = async (
  roomCode: string,
  checkFunction: (code: string) => Promise<boolean>
): Promise<boolean> => {
  return await checkFunction(roomCode);
};

/**
 * 중복되지 않는 방 코드 생성 (최대 10회 시도)
 */
export const generateUniqueRoomCode = async (
  checkFunction: (code: string) => Promise<boolean>
): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateRoomCode();
    const isUnique = await checkFunction(code);
    
    if (isUnique) {
      return code;
    }
    
    attempts++;
  }

  throw new Error('방 코드 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
};

