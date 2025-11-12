import { DifficultyConfig } from '../types';

// 난이도별 설정 (PRD 기준)
export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    name: '쉬움',
    description: '2, 3, 5단 | 느린 속도',
    tables: [2, 3, 5],
    speed: 0.3,
    spawnInterval: 3000,
  },
  normal: {
    name: '보통',
    description: '2~5단 | 보통 속도',
    tables: [2, 3, 4, 5],
    speed: 0.5,
    spawnInterval: 2500,
  },
  hard: {
    name: '어려움',
    description: '2~9단 | 빠른 속도',
    tables: [2, 3, 4, 5, 6, 7, 8, 9],
    speed: 0.8,
    spawnInterval: 2000,
  },
};

// 게임 설정 (PRD 기준)
export const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  INITIAL_LIVES: 5, // PRD: 생명 5개
  BASE_SCORE: 10, // 정답 1개당 기본 점수
  LEVEL_UP_SCORE: 100, // 100점마다 레벨업
  LEVEL_UP_LIFE_BONUS: 1, // 레벨업 시 생명 1개 회복
  MAX_LIVES: 5, // 최대 생명
  COMBO_BONUS: {
    5: 50,
    10: 100,
    20: 200,
  },
  FAST_ANSWER_BONUS: 5,
  FAST_ANSWER_THRESHOLD: 0.3,
};

// 점수에 따른 등급 (PRD 기준)
export const GRADE_THRESHOLDS = [
  { min: 0, max: 100, stars: 1 },
  { min: 101, max: 300, stars: 2 },
  { min: 301, max: 500, stars: 3 },
  { min: 501, max: 700, stars: 4 },
  { min: 701, max: Infinity, stars: 5 },
];
