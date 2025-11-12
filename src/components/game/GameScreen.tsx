import React, { useEffect, useRef } from 'react';
import { useGame } from '../../hooks/game/useGame';
import { useDroplets } from '../../hooks/game/useDroplets';
import { GameCanvas } from './GameCanvas';
import { GameStats } from '../../types';

interface GameScreenProps {
  difficulty: string;
  customTables?: number[];
  onGameOver: (stats: GameStats) => void;
  onPause: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  difficulty,
  customTables,
  onGameOver,
  onPause,
}) => {
  const { stats, isGameActive, isPaused, startGame, pauseGame, resumeGame, handleCorrectAnswer, handleWrongAnswer } =
    useGame({ onGameOver });

  const { droplets, checkAnswer, removeLowestDroplet } = useDroplets({
    difficulty,
    customTables,
    isGameActive,
    isPaused,
    onDropletMissed: handleWrongAnswer,
    level: stats.level,
    isSlowed: stats.isSlowed,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // 게임 시작
  useEffect(() => {
    startGame();
    inputRef.current?.focus();
  }, []);

  // CLEAR 아이템 효과 처리
  useEffect(() => {
    if (stats.statusMessage === '화면 클리어! 🎉') {
      removeLowestDroplet();
    }
  }, [stats.statusMessage]);

  // 답 제출 처리
  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const input = inputRef.current;
    if (!input || !input.value) return;

    const answer = parseInt(input.value, 10);
    if (isNaN(answer)) {
      input.value = '';
      return;
    }

    const isCorrect = checkAnswer(answer, handleCorrectAnswer);
    
    if (!isCorrect) {
      handleWrongAnswer();
    }

    input.value = '';
    input.focus();
  };

  // 일시정지 토글
  const handlePauseToggle = () => {
    if (isPaused) {
      resumeGame();
    } else {
      pauseGame();
    }
  };

  // 게임 종료
  const handleQuit = () => {
    onPause();
  };

  // 생명 표시 (하트 이모지)
  const renderLives = () => {
    const hearts = [];
    for (let i = 0; i < 5; i++) {
      hearts.push(
        <span key={i} className="heart">
          {i < stats.lives ? '❤️' : '🖤'}
        </span>
      );
    }
    return hearts;
  };

  return (
    <div className="screen game-screen">
      <div className="game-header">
        <div className="score">점수: {stats.score}</div>
        <div className="level">레벨: {stats.level}</div>
        <div className="lives">{renderLives()}</div>
        <div className="accuracy">정확도: {stats.accuracy}%</div>
      </div>

      {stats.statusMessage && (
        <div className="status">{stats.statusMessage}</div>
      )}

      {stats.isSlowed && (
        <div className="slow-indicator">❄️ 슬로우 효과 발동 중</div>
      )}

      <div className="canvas-container">
        <GameCanvas droplets={droplets} />
        
        {isPaused && (
          <div className="pause-overlay">
            <h2>일시정지</h2>
            <button className="btn-primary" onClick={resumeGame}>
              계속하기
            </button>
            <button className="btn-secondary" onClick={handleQuit}>
              나가기
            </button>
          </div>
        )}
      </div>

      <div className="game-controls">
        <form onSubmit={handleAnswerSubmit} className="input-area">
          <input
            ref={inputRef}
            type="number"
            className="answer-input"
            placeholder="정답 입력"
            autoFocus
            disabled={isPaused}
          />
          <button type="submit" className="answer-btn" disabled={isPaused}>
            제출
          </button>
        </form>

        <div className="control-buttons">
          <button className="btn-secondary" onClick={handlePauseToggle}>
            {isPaused ? '계속' : '일시정지'}
          </button>
          <button className="btn-secondary" onClick={handleQuit}>
            나가기
          </button>
        </div>
      </div>
    </div>
  );
};
