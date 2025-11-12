import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface SignUpScreenProps {
  onSuccess: () => void;
  onBackToLogin: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ onSuccess, onBackToLogin }) => {
  const { signUp, error, clearError } = useAuth();
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // 비밀번호 확인
    if (password !== passwordConfirm) {
      setLocalError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    const success = await signUp(nickname, password);
    setIsLoading(false);

    if (success) {
      onSuccess();
    }
  };

  const displayError = localError || error;

  return (
    <div className="screen">
      <div className="game-title">
        <h1>🌧️ 구구단 산성비</h1>
      </div>

      <div className="form-container">
        <h2>회원가입</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nickname">닉네임</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="2-20자 이내 (한글, 영문, 숫자)"
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
              placeholder="6자 이상"
              className="input-field"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirm">비밀번호 확인</label>
            <input
              type="password"
              id="passwordConfirm"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 재입력"
              className="input-field"
              disabled={isLoading}
            />
          </div>

          {displayError && (
            <div className="error-message">
              {displayError}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary"
            disabled={isLoading || !nickname || !password || !passwordConfirm}
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>

          <button 
            type="button" 
            className="btn-secondary"
            onClick={onBackToLogin}
            disabled={isLoading}
          >
            로그인으로 돌아가기
          </button>
        </form>
      </div>
    </div>
  );
};

