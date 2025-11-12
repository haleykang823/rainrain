import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface MainScreenProps {
  onStartSinglePlayer: () => void;
  onStartMultiplayer: () => void;
  onShowLeaderboard: () => void;
  onShowLogin: () => void;
  onShowSignUp: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({
  onStartSinglePlayer,
  onStartMultiplayer,
  onShowLeaderboard,
  onShowLogin,
  onShowSignUp,
}) => {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    const confirmLogout = window.confirm('로그아웃 하시겠습니까?');
    if (confirmLogout) {
      await signOut();
    }
  };

  return (
    <div className="screen main-screen">
      <div className="main-content">
        <h1 className="game-title">
          <span className="title-icon">🌧️</span>
          구구단 산성비
          <span className="title-icon">⚡</span>
        </h1>
        <p className="game-subtitle">떨어지는 문제를 맞춰보세요!</p>

        {/* 사용자 정보 */}
        <div className="user-info-box">
          {user ? (
            <>
              <span className="user-greeting">
                안녕하세요, <strong>{user.nickname}</strong>님! 👋
              </span>
              <span className="user-best-score">최고 점수: {user.best_score}점</span>
              <button className="btn-text-small" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <div className="auth-buttons">
              <button className="btn-text" onClick={onShowLogin}>
                로그인
              </button>
              <span className="separator">|</span>
              <button className="btn-text" onClick={onShowSignUp}>
                회원가입
              </button>
            </div>
          )}
        </div>

        {/* 메인 버튼 */}
        <div className="main-buttons">
          <button 
            className="btn-primary btn-large" 
            onClick={user ? onStartSinglePlayer : onShowLogin}
          >
            🎮 싱글 플레이 {!user && '(로그인 필요)'}
          </button>
          <button
            className="btn-primary btn-large"
            onClick={user ? onStartMultiplayer : onShowLogin}
          >
            👥 멀티플레이어 {!user && '(로그인 필요)'}
          </button>
          <button className="btn-secondary" onClick={onShowLeaderboard}>
            🏆 리더보드
          </button>
        </div>

        {/* 게임 설명 */}
        <div className="game-instructions">
          <h3>📌 게임 방법</h3>
          <ul>
            <li>🎯 떨어지는 곱셈 문제의 정답을 입력하세요</li>
            <li>❤️ 생명은 5개! 오답이나 놓치면 감소해요</li>
            <li>⭐ 100점마다 레벨업! 생명이 1개 회복됩니다</li>
            <li>🎁 아이템을 획득하여 유리하게 플레이하세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

