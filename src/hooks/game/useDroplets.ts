import { useState, useEffect, useRef, useCallback } from 'react';
import { Droplet, ItemType } from '../../types';
import { createDroplet } from '../../utils/gameLogic';
import { DIFFICULTY_CONFIGS, GAME_CONFIG } from '../../constants';

interface UseDropletsOptions {
  difficulty: string;
  customTables?: number[];
  isGameActive: boolean;
  isPaused: boolean;
  onDropletMissed: () => void;
  level: number;
  isSlowed: boolean;
}

export function useDroplets({
  difficulty,
  customTables,
  isGameActive,
  isPaused,
  onDropletMissed,
  level,
  isSlowed,
}: UseDropletsOptions) {
  const [droplets, setDroplets] = useState<Droplet[]>([]);
  const onDropletMissedRef = useRef(onDropletMissed);

  useEffect(() => {
    onDropletMissedRef.current = onDropletMissed;
  }, [onDropletMissed]);

  // 게임 루프
  useEffect(() => {
    if (!isGameActive) {
      setDroplets([]);
      return;
    }

    const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.normal;
    const tables = customTables && customTables.length > 0 ? customTables : config.tables;
    const speedMultiplier = isSlowed ? 0.4 : 1;

    let lastSpawnTime = Date.now();
    let animationFrameId: number;

    const gameLoop = () => {
      if (isPaused) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      const now = Date.now();

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
              return false;
            }
            return true;
          });

        return updated;
      });

      // 새 물방울 생성
      if (now - lastSpawnTime > config.spawnInterval) {
        setDroplets(prev => {
          const newDroplet = createDroplet(tables, GAME_CONFIG.CANVAS_WIDTH);
          return [...prev, newDroplet];
        });
        lastSpawnTime = now;
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isGameActive, isPaused, difficulty, customTables, level, isSlowed]);

  const checkAnswer = useCallback((answer: number, onCorrect: (itemType: ItemType) => void): boolean => {
    const matchingDroplets = droplets.filter(d => d.answer === answer);
    
    if (matchingDroplets.length === 0) {
      return false;
    }

    // 가장 아래 있는 물방울 찾기
    const lowestDroplet = matchingDroplets.reduce((lowest, current) =>
      current.y > lowest.y ? current : lowest
    );

    setDroplets(prev => prev.filter(d => d.id !== lowestDroplet.id));
    onCorrect(lowestDroplet.itemType);
    
    return true;
  }, [droplets]);

  const removeLowestDroplet = useCallback(() => {
    if (droplets.length === 0) return;

    const lowestDroplet = droplets.reduce((lowest, current) =>
      current.y > lowest.y ? current : lowest
    );

    setDroplets(prev => prev.filter(d => d.id !== lowestDroplet.id));
  }, [droplets]);

  return {
    droplets,
    checkAnswer,
    removeLowestDroplet,
  };
}
