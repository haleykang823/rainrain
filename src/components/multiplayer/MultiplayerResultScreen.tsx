import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GameSession, Room } from '../../types';
import { getRoomGameSessions } from '../../services/roomService';

interface MultiplayerResultScreenProps {
  room: Room;
  onBackToMenu: () => void;
}

export const MultiplayerResultScreen: React.FC<MultiplayerResultScreenProps> = ({ room, onBackToMenu }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const lastSessionsRef = useRef<string>(''); // 이전 세션 데이터의 해시를 저장

  useEffect(() => {
    let isInitialLoad = true;
    
    const fetchResults = async () => {
      // 재시도 로직 추가
      let retries = 3;
      let fetchedSessions: GameSession[] | null = null;
      let error: string | null = null;
      
      while (retries > 0 && !fetchedSessions) {
        const result = await getRoomGameSessions(room.id);
        
        if (result.error) {
          console.error('[MultiplayerResultScreen] 게임 세션 조회 실패:', result.error, '남은 재시도:', retries - 1);
          error = result.error;
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 후 재시도
          }
        } else if (result.sessions) {
          fetchedSessions = result.sessions;
          error = null;
          break;
        } else {
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 후 재시도
          }
        }
      }

      if (!error && fetchedSessions) {
        // 세션 데이터의 해시 생성 (변경 여부 확인용)
        const sessionsHash = JSON.stringify(
          fetchedSessions
            .map(s => ({ userId: s.user_id, score: s.score, accuracy: s.accuracy }))
            .sort((a, b) => b.score - a.score)
        );

        // 데이터가 실제로 변경되었을 때만 업데이트
        if (sessionsHash !== lastSessionsRef.current) {
          lastSessionsRef.current = sessionsHash;
          setSessions(fetchedSessions);
          if (isInitialLoad) {
            setLoading(false);
            isInitialLoad = false;
          }
        } else {
          if (isInitialLoad) {
            setLoading(false);
            isInitialLoad = false;
          }
        }
      } else {
        console.error('[MultiplayerResultScreen] 게임 세션 조회 최종 실패:', error || '알 수 없는 오류');
        if (isInitialLoad) {
          setLoading(false);
          isInitialLoad = false;
        }
      }
    };

    // 초기 로드 (게임 종료 후 점수 저장 시간 확보를 위해 약간의 지연)
    setLoading(true);
    setTimeout(() => {
      fetchResults();
    }, 500); // 0.5초 지연 후 초기 로드
    
    // 0.5초마다 세션 새로고침 (더 빠른 반영)
    const refreshInterval = setInterval(() => {
      fetchResults();
    }, 500);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [room.id]);

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

  // 점수 순으로 정렬 (점수가 같으면 정확도 순) - useMemo로 메모이제이션
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.accuracy - a.accuracy;
    });
  }, [sessions]);
  
  const mySession = useMemo(() => {
    return sortedSessions.find((s) => s.user_id === user?.id);
  }, [sortedSessions, user?.id]);
  
  const myRank = useMemo(() => {
    return mySession ? sortedSessions.findIndex((s) => s.user_id === mySession.user_id) + 1 : null;
  }, [sortedSessions, mySession]);

  return (
    <div className="screen">
      <div className="game-title">
        <h1>🏆 게임 결과</h1>
      </div>

      <div className="result-container">
        {/* 내 결과 */}
        {mySession && myRank && (
          <div className="my-result-box">
            <h2>내 결과</h2>
            <div className="result-stats">
              <div className="stat-item">
                <span className="label">순위:</span>
                <span className="value rank-value">{getMedalEmoji(myRank)}</span>
              </div>
              <div className="stat-item">
                <span className="label">점수:</span>
                <span className="value">{mySession.score}점</span>
              </div>
              <div className="stat-item">
                <span className="label">정확도:</span>
                <span className="value">{Math.round(mySession.accuracy)}%</span>
              </div>
              <div className="stat-item">
                <span className="label">정답:</span>
                <span className="value">
                  {mySession.correct_count}/{mySession.total_count}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 전체 결과 */}
        <div className="all-results-box">
          <h3>👥 전체 순위</h3>

          {loading ? (
            <div className="loading-message">
              <p>결과를 불러오는 중...</p>
            </div>
          ) : (
            <div className="results-table">
              <div className="table-header">
                <span className="col-rank">순위</span>
                <span className="col-nickname">닉네임</span>
                <span className="col-score">점수</span>
                <span className="col-accuracy">정확도</span>
              </div>

              <div className="table-body">
                {sortedSessions.map((session, index) => (
                  <div
                    key={session.id}
                    className={`table-row ${session.user_id === user?.id ? 'my-entry' : ''}`}
                  >
                    <span className="col-rank">{getMedalEmoji(index + 1)}</span>
                    <span className="col-nickname">
                      {session.user?.nickname || '익명'}
                      {session.user_id === user?.id && ' (나)'}
                    </span>
                    <span className="col-score">{session.score}점</span>
                    <span className="col-accuracy">{Math.round(session.accuracy)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="result-actions">
          <button className="btn-primary" onClick={onBackToMenu}>
            메인 메뉴로
          </button>
        </div>
      </div>
    </div>
  );
};

