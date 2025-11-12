import { useState, useCallback } from 'react';
import { Room } from '../../types';
import {
  createRoom as createRoomService,
  findRoomByCode,
  joinRoom as joinRoomService,
  leaveRoom as leaveRoomService,
  updateRoomStatus,
} from '../../services/roomService';

interface UseRoomReturn {
  currentRoom: Room | null;
  loading: boolean;
  error: string | null;
  createRoom: (hostId: string, difficulty: string, customTables?: number[]) => Promise<Room | null>;
  joinRoomByCode: (roomCode: string, userId: string) => Promise<Room | null>;
  leaveRoom: (roomId: string, userId: string) => Promise<void>;
  startGame: (roomId: string) => Promise<void>;
  finishGame: (roomId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * 방 관리 Hook
 * 방 생성, 참가, 나가기, 상태 업데이트
 */
export const useRoom = (): UseRoomReturn => {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 방 생성
   */
  const createRoom = useCallback(
    async (hostId: string, difficulty: string, customTables?: number[]): Promise<Room | null> => {
      setLoading(true);
      setError(null);

      try {
        const { room, error: createError } = await createRoomService(hostId, difficulty, customTables);

        if (createError || !room) {
          setError(createError || '방 생성에 실패했습니다.');
          setLoading(false);
          return null;
        }

        setCurrentRoom(room);
        setLoading(false);
        return room;
      } catch (err) {
        const errorMessage = '방 생성 중 오류가 발생했습니다.';
        setError(errorMessage);
        setLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * 방 코드로 참가
   */
  const joinRoomByCode = useCallback(async (roomCode: string, userId: string): Promise<Room | null> => {
    setLoading(true);
    setError(null);

    try {
      // 방 찾기
      const { room, error: findError } = await findRoomByCode(roomCode);

      if (findError || !room) {
        setError(findError || '방을 찾을 수 없습니다.');
        setLoading(false);
        return null;
      }

      // 방 참가
      const { success, error: joinError } = await joinRoomService(room.id, userId);

      if (!success || joinError) {
        setError(joinError || '방 참가에 실패했습니다.');
        setLoading(false);
        return null;
      }

      setCurrentRoom(room);
      setLoading(false);
      return room;
    } catch (err) {
      const errorMessage = '방 참가 중 오류가 발생했습니다.';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  }, []);

  /**
   * 방 나가기
   */
  const leaveRoom = useCallback(async (roomId: string, userId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const { success, error: leaveError } = await leaveRoomService(roomId, userId);

      if (!success || leaveError) {
        setError(leaveError || '방 나가기에 실패했습니다.');
        setLoading(false);
        return;
      }

      setCurrentRoom(null);
      setLoading(false);
    } catch (err) {
      const errorMessage = '방 나가기 중 오류가 발생했습니다.';
      setError(errorMessage);
      setLoading(false);
    }
  }, []);

  /**
   * 게임 시작
   */
  const startGame = useCallback(async (roomId: string): Promise<void> => {
    console.log('[useRoom] startGame 시작:', roomId);
    setLoading(true);
    setError(null);

    try {
      console.log('[useRoom] updateRoomStatus 호출');
      const { success, error: updateError } = await updateRoomStatus(roomId, 'playing');

      console.log('[useRoom] updateRoomStatus 결과:', { success, error: updateError });

      if (!success || updateError) {
        console.error('[useRoom] 게임 시작 실패:', updateError);
        setError(updateError || '게임 시작에 실패했습니다.');
        setLoading(false);
        return;
      }

      console.log('[useRoom] 게임 시작 성공, 방 상태 업데이트');
      if (currentRoom) {
        setCurrentRoom({ ...currentRoom, status: 'playing' });
      }

      setLoading(false);
      console.log('[useRoom] startGame 완료');
    } catch (err: any) {
      console.error('[useRoom] 게임 시작 예외:', err);
      const errorMessage = err?.message || '게임 시작 중 오류가 발생했습니다.';
      setError(errorMessage);
      setLoading(false);
    }
  }, [currentRoom]);

  /**
   * 게임 종료
   */
  const finishGame = useCallback(async (roomId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const { success, error: updateError } = await updateRoomStatus(roomId, 'finished');

      if (!success || updateError) {
        setError(updateError || '게임 종료 처리에 실패했습니다.');
        setLoading(false);
        return;
      }

      if (currentRoom) {
        setCurrentRoom({ ...currentRoom, status: 'finished' });
      }

      setLoading(false);
    } catch (err) {
      const errorMessage = '게임 종료 중 오류가 발생했습니다.';
      setError(errorMessage);
      setLoading(false);
    }
  }, [currentRoom]);

  /**
   * 에러 초기화
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    currentRoom,
    loading,
    error,
    createRoom,
    joinRoomByCode,
    leaveRoom,
    startGame,
    finishGame,
    clearError,
  };
};

