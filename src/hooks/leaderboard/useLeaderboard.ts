import { useState, useEffect, useCallback } from 'react';
import { LeaderboardEntry } from '../../types';
import {
  getOverallLeaderboard,
  getWeeklyLeaderboard,
  getMonthlyLeaderboard,
  getMyRank,
} from '../../services/leaderboardService';

type LeaderboardPeriod = 'overall' | 'weekly' | 'monthly';

interface UseLeaderboardReturn {
  data: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  myRank: number | null;
  period: LeaderboardPeriod;
  setPeriod: (period: LeaderboardPeriod) => void;
  refresh: () => Promise<void>;
}

/**
 * 리더보드 Hook
 * 전체, 주간, 월간 리더보드 데이터 관리
 */
export const useLeaderboard = (userId?: string, initialPeriod: LeaderboardPeriod = 'overall'): UseLeaderboardReturn => {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);

  /**
   * 리더보드 데이터 가져오기
   */
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result;
      
      switch (period) {
        case 'overall':
          result = await getOverallLeaderboard(10);
          break;
        case 'weekly':
          result = await getWeeklyLeaderboard(10);
          break;
        case 'monthly':
          result = await getMonthlyLeaderboard(10);
          break;
        default:
          result = await getOverallLeaderboard(10);
      }

      if (result.error) {
        setError(result.error);
        setData([]);
      } else {
        setData(result.data || []);
      }

      // 내 랭킹 가져오기
      if (userId) {
        const rankResult = await getMyRank(userId, period);
        if (!rankResult.error && rankResult.rank) {
          setMyRank(rankResult.rank);
        } else {
          setMyRank(null);
        }
      }
    } catch (err) {
      console.error('Fetch leaderboard error:', err);
      setError('리더보드를 불러오는데 실패했습니다.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [period, userId]);

  /**
   * 데이터 새로고침
   */
  const refresh = useCallback(async () => {
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  // period 변경 시 데이터 다시 가져오기
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    data,
    loading,
    error,
    myRank,
    period,
    setPeriod,
    refresh,
  };
};

