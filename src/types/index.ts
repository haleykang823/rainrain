// ===== 기본 게임 타입 =====

export type Difficulty = 'easy' | 'normal' | 'hard' | 'custom';

export type ItemType = 'SLOW' | 'BONUS' | 'CLEAR' | null;

export interface Droplet {
  id: number;
  multiplicand: number;
  multiplier: number;
  answer: number;
  problem: string; // "3×4"
  x: number;
  y: number;
  speed: number;
  itemType: ItemType;
}

export interface DifficultyConfig {
  name: string;
  description: string;
  tables: number[];
  speed: number;
  spawnInterval: number;
}

export interface GameStats {
  score: number;
  lives: number;
  level: number;
  correctAnswers: number;
  totalAttempts: number;
  accuracy: number;
  statusMessage: string;
  isSlowed: boolean;
}

// ===== 인증 타입 =====

export interface User {
  id: string;
  nickname: string;
  best_score: number;
  created_at: string;
  updated_at: string;
}

// ===== 게임 세션 타입 =====

export interface GameSession {
  id: string;
  room_id: string | null;
  user_id: string;
  score: number;
  correct_count: number;
  total_count: number;
  accuracy: number;
  difficulty: string;
  played_at: string;
}

// ===== 멀티플레이어 타입 =====

export interface Room {
  id: string;
  room_code: string;
  host_id: string;
  difficulty: string;
  custom_tables: number[] | null;
  status: 'waiting' | 'playing' | 'finished';
  max_players: number;
  created_at: string;
  finished_at: string | null;
  current_problem?: {
    multiplicand: number;
    multiplier: number;
    answer: number;
    problem: string;
    x: number;
    y: number;
    speed: number;
    itemType: ItemType;
    createdAt: string;
  } | null;
  problem_created_at?: string | null;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  user?: User;
  joined_at: string;
}

// ===== 리더보드 타입 =====

export interface LeaderboardEntry {
  user_id: string;
  nickname: string;
  best_score: number;
  total_score: number;
  rank: number;
}
