import React, { useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../hooks/game/useGame';
import { useMultiplayerDroplets } from '../../hooks/multiplayer/useMultiplayerDroplets';
import { useRoomRealtime } from '../../hooks/multiplayer/useRoomRealtime';
import { GameCanvas } from '../game/GameCanvas';
import { GameStats, Room } from '../../types';
import { saveGameSession } from '../../services/roomService';
import { supabase } from '../../utils/supabase';

interface MultiplayerGameScreenProps {
  room: Room;
  onGameOver: () => void;
}

export const MultiplayerGameScreen: React.FC<MultiplayerGameScreenProps> = ({ room, onGameOver }) => {
  const { user } = useAuth();
  const { stats, isGameActive, isPaused, startGame, pauseGame, resumeGame, handleCorrectAnswer, handleWrongAnswer } =
    useGame({ onGameOver: handleGameEnd });

  const { participants, gameSessions, roomStatus, currentProblem } = useRoomRealtime(room.id);
  const isHost = user?.id === room.host_id;

  const { droplets, checkAnswer, removeLowestDroplet } = useMultiplayerDroplets({
    roomId: room.id,
    difficulty: room.difficulty,
    customTables: room.custom_tables || undefined,
    isGameActive,
    isPaused,
    onDropletMissed: handleWrongAnswer,
    level: stats.level,
    isSlowed: stats.isSlowed,
    currentProblem,
    isHost,
    roomStatus,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const gameEndedRef = useRef(false);
  const lastScoreUpdateRef = useRef(0);
  const scoreUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 게임 종료 핸들러
  async function handleGameEnd(finalStats: GameStats) {
    if (!user || gameEndedRef.current) return;
    gameEndedRef.current = true;

    // 게임 기록 저장
    await saveGameSession(
      user.id,
      room.id,
      finalStats.score,
      finalStats.correctAnswers,
      finalStats.totalAttempts,
      room.difficulty
    );

    // 잠시 후 게임 오버 화면으로 이동
    setTimeout(() => {
      onGameOver();
    }, 2000);
  }

  // 게임 시작 시 세션 즉시 생성
  useEffect(() => {
    const initializeSession = async () => {
      if (!user) return;
      
      console.log('[MultiplayerGameScreen] 게임 시작, 세션 초기화');
      
      // 기존 세션 삭제 (같은 방에서 이전 게임 세션 제거)
      try {
        const { error: deleteError } = await supabase
          .from('game_sessions')
          .delete()
          .eq('room_id', room.id)
          .eq('user_id', user.id);
        
        if (deleteError) {
          console.error('[MultiplayerGameScreen] 기존 세션 삭제 실패:', deleteError);
        } else {
          console.log('[MultiplayerGameScreen] 기존 세션 삭제 완료');
        }
      } catch (error) {
        console.error('[MultiplayerGameScreen] 기존 세션 삭제 중 오류:', error);
      }
      
      // 새 세션 생성 (점수 0)
      try {
        await saveGameSession(
          user.id,
          room.id,
          0,
          0,
          0,
          room.difficulty
        );
        console.log('[MultiplayerGameScreen] 초기 세션 생성 완료');
      } catch (error) {
        console.error('[MultiplayerGameScreen] 초기 세션 생성 실패:', error);
      }
    };

    initializeSession();
    startGame();
    inputRef.current?.focus();
  }, [user, room.id, room.difficulty]);

  // 실시간 점수 업데이트 (3초마다) - 주기 증가로 리렌더링 감소
  useEffect(() => {
    if (!user || !isGameActive || gameEndedRef.current) return;

    scoreUpdateIntervalRef.current = setInterval(async () => {
      if (!user || !isGameActive || gameEndedRef.current) return;
      
      // 점수가 변경되었을 때만 업데이트
      if (stats.score !== lastScoreUpdateRef.current) {
        console.log('[MultiplayerGameScreen] 실시간 점수 업데이트:', stats.score);
        lastScoreUpdateRef.current = stats.score;
        
        // 세션 업데이트 (게임 중간 점수 동기화용)
        try {
          await saveGameSession(
            user.id,
            room.id,
            stats.score,
            stats.correctAnswers,
            stats.totalAttempts,
            room.difficulty
          );
        } catch (error) {
          console.error('[MultiplayerGameScreen] 실시간 점수 업데이트 실패:', error);
        }
      }
    }, 3000);
    
    return () => {
      if (scoreUpdateIntervalRef.current) {
        clearInterval(scoreUpdateIntervalRef.current);
      }
    };
  }, [user, room.id, room.difficulty, isGameActive, stats.score, stats.correctAnswers, stats.totalAttempts]);

  // 방 삭제 감지
  useEffect(() => {
    if (roomStatus === 'deleted') {
      console.log('[MultiplayerGameScreen] 방이 삭제됨, 게임 종료');
      alert('방장이 방을 나가서 방이 삭제되었습니다.');
      onGameOver();
    }
  }, [roomStatus, onGameOver]);

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

  // 참가자별 점수 매핑 (메모이제이션)
  const participantScores = useMemo(() => {
    const scoreMap = new Map<string, number>();
    
    // 게임 세션에서 점수 매핑
    gameSessions.forEach(session => {
      scoreMap.set(session.user_id, session.score);
    });
    
    // 현재 플레이어는 로컬 점수 사용
    if (user?.id) {
      scoreMap.set(user.id, stats.score);
    }
    
    return scoreMap;
  }, [gameSessions, user?.id, stats.score]);

  // 정렬된 참가자 목록 (메모이제이션)
  const sortedParticipants = useMemo(() => {
    return participants
      .map((p) => ({
        ...p,
        currentScore: participantScores.get(p.user_id) || 0,
      }))
      .sort((a, b) => b.currentScore - a.currentScore);
  }, [participants, participantScores]);

  return (
    <div className="screen multiplayer-game-screen">
      <div className="game-header">
        <div className="score">점수: {stats.score}</div>
        <div className="level">레벨: {stats.level}</div>
        <div className="lives">{renderLives()}</div>
        <div className="accuracy">정확도: {stats.accuracy}%</div>
      </div>

      {stats.statusMessage && <div className="status">{stats.statusMessage}</div>}

      {stats.isSlowed && <div className="slow-indicator">❄️ 슬로우 효과 발동 중</div>}

      <div className="game-layout">
        {/* 게임 캔버스 */}
        <div className="canvas-container">
          <GameCanvas droplets={droplets} />

          {isPaused && (
            <div className="pause-overlay">
              <h2>일시정지</h2>
              <button className="btn-primary" onClick={resumeGame}>
                계속하기
              </button>
            </div>
          )}
        </div>

        {/* 실시간 참가자 점수 */}
        <div className="participants-score-box">
          <h3>👥 실시간 점수</h3>
          <div className="score-list">
            {sortedParticipants.map((participant, index) => (
              <div
                key={participant.id}
                className={`score-item ${participant.user_id === user?.id ? 'my-score' : ''}`}
              >
                <span className="rank">{index + 1}위</span>
                <span className="name">
                  {participant.user?.nickname || '익명'}
                  {participant.user_id === user?.id && ' (나)'}
                </span>
                <span className="score">{participant.currentScore}점</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 게임 컨트롤 */}
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
        </div>
      </div>
    </div>
  );
};

