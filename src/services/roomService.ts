import { supabase } from '../utils/supabase';
import { Room, RoomParticipant, GameSession, Droplet } from '../types';
import { generateRoomCode } from '../utils/roomCodeGenerator';
import { generateProblem } from '../utils/gameLogic';
import { DIFFICULTY_CONFIGS, GAME_CONFIG } from '../constants';

/**
 * 방 생성
 */
export const createRoom = async (
  hostId: string,
  difficulty: string,
  customTables?: number[]
): Promise<{ room: Room | null; error: string | null }> => {
  console.log('[roomService] createRoom 시작:', { hostId, difficulty, customTables });
  
  try {
    // 유니크한 방 코드 생성 (최대 10번 시도)
    let roomCode = generateRoomCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      console.log(`[roomService] 방 생성 시도 ${attempts + 1}/${maxAttempts}, 코드: ${roomCode}`);
      
      // 방 생성 시도
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert([
          {
            room_code: roomCode,
            host_id: hostId,
            difficulty,
            custom_tables: customTables || null,
            status: 'waiting',
            max_players: 10,
          },
        ])
        .select()
        .single();

      console.log('[roomService] 방 생성 응답:', { hasData: !!roomData, error: roomError });

      // 성공하면 호스트를 참가자로 추가하고 종료
      if (roomData && !roomError) {
        console.log('[roomService] 방 생성 성공:', roomData.id);
        const { error: participantError } = await supabase.from('room_participants').insert([
          {
            room_id: roomData.id,
            user_id: hostId,
          },
        ]);

        if (participantError) {
          console.error('[roomService] 호스트 참가자 추가 실패:', participantError);
          // 방 생성은 성공했으므로 계속 진행
        } else {
          console.log('[roomService] 호스트 참가자 추가 성공');
        }

        return { room: roomData as Room, error: null };
      }

      // UNIQUE 제약조건 위반이면 새 코드로 재시도
      if (roomError?.code === '23505') {
        console.log('[roomService] 방 코드 중복, 새 코드 생성');
        roomCode = generateRoomCode();
        attempts++;
        continue;
      }

      // 다른 에러면 반환
      console.error('[roomService] 방 생성 실패:', roomError);
      return { room: null, error: roomError?.message || '방 생성에 실패했습니다.' };
    }

    console.error('[roomService] 최대 시도 횟수 초과');
    return { room: null, error: '방 코드 생성에 실패했습니다. 다시 시도해주세요.' };
  } catch (err: any) {
    console.error('[roomService] 예외 발생:', err);
    return { room: null, error: err?.message || '방 생성 중 오류가 발생했습니다.' };
  }
};

/**
 * 방 코드로 방 찾기
 */
export const findRoomByCode = async (
  roomCode: string
): Promise<{ room: Room | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .eq('status', 'waiting')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { room: null, error: '방을 찾을 수 없습니다.' };
      }
      return { room: null, error: error.message };
    }

    return { room: data as Room, error: null };
  } catch (err) {
    console.error('Find room by code error:', err);
    return { room: null, error: '방 찾기 중 오류가 발생했습니다.' };
  }
};

/**
 * 방 참가
 */
export const joinRoom = async (
  roomId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    // 방 존재 및 상태 확인
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*, room_participants(count)')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return { success: false, error: '방을 찾을 수 없습니다.' };
    }

    if (roomData.status !== 'waiting') {
      return { success: false, error: '이미 시작된 방입니다.' };
    }

    // 참가자 수 확인
    const participantCount = (roomData.room_participants as any)?.[0]?.count || 0;
    if (participantCount >= roomData.max_players) {
      return { success: false, error: '방이 가득 찼습니다.' };
    }

    // 이미 참가 중인지 확인
    const { data: existingParticipant } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (existingParticipant) {
      return { success: true, error: null }; // 이미 참가 중
    }

    // 참가자 추가
    const { error: insertError } = await supabase.from('room_participants').insert([
      {
        room_id: roomId,
        user_id: userId,
      },
    ]);

    if (insertError) {
      console.error('Join room error:', insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Join room error:', err);
    return { success: false, error: '방 참가 중 오류가 발생했습니다.' };
  }
};

