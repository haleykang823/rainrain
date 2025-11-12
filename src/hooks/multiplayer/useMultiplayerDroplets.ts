import { useState, useEffect, useRef, useCallback } from 'react';
import { Droplet, ItemType } from '../../types';
import { DIFFICULTY_CONFIGS, GAME_CONFIG } from '../../constants';
import { generateRoomProblem, clearRoomProblem } from '../../services/roomService';
import { useAuth } from '../../contexts/AuthContext';

interface UseMultiplayerDropletsOptions {
  roomId: string;
  difficulty: string;
  customTables?: number[];
  isGameActive: boolean;
  isPaused: boolean;
  onDropletMissed: () => void;
  level: number;
  isSlowed: boolean;
  currentProblem: Droplet | null; // 실시간으로 받은 문제
  isHost: boolean; // 방장 여부
  roomStatus: string | null; // 방 상태 (playing이면 문제 생성 계속)
}

export function useMultiplayerDroplets({
  roomId,
  difficulty,
  customTables,
  isGameActive,
  isPaused,
  onDropletMissed,
  level,
  isSlowed,
  currentProblem,
  isHost,
  roomStatus,
}: UseMultiplayerDropletsOptions) {
  const { user } = useAuth();
  const [droplets, setDroplets] = useState<Droplet[]>([]);
  const onDropletMissedRef = useRef(onDropletMissed);
  const lastProblemIdRef = useRef<string | null>(null);
  const problemSpawnTimeRef = useRef<number>(0);

  useEffect(() => {
    onDropletMissedRef.current = onDropletMissed;
  }, [onDropletMissed]);

  // 실시간으로 받은 문제를 물방울로 추가
  // 방장이 게임 오버되어도 다른 플레이어를 위해 문제를 받아야 함
  useEffect(() => {
    console.log('[useMultiplayerDroplets] currentProblem 변경:', { 
      isGameActive, 
      hasProblem: !!currentProblem,
      problem: currentProblem?.problem,
      roomStatus
    });
    
    // 방 상태가 'playing'이 아니면 문제 추가하지 않음
    if (roomStatus !== 'playing') {
      console.log('[useMultiplayerDroplets] 방 상태가 playing이 아님, 문제 추가 스킵');
      return;
    }
    
    // 게임이 활성화되지 않았어도 문제는 받아야 함 (다른 플레이어를 위해)
    // 하지만 화면에 표시는 하지 않음
    
    if (!currentProblem) {
      console.log('[useMultiplayerDroplets] 문제 없음');
      // 문제가 없으면 lastProblemIdRef 초기화하여 다음 문제를 받을 수 있도록
      lastProblemIdRef.current = null;
      return;
    }
    
    // 게임이 비활성화되어 있으면 문제를 받지만 화면에 추가하지 않음
    if (!isGameActive) {
      console.log('[useMultiplayerDroplets] 게임 비활성화, 문제는 받았지만 화면에 추가하지 않음');
      // lastProblemIdRef는 업데이트하여 다음 문제를 받을 수 있도록
      const problemCreatedAt = (currentProblem as any).createdAt || new Date().toISOString();
      const problemKey = `${currentProblem.multiplicand}×${currentProblem.multiplier}-${problemCreatedAt}`;
      lastProblemIdRef.current = problemKey;
      return;
    }

    // 이미 추가된 문제인지 확인 (문제 내용 + 생성 시간으로 확인)
    // createdAt이 있으면 그것을 사용하고, 없으면 현재 시간 사용
    const problemCreatedAt = (currentProblem as any).createdAt || new Date().toISOString();
    const problemKey = `${currentProblem.multiplicand}×${currentProblem.multiplier}-${problemCreatedAt}`;
    
    if (lastProblemIdRef.current === problemKey) {
      console.log('[useMultiplayerDroplets] 이미 추가된 문제:', problemKey);
      return;
    }

    console.log('[useMultiplayerDroplets] 새 문제 추가:', currentProblem.problem, 'x:', currentProblem.x, problemKey);
    lastProblemIdRef.current = problemKey;
    problemSpawnTimeRef.current = Date.now();

    // 문제를 물방울로 추가
    setDroplets(prev => {
      // 중복 체크 (문제 내용 + 생성 시간으로 확인)
      const problemCreatedAt = (currentProblem as any).createdAt || new Date().toISOString();
      const exists = prev.some(d => {
        const dCreatedAt = (d as any).createdAt || '';
        return d.multiplicand === currentProblem.multiplicand &&
               d.multiplier === currentProblem.multiplier &&
               dCreatedAt === problemCreatedAt;
      });
      
      if (exists) {
        console.log('[useMultiplayerDroplets] 중복 문제 감지, 추가 스킵');
        return prev;
      }

      const newDroplet: Droplet = {
        ...currentProblem,
        id: Date.now() + Math.random(), // 고유 ID
        y: -50, // 시작 위치
      };
      
      // createdAt 정보도 포함
      (newDroplet as any).createdAt = problemCreatedAt;
      
      console.log('[useMultiplayerDroplets] 물방울 추가 완료:', newDroplet.problem, 'x:', newDroplet.x, '총', prev.length + 1, '개');
      return [...prev, newDroplet];
    });
  }, [currentProblem, isGameActive, roomStatus]);

  // 방장이 문제 생성 (주기적으로)
  // 방장이 게임 오버되어도 방 상태가 'playing'이면 문제 생성을 계속함
  useEffect(() => {
    // 방 상태가 'playing'이 아니면 문제 생성 중단
    if (roomStatus !== 'playing') {
      console.log('[useMultiplayerDroplets] 방 상태가 playing이 아님, 문제 생성 중단:', roomStatus);
      return;
    }
    
    // 방장이 아니면 문제 생성하지 않음
    if (!isHost) {
      return;
    }
    
    // 일시정지 중이면 문제 생성하지 않음
    if (isPaused) {
      return;
    }

    const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.normal;
    let lastSpawnTime = 0; // 초기값을 0으로 설정하여 즉시 생성 가능하도록
    let isGenerating = false; // 중복 생성 방지

    const spawnProblem = async () => {
      const now = Date.now();
      
      // 이미 생성 중이면 스킵
      if (isGenerating) {
        return;
      }
      
      // 문제 생성 주기 확인
      if (lastSpawnTime > 0 && now - lastSpawnTime < config.spawnInterval) {
        return;
      }

      // 현재 문제가 없거나, 문제가 생성된 후 일정 시간이 지났으면 새 문제 생성
      const timeSinceLastProblem = problemSpawnTimeRef.current > 0 ? now - problemSpawnTimeRef.current : Infinity;
      const shouldSpawn = !currentProblem || timeSinceLastProblem > config.spawnInterval * 2;

      if (!shouldSpawn) {
        return;
      }

      // 이전 문제가 있으면 제거하고 새 문제 생성 준비
      if (currentProblem) {
        console.log('[useMultiplayerDroplets] 이전 문제 제거 후 새 문제 생성:', currentProblem.problem);
        // 문제 제거 전에 lastProblemIdRef 초기화하여 새 문제를 받을 수 있도록
        lastProblemIdRef.current = null;
        
        await clearRoomProblem(roomId).catch(err => {
          console.error('[useMultiplayerDroplets] 문제 제거 실패:', err);
        });
        // 문제 제거 후 잠시 대기 (DB 업데이트 반영 시간)
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      isGenerating = true;
      console.log('[useMultiplayerDroplets] 방장이 새 문제 생성');
      lastSpawnTime = now;
      
      const { problem, error } = await generateRoomProblem(
        roomId,
        difficulty,
        customTables || undefined
      );

      isGenerating = false;

      if (error) {
        console.error('[useMultiplayerDroplets] 문제 생성 실패:', error);
      } else if (problem) {
        console.log('[useMultiplayerDroplets] 문제 생성 성공:', problem.problem);
      }
    };

    // 초기 문제 생성
    spawnProblem();
    
    const interval = setInterval(spawnProblem, 1000); // 1초마다 체크

    return () => {
      clearInterval(interval);
    };
  }, [roomStatus, isHost, isPaused, difficulty, customTables, roomId, currentProblem]);

  // 게임 루프 - 물방울 이동
  useEffect(() => {
    if (!isGameActive) {
      setDroplets([]);
      lastProblemIdRef.current = null;
      return;
    }

    const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.normal;
    const speedMultiplier = isSlowed ? 0.4 : 1;
    let animationFrameId: number;

    const gameLoop = () => {
      if (isPaused) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      // 물방울 업데이트
      setDroplets(prev => {
        const updated = prev
          .map(droplet => ({
            ...droplet,
            y: droplet.y + config.speed * speedMultiplier,
          }))
          .filter(droplet => {
            if (droplet.y > GAME_CONFIG.CANVAS_HEIGHT) {
              onDropletMissedRef.current();
              // 문제가 떨어지면 lastProblemIdRef 초기화하여 새 문제를 받을 수 있도록
              if (currentProblem && 
                  droplet.multiplicand === currentProblem.multiplicand && 
                  droplet.multiplier === currentProblem.multiplier) {
                console.log('[useMultiplayerDroplets] 문제가 떨어짐, 새 문제 받을 준비:', droplet.problem);
                lastProblemIdRef.current = null;
              }
              // 로컬에서만 제거 (각 플레이어가 독립적으로 처리)
              return false;
            }
            return true;
          });

        return updated;
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isGameActive, isPaused, difficulty, level, isSlowed, roomId, isHost]);

  const checkAnswer = useCallback((answer: number, onCorrect: (itemType: ItemType) => void): boolean => {
    const matchingDroplets = droplets.filter(d => d.answer === answer);
    
    if (matchingDroplets.length === 0) {
      return false;
    }

    // 가장 아래 있는 물방울 찾기
    const lowestDroplet = matchingDroplets.reduce((lowest, current) =>
      current.y > lowest.y ? current : lowest
    );

    // 로컬에서만 제거 (각 플레이어가 독립적으로 문제를 맞춤)
    setDroplets(prev => prev.filter(d => d.id !== lowestDroplet.id));
    onCorrect(lowestDroplet.itemType);
    
    // 문제가 맞춰지면 lastProblemIdRef 초기화하여 새 문제를 받을 수 있도록
    if (currentProblem && 
        lowestDroplet.multiplicand === currentProblem.multiplicand && 
        lowestDroplet.multiplier === currentProblem.multiplier) {
      console.log('[useMultiplayerDroplets] 문제가 맞춰짐, 새 문제 받을 준비:', lowestDroplet.problem);
      lastProblemIdRef.current = null;
    }
    
    // DB에서 문제를 제거하지 않음 - 다른 플레이어도 계속 풀 수 있도록
    
    return true;
  }, [droplets, currentProblem]);

  const removeLowestDroplet = useCallback(() => {
    if (droplets.length === 0) return;

    const lowestDroplet = droplets.reduce((lowest, current) =>
      current.y > lowest.y ? current : lowest
    );

    // 로컬에서만 제거
    setDroplets(prev => prev.filter(d => d.id !== lowestDroplet.id));
    
    // DB에서 문제를 제거하지 않음
  }, [droplets]);

  return {
    droplets,
    checkAnswer,
    removeLowestDroplet,
  };
}

