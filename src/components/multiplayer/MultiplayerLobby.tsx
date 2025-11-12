import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Room } from '../../types';
import { validateRoomCode } from '../../utils/validation';

interface MultiplayerLobbyProps {
  createRoom: (hostId: string, difficulty: string, customTables?: number[]) => Promise<Room | null>;
  joinRoomByCode: (roomCode: string, userId: string) => Promise<Room | null>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  onRoomCreated: (roomId: string) => void;
  onRoomJoined: (roomId: string) => void;
  onBack: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ 
  createRoom, 
  joinRoomByCode, 
  loading, 
  error, 
  clearError,
  onRoomCreated, 
  onRoomJoined, 
  onBack 
}) => {
  const { user } = useAuth();
  
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [difficulty, setDifficulty] = useState('normal');
  const [customTables, setCustomTables] = useState<number[]>([]);
  const [roomCode, setRoomCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // 난이도 선택 핸들러
  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDifficulty(e.target.value);
    if (e.target.value !== 'custom') {
      setCustomTables([]);
    }
  };

  // 구구단 선택 핸들러
  const handleTableToggle = (table: number) => {
    setCustomTables((prev) =>
      prev.includes(table) ? prev.filter((t) => t !== table) : [...prev, table]
    );
  };

  // 방 생성 핸들러
  const handleCreateRoom = async () => {
    console.log('[MultiplayerLobby] handleCreateRoom 시작');
    
    if (!user) {
      console.log('[MultiplayerLobby] 사용자 없음');
      setLocalError('로그인이 필요합니다.');
      return;
    }

    clearError();
    setLocalError(null);

    if (difficulty === 'custom' && customTables.length === 0) {
      setLocalError('최소 1개의 구구단을 선택해주세요.');
      return;
    }

    console.log('[MultiplayerLobby] 방 생성 시도:', { userId: user.id, difficulty, customTables });
    
    const room = await createRoom(
      user.id,
      difficulty,
      difficulty === 'custom' ? customTables : undefined
    );

    console.log('[MultiplayerLobby] 방 생성 결과:', { room, hasRoom: !!room });

    if (room) {
      console.log('[MultiplayerLobby] 방 생성 성공, 화면 전환:', room.id);
      onRoomCreated(room.id);
    } else {
      console.log('[MultiplayerLobby] 방 생성 실패');
    }
  };

  // 방 참가 핸들러
  const handleJoinRoom = async () => {
    if (!user) {
      setLocalError('로그인이 필요합니다.');
      return;
    }

    clearError();
    setLocalError(null);

    // 방 코드 유효성 검사
    const validation = validateRoomCode(roomCode);
    if (!validation.valid) {
      setLocalError(validation.error || '올바른 방 코드를 입력해주세요.');
      return;
    }

    const room = await joinRoomByCode(roomCode.toUpperCase(), user.id);

    if (room) {
      console.log('[MultiplayerLobby] 방 참가 성공, 화면 전환:', room.id);
      onRoomJoined(room.id);
    } else {
      console.log('[MultiplayerLobby] 방 참가 실패');
    }
  };

  const displayError = localError || error;

  // 모드 선택 화면
  if (mode === 'select') {
    return (
      <div className="screen">
        <div className="game-title">
          <h1>👥 멀티플레이어</h1>
        </div>

        <div className="multiplayer-lobby">
          <div className="lobby-buttons">
            <button className="btn-primary" onClick={() => setMode('create')}>
              방 만들기 🎮
            </button>
            <button className="btn-primary" onClick={() => setMode('join')}>
              방 참가하기 🚪
            </button>
            <button className="btn-secondary" onClick={onBack}>
              돌아가기
            </button>
          </div>

          <div className="info-box">
            <h3>📌 멀티플레이어 안내</h3>
            <ul>
              <li>최대 10명까지 함께 플레이할 수 있습니다</li>
              <li>방장이 게임을 시작하면 모두 같은 게임을 플레이합니다</li>
              <li>게임 종료 후 참가자들의 점수를 확인할 수 있습니다</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // 방 만들기 화면
  if (mode === 'create') {
    return (
      <div className="screen">
        <div className="game-title">
          <h1>🎮 방 만들기</h1>
        </div>

        <div className="room-create-container">
          <div className="form-group">
            <label htmlFor="difficulty">난이도 선택</label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={handleDifficultyChange}
              className="select-field"
              disabled={loading}
            >
              <option value="easy">쉬움 (2~5단)</option>
              <option value="normal">보통 (2~9단)</option>
              <option value="hard">어려움 (2~9단, 빠름)</option>
              <option value="custom">직접 선택</option>
            </select>
          </div>

          {difficulty === 'custom' && (
            <div className="form-group">
              <label>구구단 선택 (다중 선택 가능)</label>
              <div className="table-selection">
                {[2, 3, 4, 5, 6, 7, 8, 9].map((table) => (
                  <button
                    key={table}
                    type="button"
                    className={`table-btn ${customTables.includes(table) ? 'selected' : ''}`}
                    onClick={() => handleTableToggle(table)}
                    disabled={loading}
                  >
                    {table}단
                  </button>
                ))}
              </div>
            </div>
          )}

          {displayError && (
            <div className="error-message" style={{ color: 'red', padding: '10px', margin: '10px 0' }}>
              {displayError}
            </div>
          )}

          <div className="form-actions">
            <button 
              className="btn-primary" 
              onClick={(e) => {
                e.preventDefault();
                console.log('[MultiplayerLobby] 방 만들기 버튼 클릭');
                handleCreateRoom();
              }} 
              disabled={loading}
            >
              {loading ? '생성 중...' : '방 만들기'}
            </button>
            <button className="btn-secondary" onClick={() => setMode('select')} disabled={loading}>
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 방 참가하기 화면
  if (mode === 'join') {
    return (
      <div className="screen">
        <div className="game-title">
          <h1>🚪 방 참가하기</h1>
        </div>

        <div className="room-join-container">
          <div className="form-group">
            <label htmlFor="roomCode">방 코드 입력</label>
            <input
              type="text"
              id="roomCode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="6자리 코드 (예: ABC123)"
              className="input-field room-code-input"
              maxLength={6}
              disabled={loading}
              autoFocus
            />
            <p className="input-hint">방장으로부터 받은 6자리 코드를 입력하세요</p>
          </div>

          {displayError && <div className="error-message">{displayError}</div>}

          <div className="form-actions">
            <button
              className="btn-primary"
              onClick={handleJoinRoom}
              disabled={loading || roomCode.length !== 6}
            >
              {loading ? '참가 중...' : '참가하기'}
            </button>
            <button className="btn-secondary" onClick={() => setMode('select')} disabled={loading}>
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

