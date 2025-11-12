import { useState } from 'react';
import { MainScreen } from './components/game/MainScreen';
import { DifficultyScreen } from './components/game/DifficultyScreen';
import { GameScreen } from './components/game/GameScreen';
import { GameOverScreen } from './components/game/GameOverScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { SignUpScreen } from './components/auth/SignUpScreen';
import { LeaderboardScreen } from './components/leaderboard/LeaderboardScreen';
import { MultiplayerLobby } from './components/multiplayer/MultiplayerLobby';
import { RoomWaitingScreen } from './components/multiplayer/RoomWaitingScreen';
import { MultiplayerGameScreen } from './components/multiplayer/MultiplayerGameScreen';
import { MultiplayerResultScreen } from './components/multiplayer/MultiplayerResultScreen';
import { useAuth } from './contexts/AuthContext';
import { useRoom } from './hooks/multiplayer/useRoom';
import { GameStats } from './types';
import { gameService } from './services/gameService';
import './App.css';

type Screen =
  | 'main'
  | 'login'
  | 'signup'
  | 'leaderboard'
  | 'difficulty'
  | 'game'
  | 'gameover'
  | 'multiplayer-lobby'
  | 'multiplayer-waiting'
  | 'multiplayer-game'
  | 'multiplayer-result';

function App() {
  const { user } = useAuth();
  const { currentRoom, createRoom, joinRoomByCode, leaveRoom, startGame, finishGame, loading: roomLoading, error: roomError, clearError: clearRoomError } = useRoom();
  
  const [screen, setScreen] = useState<Screen>('main');
  const [difficulty, setDifficulty] = useState('normal');
  const [customTables, setCustomTables] = useState<number[] | undefined>();
  const [gameStats, setGameStats] = useState<GameStats | null>(null);

  // 싱글 플레이 시작
  const handleStartSinglePlayer = () => {
    setScreen('difficulty');
  };

  // 멀티플레이어 시작
  const handleStartMultiplayer = () => {
    setScreen('multiplayer-lobby');
  };

  // 난이도 선택 후 게임 시작
  const handleSelectDifficulty = (selectedDifficulty: string, selectedCustomTables?: number[]) => {
    setDifficulty(selectedDifficulty);
    setCustomTables(selectedCustomTables);
    setScreen('game');
  };

  // 게임 오버
  const handleGameOver = async (stats: GameStats) => {
    setGameStats(stats);

    // 싱글 플레이 기록 저장 (로그인한 경우)
    if (user) {
      const result = await gameService.saveGameResult(
        user.id,
        stats.score,
        stats.correctAnswers,
        stats.totalAttempts,
        difficulty
      );

      if (!result.success) {
        console.error('[App] 점수 저장 실패:', result.error);
      }
    }

    setScreen('gameover');
  };

  // 방 생성 완료
  const handleRoomCreated = (roomId: string) => {
    setScreen('multiplayer-waiting');
  };

  // 방 참가 완료
  const handleRoomJoined = (roomId: string) => {
    setScreen('multiplayer-waiting');
  };

  // 멀티플레이어 게임 시작
  const handleMultiplayerGameStart = () => {
    setScreen('multiplayer-game');
  };

  // 멀티플레이어 게임 종료
  const handleMultiplayerGameOver = () => {
    setScreen('multiplayer-result');
  };

  // 메인 메뉴로 돌아가기
  const handleBackToMenu = () => {
    setScreen('main');
    setGameStats(null);
    setDifficulty('normal');
    setCustomTables(undefined);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'main':
        return (
          <MainScreen
            onStartSinglePlayer={handleStartSinglePlayer}
            onStartMultiplayer={handleStartMultiplayer}
            onShowLeaderboard={() => setScreen('leaderboard')}
            onShowLogin={() => setScreen('login')}
            onShowSignUp={() => setScreen('signup')}
          />
        );

      case 'login':
        return (
          <LoginScreen
            onSuccess={() => setScreen('main')}
            onGoToSignUp={() => setScreen('signup')}
          />
        );

      case 'signup':
        return (
          <SignUpScreen
            onSuccess={() => setScreen('main')}
            onBackToLogin={() => setScreen('login')}
          />
        );

      case 'leaderboard':
        return <LeaderboardScreen onBack={() => setScreen('main')} />;

      case 'difficulty':
        return (
          <DifficultyScreen
            onSelectDifficulty={handleSelectDifficulty}
            onBack={() => setScreen('main')}
          />
        );

      case 'game':
        return (
          <GameScreen
            difficulty={difficulty}
            customTables={customTables}
            onGameOver={handleGameOver}
            onPause={() => setScreen('main')}
          />
        );

      case 'gameover':
        return (
          <GameOverScreen
            stats={gameStats!}
            onRestart={() => setScreen('difficulty')}
            onMenu={handleBackToMenu}
          />
        );

      case 'multiplayer-lobby':
        return (
          <MultiplayerLobby
            createRoom={createRoom}
            joinRoomByCode={joinRoomByCode}
            loading={roomLoading}
            error={roomError}
            clearError={clearRoomError}
            onRoomCreated={handleRoomCreated}
            onRoomJoined={handleRoomJoined}
            onBack={() => setScreen('main')}
          />
        );

      case 'multiplayer-waiting':
        return currentRoom && user ? (
          <RoomWaitingScreen
            room={currentRoom}
            startGame={startGame}
            leaveRoom={leaveRoom}
            loading={roomLoading}
            onGameStart={handleMultiplayerGameStart}
            onLeave={handleBackToMenu}
          />
        ) : (
          <MainScreen
            onStartSinglePlayer={handleStartSinglePlayer}
            onStartMultiplayer={handleStartMultiplayer}
            onShowLeaderboard={() => setScreen('leaderboard')}
            onShowLogin={() => setScreen('login')}
            onShowSignUp={() => setScreen('signup')}
          />
        );

      case 'multiplayer-game':
        return currentRoom ? (
          <MultiplayerGameScreen
            room={currentRoom}
            onGameOver={handleMultiplayerGameOver}
          />
        ) : (
          <MainScreen
            onStartSinglePlayer={handleStartSinglePlayer}
            onStartMultiplayer={handleStartMultiplayer}
            onShowLeaderboard={() => setScreen('leaderboard')}
            onShowLogin={() => setScreen('login')}
            onShowSignUp={() => setScreen('signup')}
          />
        );

      case 'multiplayer-result':
        return currentRoom ? (
          <MultiplayerResultScreen
            room={currentRoom}
            onBackToMenu={handleBackToMenu}
          />
        ) : (
          <MainScreen
            onStartSinglePlayer={handleStartSinglePlayer}
            onStartMultiplayer={handleStartMultiplayer}
            onShowLeaderboard={() => setScreen('leaderboard')}
            onShowLogin={() => setScreen('login')}
            onShowSignUp={() => setScreen('signup')}
          />
        );

      default:
        return null;
    }
  };

  return <div className="app">{renderScreen()}</div>;
}

export default App;

