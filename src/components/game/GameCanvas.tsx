import React, { useRef, useEffect } from 'react';
import { Droplet } from '../../types';
import { GAME_CONFIG } from '../../constants';

interface GameCanvasProps {
  droplets: Droplet[];
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ droplets }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 초기화
    ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    // 배경색
    ctx.fillStyle = '#e6f7ff';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    // 물방울 그리기
    droplets.forEach((droplet) => {
      // 아이템 타입에 따른 색상 설정
      let backgroundColor = '#ffffff';
      let borderColor = '#0099cc';

      if (droplet.itemType === 'SLOW') {
        backgroundColor = '#e0f7fa'; // 하늘색
        borderColor = '#00bcd4';
      } else if (droplet.itemType === 'BONUS') {
        backgroundColor = '#fff9c4'; // 노란색
        borderColor = '#ffd54f';
      } else if (droplet.itemType === 'CLEAR') {
        backgroundColor = '#ffcdd2'; // 빨간색
        borderColor = '#ef5350';
      }

      // 둥근 사각형 그리기
      const radius = 10;
      const width = 80;
      const height = 50;
      const x = droplet.x - width / 2;
      const y = droplet.y - height / 2;

      // 배경
      ctx.fillStyle = backgroundColor;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      // 테두리
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 문제 텍스트
      ctx.fillStyle = '#333';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(droplet.problem, droplet.x, droplet.y);
    });
  }, [droplets]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_CONFIG.CANVAS_WIDTH}
      height={GAME_CONFIG.CANVAS_HEIGHT}
      className="game-canvas"
    />
  );
};
