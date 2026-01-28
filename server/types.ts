// Tipos compartidos para el servidor WebSocket

export interface Participant {
  id: string
  odlsId: string
  nickname: string
  totalScore: number
  isConnected: boolean
}

export interface QuestionData {
  id: string
  type: string
  prompt: string
  imageUrl: string | null
  options: string[]
  correctIndex: number // Deprecado: usar correctIndexes
  correctIndexes: number[] // Array de índices de respuestas correctas
  timeLimit: number
  doublePoints: boolean
  questionIndex: number
}

// Versión para enviar a estudiantes (sin la respuesta correcta)
export interface QuestionDataForClient {
  id: string
  type: string
  prompt: string
  imageUrl: string | null
  options: string[]
  timeLimit: number
  doublePoints: boolean
  questionIndex: number
}

export interface RoomState {
  roomCode: string
  sessionId: string
  status: 'WAITING' | 'IN_PROGRESS' | 'SHOWING_RESULTS' | 'COMPLETED'
  participants: Participant[]
  currentQuestionIndex: number
  currentQuestion: QuestionData | null
  questionStartedAt: number | null
  totalQuestions: number
}

export interface QuestionStats {
  totalAnswers: number
  correctAnswers: number
  answersPerOption: number[]
  averageTime: number
}

export interface LeaderboardEntry {
  odlsId: string
  odlsIdname: string
  totalScore: number
  lastAnswerCorrect: boolean
  lastAnswerScore: number
  position: number
}

// Eventos del cliente al servidor
export interface ClientToServerEvents {
  'join-room': (data: { roomCode: string; odlsId: string; odlsIdname: string }) => void
  'leave-room': (data: { roomCode: string }) => void
  'submit-answer': (data: {
    roomCode: string
    questionIndex: number
    selectedIndex: number
    timeSpent: number
  }) => void
  'teacher:join-room': (data: { sessionId: string }) => void
  'teacher:start-session': (data: { sessionId: string }) => void
  'teacher:next-question': (data: { sessionId: string }) => void
  'teacher:show-results': (data: { sessionId: string }) => void
  'teacher:end-session': (data: { sessionId: string }) => void
}

// Eventos del servidor al cliente
export interface ServerToClientEvents {
  'room-state': (state: RoomState) => void
  'participant-joined': (participant: Participant) => void
  'participant-left': (data: { odlsId: string }) => void
  'question-started': (data: {
    question: QuestionDataForClient
    questionIndex: number
    serverTime: number
  }) => void
  'time-sync': (data: { remainingTime: number; serverTime: number }) => void
  'answer-received': (data: { success: boolean; message?: string }) => void
  'question-results': (data: {
    stats: QuestionStats
    leaderboard: LeaderboardEntry[]
    correctIndexes: number[]
  }) => void
  'session-ended': (data: {
    finalLeaderboard: LeaderboardEntry[]
  }) => void
  'error': (data: { message: string }) => void
}
