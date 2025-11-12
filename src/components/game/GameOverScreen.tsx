import React from 'react';
import { GameStats } from '../../types';

interface GameOverScreenProps {
  stats: GameStats;
  onRestart: () => void;
  onMenu: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  stats,
  onRestart,
  onMenu,
}) => {
  const getGradeMessage = (accuracy: number): string => {
    if (accuracy >= 90) return '완벽해요! 🎉';
    if (accuracy >= 80) return '대단해요! 👏';
    if (accuracy >= 70) return '잘했어요! 😊';
    if (accuracy >= 60) return '좋아요! 🙂';
    return '힘내요! 💪';
  };

  const getStarCount = (accuracy: number): number => {
    if (accuracy >= 90) return 5;
    if (accuracy >= 80) return 4;
    if (accuracy >= 70) return 3;
    if (accuracy >= 60) return 2;
    return 1;
  };

  const starCount = getStarCount(stats.accuracy);

  return (
    <div className="screen gameover-screen">
      <div className="gameover-content">
        <h2 className="gameover-title">게임 끝!</h2>
        
        <div className="result-card">
          <div className="grade">
            {Array.from({ length: starCount }).map((_, i) => (
              <span key={i} className="star">⭐</span>
            ))}
          </div>
          
          <p className="grade-message">{getGradeMessage(stats.accuracy)}</p>

          <div className="result-stats">
            <div className="stat-item">
              <span className="stat-label">최종 점수</span>
              <span className="stat-value large">{stats.score}</span>
            </div>

            <div className="stat-item">
              <span className="stat-label">도달 레벨</span>
              <span className="stat-value">Level {stats.level}</span>
            </div>

            <div className="stat-row">
              <div className="stat-item">
                <span className="stat-label">정답</span>
                <span className="stat-value">{stats.correctAnswers}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">총 문제</span>
                <span className="stat-value">{stats.totalAttempts}</span>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-label">정확도</span>
              <span className="stat-value">{stats.accuracy}%</span>
            </div>
          </div>
        </div>

        <div className="button-group">
          <button className="btn btn-primary" onClick={onRestart}>
            다시하기
          </button>
          <button className="btn btn-secondary" onClick={onMenu}>
            메인으로
          </button>
        </div>
      </div>
    </div>
  );
};

