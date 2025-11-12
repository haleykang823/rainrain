import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginScreenProps {
  onSuccess: () => void;
  onGoToSignUp: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, onGoToSignUp }) => {
  const { signIn, error, clearError } = useAuth();
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    setIsLoading(true);
    const success = await signIn(nickname, password);
    setIsLoading(false);

    if (success) {
      onSuccess();
    }
  };

  return (
    <div className="screen">
      <div className="game-title">
        <h1>🌧️ 구구단 산성비</h1>
      </div>

      <div className="form-container">
        <h2>로그인</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nickname">닉네임</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임 입력"
              className="input-field"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="input-field"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary"
            disabled={isLoading || !nickname || !password}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>

          <button 
            type="button" 
            className="btn-secondary"
            onClick={onGoToSignUp}
            disabled={isLoading}
          >
            회원가입
          </button>
        </form>
      </div>
    </div>
  );
};