/**
 * 방 나가기
 */
export const leaveRoom = async (
  roomId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    // 방 정보 가져오기
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('host_id')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return { success: false, error: '방을 찾을 수 없습니다.' };
    }

    // 참가자 제거
    const { error: deleteError } = await supabase
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Leave room error:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // 호스트가 나가는 경우 방 삭제
    if (roomData.host_id === userId) {
      console.log('[roomService] 호스트가 나감, 방 삭제 시작:', roomId);
      
      // 먼저 모든 참가자 제거 (CASCADE로 자동 삭제되지만 명시적으로 처리)
      const { error: deleteParticipantsError } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId);
      
      if (deleteParticipantsError) {
        console.error('[roomService] 참가자 삭제 오류:', deleteParticipantsError);
      }
      
      // 방 삭제
      const { error: deleteRoomError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (deleteRoomError) {
        console.error('[roomService] 방 삭제 오류:', deleteRoomError);
        return { success: false, error: deleteRoomError.message };
      }
      
      console.log('[roomService] 방 삭제 완료');
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Leave room error:', err);
    return { success: false, error: '방 나가기 중 오류가 발생했습니다.' };
  }
};

/**
 * 방 상태 업데이트
 */
export const updateRoomStatus = async (
  roomId: string,
  status: 'waiting' | 'playing' | 'finished'
): Promise<{ success: boolean; error: string | null }> => {
  console.log('[roomService] updateRoomStatus 시작:', { roomId, status });
  
  try {
    const updateData: any = { status };

    if (status === 'finished') {
      updateData.finished_at = new Date().toISOString();
    }

    console.log('[roomService] 방 상태 업데이트 시도:', updateData);
    const { data, error } = await supabase
      .from('rooms')
      .update(updateData)
      .eq('id', roomId)
      .select()
      .single();

    console.log('[roomService] 방 상태 업데이트 결과:', { hasData: !!data, error: error?.message });

    if (error) {
      console.error('[roomService] Update room status error:', error);
      return { success: false, error: error.message };
    }

    console.log('[roomService] 방 상태 업데이트 성공');
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[roomService] Update room status exception:', err);
    return { success: false, error: err?.message || '방 상태 업데이트 중 오류가 발생했습니다.' };
  }
};

/**
 * 방 참가자 목록 가져오기
 */
export const getRoomParticipants = async (
  roomId: string
): Promise<{ participants: RoomParticipant[] | null; error: string | null }> => {
  console.log('[roomService] getRoomParticipants 시작:', roomId);
  
  try {
    const { data, error } = await supabase
      .from('room_participants')
      .select('*, users(id, nickname, best_score)')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    console.log('[roomService] 참가자 조회 결과:', { 
      count: data?.length || 0, 
      error: error?.message,
      participants: data?.map((p: any) => ({ id: p.id, userId: p.user_id, nickname: p.users?.nickname }))
    });

    if (error) {
      console.error('[roomService] Get room participants error:', error);
      return { participants: null, error: error.message };
    }

    const participants: RoomParticipant[] = (data || []).map((p: any) => ({
      id: p.id,
      room_id: p.room_id,
      user_id: p.user_id,
      user: p.users,
      joined_at: p.joined_at,
    }));

    console.log('[roomService] 참가자 목록 반환:', participants.length, '명');
    return { participants, error: null };
  } catch (err: any) {
    console.error('[roomService] Get room participants exception:', err);
    return { participants: null, error: err?.message || '참가자 목록을 불러오는데 실패했습니다.' };
  }
};

/**
 * 게임 세션 저장
 */
