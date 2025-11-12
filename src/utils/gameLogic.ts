import { Droplet, ItemType } from '../types';
import { GRADE_THRESHOLDS, GAME_CONFIG } from '../constants';

const ITEM_PROBABILITY = 0.35;

// 곱셈 문제 생성
export function generateProblem(tables: number[]) {
  const table = tables[Math.floor(Math.random() * tables.length)];
  const multiplier = Math.floor(Math.random() * 9) + 1;
  return {
    multiplicand: table,
    multiplier,
    answer: table * multiplier,
  };
}

// 물방울 생성
let dropletIdCounter = 0;
export function createDroplet(tables: number[], canvasWidth: number): Droplet {
  const problem = generateProblem(tables);
  const padding = 80;
  
  // 아이템 타입 결정
  let itemType: ItemType = null;
  if (Math.random() < ITEM_PROBABILITY) {
    const roll = Math.random();
    if (roll < 0.33) itemType = 'SLOW';
    else if (roll < 0.66) itemType = 'BONUS';
    else itemType = 'CLEAR';
  }
  
  return {
    id: dropletIdCounter++,
    ...problem,
    problem: `${problem.multiplicand}×${problem.multiplier}`,
    x: Math.random() * (canvasWidth - padding * 2) + padding,
    y: -50,
    speed: 0.5,
    itemType,
  };
}

// 등급 계산
export function calculateGrade(score: number): number {
  const grade = GRADE_THRESHOLDS.find(g => score >= g.min && score <= g.max);
  return grade?.stars || 1;
}

// 정확도 계산
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}
