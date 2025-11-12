import { supabase } from '../utils/supabase';
import { LeaderboardEntry } from '../types';

/**
 * 리더보드 서비스
 * 전체, 주간, 월간 랭킹 데이터를 제공
 */

/**
 * 전체 리더보드 가져오기 (best_score 기준)
 */
export const getOverallLeaderboard = async (
  limit: number = 10
): Promise<{ data: LeaderboardEntry[] | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, nickname, best_score')
      .order('best_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Get overall leaderboard error:', error);
      return { data: null, error: error.message };
    }

    const leaderboardData: LeaderboardEntry[] = (data || []).map((user, index) => ({
      user_id: user.id,
      user: {
        id: user.id,
        nickname: user.nickname,
        best_score: user.best_score,
        created_at: '',
      },
      total_score: 0,
      weekly_score: 0,
      monthly_score: 0,
      best_score: user.best_score,
      rank: index + 1,
    }));

    return { data: leaderboardData, error: null };
  } catch (err) {
    console.error('Get overall leaderboard error:', err);
    return { data: null, error: '리더보드를 불러오는데 실패했습니다.' };
  }
};

/**
 * 주간 리더보드 가져오기
 */
export const getWeeklyLeaderboard = async (
  limit: number = 10
): Promise<{ data: LeaderboardEntry[] | null; error: string | null }> => {
  try {
    // 1주일 전 날짜 계산
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('game_sessions')
      .select('user_id, score, users!inner(nickname)')
      .gte('played_at', oneWeekAgo.toISOString())
      .order('score', { ascending: false });

    if (error) {
      console.error('Get weekly leaderboard error:', error);
      return { data: null, error: error.message };
    }

    // 사용자별 최고 점수 집계
    const userScores = new Map<string, { nickname: string; score: number }>();

    (data || []).forEach((session: any) => {
      const userId = session.user_id;
      const nickname = session.users.nickname;
      const score = session.score;

      if (!userScores.has(userId) || (userScores.get(userId)?.score || 0) < score) {
        userScores.set(userId, { nickname, score });
      }
    });

    // 점수 기준으로 정렬
    const sortedUsers = Array.from(userScores.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit);

    const leaderboardData: LeaderboardEntry[] = sortedUsers.map(([userId, data], index) => ({
      user_id: userId,
      user: {
        id: userId,
        nickname: data.nickname,
        best_score: data.score,
        created_at: '',
      },
      total_score: 0,
      weekly_score: data.score,
      monthly_score: 0,
      best_score: data.score,
      rank: index + 1,
    }));

    return { data: leaderboardData, error: null };
  } catch (err) {
    console.error('Get weekly leaderboard error:', err);
    return { data: null, error: '주간 리더보드를 불러오는데 실패했습니다.' };
  }
};

/**
 * 월간 리더보드 가져오기
 */
export const getMonthlyLeaderboard = async (
  limit: number = 10
): Promise<{ data: LeaderboardEntry[] | null; error: string | null }> => {
  try {
    // 1개월 전 날짜 계산
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { data, error } = await supabase
      .from('game_sessions')
      .select('user_id, score, users!inner(nickname)')
      .gte('played_at', oneMonthAgo.toISOString())
      .order('score', { ascending: false });

    if (error) {
      console.error('Get monthly leaderboard error:', error);
      return { data: null, error: error.message };
    }

    // 사용자별 최고 점수 집계
    const userScores = new Map<string, { nickname: string; score: number }>();

    (data || []).forEach((session: any) => {
      const userId = session.user_id;
      const nickname = session.users.nickname;
      const score = session.score;

      if (!userScores.has(userId) || (userScores.get(userId)?.score || 0) < score) {
        userScores.set(userId, { nickname, score });
      }
    });

    // 점수 기준으로 정렬
    const sortedUsers = Array.from(userScores.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit);

    const leaderboardData: LeaderboardEntry[] = sortedUsers.map(([userId, data], index) => ({
      user_id: userId,
      user: {
        id: userId,
        nickname: data.nickname,
        best_score: data.score,
        created_at: '',
      },
      total_score: 0,
      weekly_score: 0,
      monthly_score: data.score,
      best_score: data.score,
      rank: index + 1,
    }));

    return { data: leaderboardData, error: null };
  } catch (err) {
    console.error('Get monthly leaderboard error:', err);
    return { data: null, error: '월간 리더보드를 불러오는데 실패했습니다.' };
  }
};

/**
 * 내 랭킹 가져오기
 */
export const getMyRank = async (
  userId: string,
  period: 'overall' | 'weekly' | 'monthly' = 'overall'
): Promise<{ rank: number | null; error: string | null }> => {
  try {
    if (period === 'overall') {
      // 전체 랭킹
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('best_score')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        return { rank: null, error: '사용자 정보를 찾을 수 없습니다.' };
      }

      const { count, error: countError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gt('best_score', userData.best_score);

      if (countError) {
        return { rank: null, error: countError.message };
      }

      return { rank: (count || 0) + 1, error: null };
    } else {
      // 주간/월간 랭킹은 구현 복잡도로 인해 생략 (필요 시 추가)
      return { rank: null, error: null };
    }
  } catch (err) {
    console.error('Get my rank error:', err);
    return { rank: null, error: '랭킹 조회에 실패했습니다.' };
  }
};

