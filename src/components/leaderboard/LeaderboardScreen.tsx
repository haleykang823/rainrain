import React from 'react';
import { useLeaderboard } from '../../hooks/leaderboard/useLeaderboard';
import { useAuth } from '../../contexts/AuthContext';

interface LeaderboardScreenProps {
  onBack: () => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { data, loading, error, myRank, period, setPeriod, refresh } = useLeaderboard(user?.id);

  const getPeriodLabel = () => {
    switch (period) {
      case 'overall':
        return '전체 랭킹';
      case 'weekly':
        return '주간 랭킹';
      case 'monthly':
        return '월간 랭킹';
      default:
        return '랭킹';
    }
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${rank}위`;
    }
  };

  return (
    <div className="screen">
      <div className="game-title">
        <h1>🏆 리더보드</h1>
      </div>

      <div className="leaderboard-container">
        {/* 기간 선택 탭 */}
        <div className="leaderboard-tabs">
          <button
            className={`tab-button ${period === 'overall' ? 'active' : ''}`}
            onClick={() => setPeriod('overall')}
          >
            전체
          </button>
          <button
            className={`tab-button ${period === 'weekly' ? 'active' : ''}`}
            onClick={() => setPeriod('weekly')}
          >
            주간
          </button>
          <button
            className={`tab-button ${period === 'monthly' ? 'active' : ''}`}
            onClick={() => setPeriod('monthly')}
          >
            월간
          </button>
        </div>

        {/* 내 랭킹 표시 */}
        {user && myRank && (
          <div className="my-rank">
            <span className="rank-label">내 순위:</span>
            <span className="rank-value">{getMedalEmoji(myRank)}</span>
            <span className="user-info">
              {user.nickname} ({user.best_score}점)
            </span>
          </div>
        )}

        {/* 로딩 상태 */}
        {loading && (
          <div className="loading-message">
            <p>로딩 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button className="btn-secondary" onClick={refresh}>
              다시 시도
            </button>
          </div>
        )}

        {/* 리더보드 테이블 */}
        {!loading && !error && (
          <div className="leaderboard-table">
            <div className="table-header">
              <span className="col-rank">순위</span>
              <span className="col-nickname">닉네임</span>
              <span className="col-score">점수</span>
            </div>

            <div className="table-body">
              {data.length === 0 ? (
                <div className="empty-message">
                  <p>아직 기록이 없습니다.</p>
                  <p>게임을 플레이하고 1등을 차지해보세요! 🎮</p>
                </div>
              ) : (
                data.map((entry) => (
                  <div
                    key={entry.user_id}
                    className={`table-row ${entry.user_id === user?.id ? 'my-entry' : ''}`}
                  >
                    <span className="col-rank">{getMedalEmoji(entry.rank || 0)}</span>
                    <span className="col-nickname">{entry.user?.nickname || '익명'}</span>
                    <span className="col-score">
                      {period === 'weekly'
                        ? entry.weekly_score
                        : period === 'monthly'
                        ? entry.monthly_score
                        : entry.best_score}
                      점
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="leaderboard-actions">
          <button className="btn-secondary" onClick={refresh} disabled={loading}>
            새로고침
          </button>
          <button className="btn-primary" onClick={onBack}>
            돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};