export const saveGameSession = async (
  userId: string,
  roomId: string | null,
  score: number,
  correctCount: number,
  totalCount: number,
  difficulty: string
): Promise<{ session: GameSession | null; error: string | null }> => {
  try {
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

    // 멀티플레이어인 경우 기존 세션 확인
    if (roomId) {
      const { data: existingSession, error: findError } = await supabase
        .from('game_sessions')
        .select('id, difficulty, played_at')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();

      if (findError) {
        console.error('[saveGameSession] 기존 세션 확인 실패:', findError);
      }

      if (existingSession) {
        // 기존 세션 업데이트
        
        // 업데이트 실행 (select 없이)
        // 점수 업데이트 시 played_at도 갱신하여 최신 세션으로 인식되도록 함
        const { error: updateError } = await supabase
          .from('game_sessions')
          .update({
            score,
            correct_count: correctCount,
            total_count: totalCount,
            accuracy,
            played_at: new Date().toISOString(), // 업데이트 시간 갱신
          })
          .eq('id', existingSession.id);

        if (updateError) {
          console.error('[saveGameSession] 세션 업데이트 실패:', updateError);
          return { session: null, error: updateError.message };
        }

        // 업데이트 후 별도로 조회 (안전하게)
        const { data: updatedSession, error: fetchError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', existingSession.id)
          .maybeSingle();

        if (fetchError) {
          console.error('[saveGameSession] 업데이트된 세션 조회 실패:', fetchError);
          // 업데이트는 성공했으므로 기존 세션 정보로 반환
          return { 
            session: {
              id: existingSession.id,
              room_id: roomId,
              user_id: userId,
              score,
              correct_count: correctCount,
              total_count: totalCount,
              accuracy,
              difficulty: existingSession.difficulty || difficulty,
              played_at: existingSession.played_at || new Date().toISOString(),
            } as GameSession, 
            error: null 
          };
        }

        if (!updatedSession) {
          console.warn('[saveGameSession] 업데이트된 세션을 찾을 수 없음, 기존 세션 정보로 반환');
          return { 
            session: {
              id: existingSession.id,
              room_id: roomId,
              user_id: userId,
              score,
              correct_count: correctCount,
              total_count: totalCount,
              accuracy,
              difficulty: existingSession.difficulty || difficulty,
              played_at: existingSession.played_at || new Date().toISOString(),
            } as GameSession, 
            error: null 
          };
        }

        // best_score 업데이트는 건너뛰고 바로 반환 (게임 중간 업데이트)
        return { session: updatedSession as GameSession, error: null };
      }
    }

    // 1. game_sessions 테이블에 저장 (새 세션)
    const { data, error } = await supabase
      .from('game_sessions')
      .insert([
        {
          user_id: userId,
          room_id: roomId,
          score,
          correct_count: correctCount,
          total_count: totalCount,
          accuracy,
          difficulty,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[saveGameSession] game_sessions 저장 실패:', error);
      return { session: null, error: error.message };
    }

    if (!data || !data.id) {
      console.error('[saveGameSession] 저장된 데이터가 없음:', data);
      return { session: null, error: '게임 기록 저장에 실패했습니다.' };
    }

    // 2. users 테이블의 best_score 업데이트 (타임아웃 처리)
    
    try {
      // 현재 best_score 확인 (3초 타임아웃)
      const fetchUserPromise = supabase
        .from('users')
        .select('best_score')
        .eq('id', userId)
        .single();
      
      const fetchTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('FETCH_TIMEOUT')), 3000);
      });
      
      let currentUser, fetchUserError;
      try {
        const result = await Promise.race([fetchUserPromise, fetchTimeoutPromise]);
        currentUser = result.data;
        fetchUserError = result.error;
      } catch (err: any) {
        if (err.message === 'FETCH_TIMEOUT') {
          fetchUserError = { code: 'TIMEOUT', message: '조회 타임아웃' };
        } else {
          throw err;
        }
      }

      if (fetchUserError) {
        console.error('[saveGameSession] users 조회 실패:', fetchUserError);
        // 조회 실패해도 game_sessions는 저장되었으므로 계속 진행
      } else {
        const currentBestScore = currentUser?.best_score || 0;
        
        // 새 점수가 더 높으면 업데이트
        if (score > currentBestScore) {
          // 업데이트도 타임아웃 처리
          const updatePromise = supabase
            .from('users')
            .update({ best_score: score })
            .eq('id', userId);
          
          const updateTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('UPDATE_TIMEOUT')), 3000);
          });
          
          try {
            await Promise.race([updatePromise, updateTimeoutPromise]);
          } catch (updateErr: any) {
            if (updateErr.message === 'UPDATE_TIMEOUT') {
              console.error('[saveGameSession] best_score 업데이트 타임아웃');
            } else {
              console.error('[saveGameSession] best_score 업데이트 실패:', updateErr);
            }
            // 업데이트 실패해도 game_sessions는 저장되었으므로 계속 진행
          }
        }
      }
    } catch (err) {
      console.error('[saveGameSession] users 테이블 처리 중 오류:', err);
      // 오류 발생해도 game_sessions는 저장되었으므로 계속 진행
    }

    return { session: data as GameSession, error: null };
  } catch (err) {
    console.error('[saveGameSession] 전체 에러:', err);
    return { session: null, error: '게임 기록 저장 중 오류가 발생했습니다.' };
  }
};

