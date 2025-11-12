import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRoomRealtime } from '../../hooks/multiplayer/useRoomRealtime';
import { Room } from '../../types';

interface RoomWaitingScreenProps {
  room: Room;
  startGame: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string, userId: string) => Promise<void>;
  loading: boolean;
  onGameStart: () => void;
  onLeave: () => void;
}

export const RoomWaitingScreen: React.FC<RoomWaitingScreenProps> = ({ 
  room, 
  startGame, 
  leaveRoom, 
  loading,
  onGameStart, 
  onLeave 
}) => {
  const { user } = useAuth();
  const { participants, roomStatus } = useRoomRealtime(room.id);
  const [copySuccess, setCopySuccess] = useState(false);

  const isHost = user?.id === room.host_id;

  // 방 코드 복사
  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(room.room_code);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // 게임 시작
  const handleStartGame = async () => {
    console.log('[RoomWaitingScreen] handleStartGame 시작:', { isHost, participantsCount: participants.length });
    
    if (!isHost) {
      console.log('[RoomWaitingScreen] 호스트가 아님');
      return;
    }

    if (participants.length < 2) {
      alert('최소 2명 이상의 참가자가 필요합니다.');
      return;
    }

    console.log('[RoomWaitingScreen] startGame 호출:', room.id);
    try {
      await startGame(room.id);
      console.log('[RoomWaitingScreen] startGame 완료, onGameStart 호출');
      onGameStart();
    } catch (error) {
      console.error('[RoomWaitingScreen] 게임 시작 오류:', error);
    }
  };

  // 방 나가기
  const handleLeaveRoom = async () => {
    if (!user) return;

    const confirmLeave = window.confirm(
      isHost ? '방을 나가면 방이 삭제됩니다. 정말 나가시겠습니까?' : '방을 나가시겠습니까?'
    );

    if (confirmLeave) {
      console.log('[RoomWaitingScreen] 방 나가기:', room.id);
      await leaveRoom(room.id, user.id);
      onLeave();
    }
  };

  // 난이도 표시
  const getDifficultyLabel = () => {
    switch (room.difficulty) {
      case 'easy':
        return '쉬움 (2~5단)';
      case 'normal':
        return '보통 (2~9단)';
      case 'hard':
        return '어려움 (2~9단, 빠름)';
      case 'custom':
        return `직접 선택 (${room.custom_tables?.join(', ')}단)`;
      default:
        return room.difficulty;
    }
  };

  // 방 상태 변경 감지
  React.useEffect(() => {
    console.log('[RoomWaitingScreen] 방 상태 변경 감지:', { 
      roomStatus, 
      roomId: room.id,
      currentScreen: 'waiting'
    });
    
    if (roomStatus === 'playing') {
      console.log('[RoomWaitingScreen] 게임 시작 상태로 변경, onGameStart 호출');
      // 약간의 지연을 두어 상태 업데이트가 완전히 반영되도록 함
      setTimeout(() => {
        console.log('[RoomWaitingScreen] onGameStart 실행');
        onGameStart();
      }, 100);
    } else if (roomStatus === 'deleted') {
      console.log('[RoomWaitingScreen] 방이 삭제됨, 자동으로 나가기');
      alert('방장이 방을 나가서 방이 삭제되었습니다.');
      onLeave();
    }
  }, [roomStatus, onGameStart, onLeave, room.id]);

  return (
    <div className="screen">
      <div className="game-title">
        <h1>🚪 대기실</h1>
      </div>

      <div className="room-waiting-container">
        {/* 방 정보 */}
        <div className="room-info-box">
          <div className="room-code-display">
            <span className="label">방 코드:</span>
            <span className="code">{room.room_code}</span>
            <button className="btn-copy" onClick={handleCopyRoomCode} disabled={loading}>
              {copySuccess ? '복사됨! ✓' : '복사 📋'}
            </button>
          </div>
          <div className="room-detail">
            <span className="label">난이도:</span>
            <span className="value">{getDifficultyLabel()}</span>
          </div>
          <div className="room-detail">
            <span className="label">방장:</span>
            <span className="value">
              {participants.find((p) => p.user_id === room.host_id)?.user?.nickname || '알 수 없음'}
              {isHost && ' (나)'}
            </span>
          </div>
        </div>

        {/* 참가자 목록 */}
        <div className="participants-box">
          <h3>
            👥 참가자 ({participants.length}/{room.max_players})
          </h3>
          <div className="participants-list">
            {participants.map((participant) => (
              <div key={participant.id} className="participant-item">
                <span className="participant-name">
                  {participant.user?.nickname || '익명'}
                  {participant.user_id === room.host_id && ' 👑'}
                  {participant.user_id === user?.id && ' (나)'}
                </span>
                <span className="participant-score">최고 점수: {participant.user?.best_score || 0}점</span>
              </div>
            ))}
          </div>
        </div>

        {/* 대기 메시지 */}
        {!isHost && (
          <div className="waiting-message">
            <p>⏳ 방장이 게임을 시작할 때까지 기다려주세요...</p>
          </div>
        )}

        {/* 호스트 전용 안내 */}
        {isHost && participants.length < 2 && (
          <div className="info-message">
            <p>💡 친구들에게 방 코드를 공유하세요!</p>
            <p>최소 2명 이상 참가해야 게임을 시작할 수 있습니다.</p>
          </div>
        )}

        {/* 버튼 */}
        <div className="room-actions">
          {isHost ? (
            <>
              <button
                className="btn-primary"
                onClick={handleStartGame}
                disabled={loading || participants.length < 2}
              >
                {loading ? '시작 중...' : '게임 시작'}
              </button>
              <button className="btn-secondary" onClick={handleLeaveRoom} disabled={loading}>
                방 닫기
              </button>
            </>
          ) : (
            <button className="btn-secondary" onClick={handleLeaveRoom} disabled={loading}>
              나가기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

