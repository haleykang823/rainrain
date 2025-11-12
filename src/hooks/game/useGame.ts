import { useState, useRef, useCallback } from 'react';
import { GameStats, ItemType } from '../../types';
import { GAME_CONFIG } from '../../constants';

interface UseGameOptions {
  onGameOver: (stats: GameStats) => void;
}

export function useGame({ onGameOver }: UseGameOptions) {
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    lives: GAME_CONFIG.INITIAL_LIVES,
    level: 1,
    correctAnswers: 0,
    totalAttempts: 0,
    accuracy: 100,
    statusMessage: '',
    isSlowed: false,
  });

  const [isGameActive, setIsGameActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const slowTimerRef = useRef<number | null>(null);
  const gameOverCalledRef = useRef(false);

  const startGame = useCallback(() => {
    setStats({
      score: 0,
      lives: GAME_CONFIG.INITIAL_LIVES,
      level: 1,
      correctAnswers: 0,
      totalAttempts: 0,
      accuracy: 100,
      statusMessage: '게임 시작!',
      isSlowed: false,
    });
    setIsGameActive(true);
    setIsPaused(false);
    gameOverCalledRef.current = false;

    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }

    // 시작 메시지 제거
    setTimeout(() => {
      setStats(prev => ({ ...prev, statusMessage: '' }));
    }, 2000);
  }, []);

  const pauseGame = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
  }, []);

  const gameOver = useCallback(() => {
    if (gameOverCalledRef.current) return;
    
    gameOverCalledRef.current = true;
    setIsGameActive(false);
    setIsPaused(false);

    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }

    onGameOver(stats);
  }, [stats, onGameOver]);

  const handleCorrectAnswer = useCallback((itemType: ItemType) => {
    setStats(prev => {
      const newCorrectAnswers = prev.correctAnswers + 1;
      const newTotalAttempts = prev.totalAttempts + 1;
      const newAccuracy = Math.round((newCorrectAnswers / newTotalAttempts) * 100);

      let scoreToAdd = GAME_CONFIG.BASE_SCORE;
      let statusMessage = '정답! 😊';
      let newIsSlowed = prev.isSlowed;

      // 아이템 효과
      if (itemType === 'BONUS') {
        scoreToAdd += 10;
        statusMessage = '보너스 +10점! 💰';
      } else if (itemType === 'SLOW') {
        newIsSlowed = true;
        statusMessage = '슬로우 발동! ❄️';
        
        if (slowTimerRef.current) {
          clearTimeout(slowTimerRef.current);
        }
        
        slowTimerRef.current = window.setTimeout(() => {
          setStats(current => ({ ...current, isSlowed: false, statusMessage: '' }));
          slowTimerRef.current = null;
        }, 20000);
      } else if (itemType === 'CLEAR') {
        statusMessage = '화면 클리어! 🎉';
      }

      const newScore = prev.score + scoreToAdd;

      // 레벨업 확인 (100점마다)
      let newLevel = prev.level;
      let newLives = prev.lives;

      if (newScore >= newLevel * GAME_CONFIG.LEVEL_UP_SCORE) {
        newLevel = prev.level + 1;
        newLives = Math.min(prev.lives + GAME_CONFIG.LEVEL_UP_LIFE_BONUS, GAME_CONFIG.MAX_LIVES);
        statusMessage = `레벨 업! ⭐ Level ${newLevel}`;
      }

      return {
        ...prev,
        score: newScore,
        correctAnswers: newCorrectAnswers,
        totalAttempts: newTotalAttempts,
        accuracy: newAccuracy,
        level: newLevel,
        lives: newLives,
        statusMessage,
        isSlowed: newIsSlowed,
      };
    });

    // 상태 메시지 제거
    setTimeout(() => {
      setStats(prev => ({ ...prev, statusMessage: '' }));
    }, 3000);
  }, []);

  const handleWrongAnswer = useCallback(() => {
    if (gameOverCalledRef.current) return;

    setStats(prev => {
      const newLives = prev.lives - 1;
      const newTotalAttempts = prev.totalAttempts + 1;
      const newAccuracy = Math.round((prev.correctAnswers / newTotalAttempts) * 100);

      if (newLives <= 0) {
        setTimeout(() => {
          if (!gameOverCalledRef.current) {
            gameOver();
          }
        }, 100);
        
        return {
          ...prev,
          lives: 0,
          totalAttempts: newTotalAttempts,
          accuracy: newAccuracy,
          statusMessage: '게임 오버 💔',
        };
      }

      return {
        ...prev,
        lives: newLives,
        totalAttempts: newTotalAttempts,
        accuracy: newAccuracy,
        statusMessage: '오답! 💔',
      };
    });

    setTimeout(() => {
      setStats(prev => ({ ...prev, statusMessage: '' }));
    }, 2000);
  }, [gameOver]);

  return {
    stats,
    isGameActive,
    isPaused,
    startGame,
    pauseGame,
    resumeGame,
    handleCorrectAnswer,
    handleWrongAnswer,
  };
}