/**
 * 방의 게임 세션 목록 가져오기 (결과 화면용)
 */
export const getRoomGameSessions = async (
  roomId: string
): Promise<{ sessions: GameSession[] | null; error: string | null }> => {
  console.log('[roomService] getRoomGameSessions 시작:', roomId);
  
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*, users(id, nickname)')
      .eq('room_id', roomId)
      .order('played_at', { ascending: false }); // 최신 순으로 정렬

    console.log('[roomService] getRoomGameSessions 결과 (필터링 전):', {
      count: data?.length || 0,
      error: error?.message,
      sessions: data?.map((s: any) => ({ userId: s.user_id, nickname: s.users?.nickname, score: s.score, playedAt: s.played_at }))
    });

    if (error) {
      console.error('[roomService] Get room game sessions error:', error);
      return { sessions: null, error: error.message };
    }

    // 각 사용자당 가장 최신 세션만 선택
    const userSessionsMap = new Map<string, any>();
    
    (data || []).forEach((s: any) => {
      const userId = s.user_id;
      const existing = userSessionsMap.get(userId);
      
      // 기존 세션이 없거나, 현재 세션이 더 최신이면 업데이트
      if (!existing || new Date(s.played_at) > new Date(existing.played_at)) {
        userSessionsMap.set(userId, s);
      }
    });

    const uniqueSessions = Array.from(userSessionsMap.values());

    console.log('[roomService] 필터링 후 세션:', {
      count: uniqueSessions.length,
      sessions: uniqueSessions.map((s: any) => ({ userId: s.user_id, nickname: s.users?.nickname, score: s.score }))
    });

    const sessions: GameSession[] = uniqueSessions.map((s: any) => ({
      id: s.id,
      room_id: s.room_id,
      user_id: s.user_id,
      user: s.users,
      score: s.score,
      correct_count: s.correct_count,
      total_count: s.total_count,
      accuracy: s.accuracy,
      difficulty: s.difficulty,
      played_at: s.played_at,
    }));

    console.log('[roomService] getRoomGameSessions 완료:', sessions.length, '개 세션 (중복 제거 후)');
    return { sessions, error: null };
  } catch (err: any) {
    console.error('[roomService] Get room game sessions exception:', err);
    return { sessions: null, error: err?.message || '게임 기록을 불러오는데 실패했습니다.' };
  }
};

/**
 * 방의 현재 문제 생성 (방장만 가능)
 */
