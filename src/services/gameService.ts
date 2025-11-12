import { supabase } from '../utils/supabase';
import { GameSession, User } from '../types';
import { calculateAccuracy } from '../utils/gameLogic';

/**
 * 게임 결과 저장 서비스 - 간단하고 확실하게
 */
export const gameService = {
  /**
   * 게임 결과 저장 및 best_score 업데이트
   */
  async saveGameResult(
    userId: string,
    score: number,
    correctCount: number,
    totalCount: number,
    difficulty: string,
    roomId: string | null = null
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const accuracy = calculateAccuracy(correctCount, totalCount);

      // 1. game_sessions 테이블에 저장
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .insert([{
          user_id: userId,
          room_id: roomId,
          score,
          correct_count: correctCount,
          total_count: totalCount,
          accuracy,
          difficulty,
        }])
        .select()
        .single();

      if (sessionError) {
        console.error('[gameService] game_sessions 저장 실패:', sessionError);
        return { success: false, error: sessionError.message };
      }

      // 2. users 테이블의 best_score 업데이트
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('best_score')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('[gameService] users 조회 실패:', fetchError);
        // 조회 실패해도 game_sessions는 저장되었으므로 성공으로 처리
        return { success: true, error: null };
      }

      const currentBestScore = currentUser?.best_score || 0;

      // 새 점수가 더 높으면 업데이트
      if (score > currentBestScore) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ best_score: score })
          .eq('id', userId);

        if (updateError) {
          console.error('[gameService] best_score 업데이트 실패:', updateError);
          // 업데이트 실패해도 game_sessions는 저장되었으므로 성공으로 처리
          return { success: true, error: null };
        }
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('[gameService] 전체 에러:', error);
      return { success: false, error: error.message || '게임 결과 저장 중 오류가 발생했습니다.' };
    }
  },
};

