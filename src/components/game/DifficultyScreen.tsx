import React, { useState } from 'react';
import { Difficulty } from '../../types';
import { DIFFICULTY_CONFIGS } from '../../constants';

interface DifficultyScreenProps {
  onSelectDifficulty: (difficulty: Difficulty, customTables?: number[]) => void;
  onBack: () => void;
}

export const DifficultyScreen: React.FC<DifficultyScreenProps> = ({ 
  onSelectDifficulty, 
  onBack 
}) => {
  const [showCustom, setShowCustom] = useState(false);
  const [selectedTables, setSelectedTables] = useState<number[]>([2, 3, 4, 5]);

  const handleDifficultyClick = (difficulty: Difficulty) => {
    if (difficulty === 'custom') {
      setShowCustom(true);
    } else {
      onSelectDifficulty(difficulty);
    }
  };

  const handleCustomConfirm = () => {
    if (selectedTables.length === 0) {
      alert('최소 1개 이상의 단을 선택해주세요!');
      return;
    }
    onSelectDifficulty('custom', selectedTables);
  };

  const toggleTable = (table: number) => {
    setSelectedTables(prev => 
      prev.includes(table)
        ? prev.filter(t => t !== table)
        : [...prev, table].sort((a, b) => a - b)
    );
  };

  if (showCustom) {
    return (
      <div className="screen difficulty-screen">
        <div className="difficulty-content">
          <h2>커스텀 난이도</h2>
          <p className="subtitle">원하는 단수를 선택하세요</p>

          <div className="custom-tables">
            {[2, 3, 4, 5, 6, 7, 8, 9].map(table => (
              <button
                key={table}
                className={`table-btn ${selectedTables.includes(table) ? 'selected' : ''}`}
                onClick={() => toggleTable(table)}
              >
                {table}단
              </button>
            ))}
          </div>

          <div className="selected-info">
            선택된 단: {selectedTables.length > 0 
              ? selectedTables.join(', ') + '단' 
              : '없음'}
          </div>

          <div className="button-group">
            <button className="btn btn-secondary" onClick={() => setShowCustom(false)}>
              뒤로
            </button>
            <button className="btn btn-primary" onClick={handleCustomConfirm}>
              시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen difficulty-screen">
      <div className="difficulty-content">
        <h2>난이도 선택</h2>
        <p className="subtitle">실력에 맞는 난이도를 선택하세요</p>

        <div className="difficulty-options">
          {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
            <button
              key={key}
              className="difficulty-card"
              onClick={() => handleDifficultyClick(key as Difficulty)}
            >
              <h3>{config.name}</h3>
              <p>{config.description}</p>
              <div className="difficulty-details">
                <span>물방울: {config.maxDroplets}개</span>
              </div>
            </button>
          ))}

          <button
            className="difficulty-card custom-card"
            onClick={() => handleDifficultyClick('custom')}
          >
            <h3>커스텀</h3>
            <p>원하는 단수 선택</p>
            <div className="difficulty-details">
              <span>직접 설정</span>
            </div>
          </button>
        </div>

        <button className="btn btn-secondary" onClick={onBack}>
          메인으로
        </button>
      </div>
    </div>
  );
};