export const generateRoomProblem = async (
  roomId: string,
  difficulty: string,
  customTables?: number[] | null
): Promise<{ problem: Droplet | null; error: string | null }> => {
  console.log('[roomService] generateRoomProblem 시작:', { roomId, difficulty, customTables });
  
  try {
    // 방 정보 가져오기
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('difficulty, custom_tables')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return { problem: null, error: '방을 찾을 수 없습니다.' };
    }

    // 문제 생성 (최근 5개 문제와 중복되지 않도록)
    const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.normal;
    const tables = customTables && customTables.length > 0 ? customTables : config.tables;
    
    // 최근 문제 확인 (중복 방지)
    const { data: recentProblems } = await supabase
      .from('rooms')
      .select('current_problem')
      .eq('id', roomId)
      .single();
    
    let problemData;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      problemData = generateProblem(tables);
      attempts++;
      
      // 최근 문제와 중복되지 않으면 종료
      if (!recentProblems?.current_problem) {
        break;
      }
      
      const recent = recentProblems.current_problem as any;
      const isDuplicate = recent.multiplicand === problemData.multiplicand && 
                          recent.multiplier === problemData.multiplier;
      
      if (!isDuplicate || attempts >= maxAttempts) {
        break;
      }
    } while (attempts < maxAttempts);
    
    // 아이템 타입 결정
    const ITEM_PROBABILITY = 0.35;
    let itemType: 'SLOW' | 'BONUS' | 'CLEAR' | null = null;
    if (Math.random() < ITEM_PROBABILITY) {
      const roll = Math.random();
      if (roll < 0.33) itemType = 'SLOW';
      else if (roll < 0.66) itemType = 'BONUS';
      else itemType = 'CLEAR';
    }

    const padding = 80;
    const problem: Droplet = {
      id: Date.now(), // 임시 ID
      ...problemData,
      problem: `${problemData.multiplicand}×${problemData.multiplier}`,
      x: Math.random() * (GAME_CONFIG.CANVAS_WIDTH - padding * 2) + padding,
      y: -50,
      speed: config.speed,
      itemType,
    };

    // DB에 저장
    const problemJson = {
      multiplicand: problem.multiplicand,
      multiplier: problem.multiplier,
      answer: problem.answer,
      problem: problem.problem,
      x: problem.x,
      y: problem.y,
      speed: problem.speed,
      itemType: problem.itemType,
      createdAt: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        current_problem: problemJson,
        problem_created_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (updateError) {
      console.error('[roomService] 문제 생성 실패:', updateError);
      return { problem: null, error: updateError.message };
    }

    console.log('[roomService] 문제 생성 성공:', problem.problem);
    return { problem, error: null };
  } catch (err: any) {
    console.error('[roomService] 문제 생성 예외:', err);
    return { problem: null, error: err?.message || '문제 생성 중 오류가 발생했습니다.' };
  }
};

/**
 * 방의 현재 문제 가져오기
 */
export const getRoomProblem = async (
  roomId: string
): Promise<{ problem: Droplet | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('current_problem, problem_created_at')
      .eq('id', roomId)
      .single();

    if (error || !data || !data.current_problem) {
      return { problem: null, error: null }; // 문제가 없으면 null 반환
    }

    const problemData = data.current_problem as any;
    const problem: Droplet = {
      id: Date.now(), // 임시 ID
      multiplicand: problemData.multiplicand,
      multiplier: problemData.multiplier,
      answer: problemData.answer,
      problem: problemData.problem,
      x: problemData.x,
      y: problemData.y,
      speed: problemData.speed,
      itemType: problemData.itemType,
    };
    
    // createdAt 정보도 포함 (중복 체크용)
    (problem as any).createdAt = problemData.createdAt || data.problem_created_at || new Date().toISOString();

    return { problem, error: null };
  } catch (err: any) {
    console.error('[roomService] 문제 가져오기 예외:', err);
    return { problem: null, error: err?.message || '문제를 가져오는데 실패했습니다.' };
  }
};

/**
 * 방의 현재 문제 제거 (답변되거나 떨어졌을 때)
 */
export const clearRoomProblem = async (
  roomId: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('rooms')
      .update({
        current_problem: null,
        problem_created_at: null,
      })
      .eq('id', roomId);

    if (error) {
      console.error('[roomService] 문제 제거 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[roomService] 문제 제거 예외:', err);
    return { success: false, error: err?.message || '문제 제거 중 오류가 발생했습니다.' };
  }
};

