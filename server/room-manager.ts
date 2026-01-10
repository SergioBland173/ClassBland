import { RoomState, Participant, QuestionData, QuestionStats, LeaderboardEntry } from './types.js'

interface RoomData {
  state: RoomState
  questions: QuestionData[]
  answers: Map<string, Map<number, { selectedIndex: number; timeSpent: number; isCorrect: boolean; score: number }>>
  timers: NodeJS.Timeout | null
}

class RoomManager {
  private rooms: Map<string, RoomData> = new Map()

  createRoom(
    roomCode: string,
    sessionId: string,
    questions: { id: string; prompt: string; options: string; correctIndex: number; timeLimit: number | null }[],
    basePoints: number,
    activityTimeLimit: number | null
  ): RoomState {
    const parsedQuestions: QuestionData[] = questions.map((q, index) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options ? JSON.parse(q.options) : [],
      timeLimit: q.timeLimit || activityTimeLimit || 30,
      questionIndex: index,
    }))

    const state: RoomState = {
      roomCode,
      sessionId,
      status: 'WAITING',
      participants: [],
      currentQuestionIndex: -1,
      currentQuestion: null,
      questionStartedAt: null,
      totalQuestions: parsedQuestions.length,
    }

    this.rooms.set(roomCode, {
      state,
      questions: parsedQuestions,
      answers: new Map(),
      timers: null,
    })

    return state
  }

  getRoom(roomCode: string): RoomData | undefined {
    return this.rooms.get(roomCode)
  }

  getRoomState(roomCode: string): RoomState | undefined {
    return this.rooms.get(roomCode)?.state
  }

  addParticipant(roomCode: string, participant: Participant): boolean {
    const room = this.rooms.get(roomCode)
    if (!room) return false

    const existingIndex = room.state.participants.findIndex(p => p.odlsId === participant.odlsId)
    if (existingIndex >= 0) {
      room.state.participants[existingIndex] = { ...participant, isConnected: true }
    } else {
      room.state.participants.push(participant)
      room.answers.set(participant.odlsId, new Map())
    }

    return true
  }

  removeParticipant(roomCode: string, odlsId: string): boolean {
    const room = this.rooms.get(roomCode)
    if (!room) return false

    const participant = room.state.participants.find(p => p.odlsId === odlsId)
    if (participant) {
      participant.isConnected = false
    }

    return true
  }

  startSession(roomCode: string): QuestionData | null {
    const room = this.rooms.get(roomCode)
    if (!room || room.questions.length === 0) return null

    room.state.status = 'IN_PROGRESS'
    room.state.currentQuestionIndex = 0
    room.state.currentQuestion = room.questions[0]
    room.state.questionStartedAt = Date.now()

    return room.state.currentQuestion
  }

  nextQuestion(roomCode: string): QuestionData | null {
    const room = this.rooms.get(roomCode)
    if (!room) return null

    const nextIndex = room.state.currentQuestionIndex + 1
    if (nextIndex >= room.questions.length) {
      return null
    }

    room.state.status = 'IN_PROGRESS'
    room.state.currentQuestionIndex = nextIndex
    room.state.currentQuestion = room.questions[nextIndex]
    room.state.questionStartedAt = Date.now()

    return room.state.currentQuestion
  }

  submitAnswer(
    roomCode: string,
    odlsId: string,
    questionIndex: number,
    selectedIndex: number,
    timeSpent: number,
    basePoints: number = 100
  ): { success: boolean; score: number; isCorrect: boolean } {
    const room = this.rooms.get(roomCode)
    if (!room) return { success: false, score: 0, isCorrect: false }

    const question = room.questions[questionIndex]
    if (!question) return { success: false, score: 0, isCorrect: false }

    const participantAnswers = room.answers.get(odlsId)
    if (!participantAnswers) return { success: false, score: 0, isCorrect: false }

    // Ya respondió esta pregunta
    if (participantAnswers.has(questionIndex)) {
      return { success: false, score: 0, isCorrect: false }
    }

    const correctIndex = room.questions[questionIndex]?.options ?
      JSON.parse(JSON.stringify(question)).correctIndex : -1

    // Buscar la respuesta correcta de la pregunta original
    const isCorrect = selectedIndex === (question as any).correctIndex

    let score = 0
    if (isCorrect) {
      const timeLimit = question.timeLimit * 1000 // convertir a ms
      const timeFactor = Math.max(0.3, 1 - timeSpent / timeLimit)
      score = Math.round(basePoints * timeFactor)
    }

    participantAnswers.set(questionIndex, {
      selectedIndex,
      timeSpent,
      isCorrect,
      score,
    })

    // Actualizar puntuación total del participante
    const participant = room.state.participants.find(p => p.odlsId === odlsId)
    if (participant) {
      participant.totalScore += score
    }

    return { success: true, score, isCorrect }
  }

  getQuestionStats(roomCode: string, questionIndex: number): QuestionStats | null {
    const room = this.rooms.get(roomCode)
    if (!room) return null

    const question = room.questions[questionIndex]
    if (!question) return null

    let totalAnswers = 0
    let correctAnswers = 0
    let totalTime = 0
    const answersPerOption: number[] = new Array(question.options.length).fill(0)

    room.answers.forEach((participantAnswers) => {
      const answer = participantAnswers.get(questionIndex)
      if (answer) {
        totalAnswers++
        totalTime += answer.timeSpent
        if (answer.isCorrect) correctAnswers++
        if (answer.selectedIndex >= 0 && answer.selectedIndex < answersPerOption.length) {
          answersPerOption[answer.selectedIndex]++
        }
      }
    })

    return {
      totalAnswers,
      correctAnswers,
      answersPerOption,
      averageTime: totalAnswers > 0 ? Math.round(totalTime / totalAnswers) : 0,
    }
  }

  getLeaderboard(roomCode: string, questionIndex?: number): LeaderboardEntry[] {
    const room = this.rooms.get(roomCode)
    if (!room) return []

    const leaderboard: LeaderboardEntry[] = room.state.participants
      .map((p) => {
        let lastAnswerCorrect = false
        let lastAnswerScore = 0

        if (questionIndex !== undefined) {
          const participantAnswers = room.answers.get(p.odlsId)
          const lastAnswer = participantAnswers?.get(questionIndex)
          if (lastAnswer) {
            lastAnswerCorrect = lastAnswer.isCorrect
            lastAnswerScore = lastAnswer.score
          }
        }

        return {
          odlsId: p.odlsId,
          odlsIdname: p.nickname,
          totalScore: p.totalScore,
          lastAnswerCorrect,
          lastAnswerScore,
          position: 0,
        }
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((entry, index) => ({ ...entry, position: index + 1 }))

    return leaderboard
  }

  showResults(roomCode: string): void {
    const room = this.rooms.get(roomCode)
    if (room) {
      room.state.status = 'SHOWING_RESULTS'
    }
  }

  endSession(roomCode: string): LeaderboardEntry[] {
    const room = this.rooms.get(roomCode)
    if (!room) return []

    room.state.status = 'COMPLETED'
    if (room.timers) {
      clearTimeout(room.timers)
    }

    return this.getLeaderboard(roomCode)
  }

  getCorrectIndex(roomCode: string, questionIndex: number): number {
    const room = this.rooms.get(roomCode)
    if (!room) return -1

    // Need to get from original question data
    return -1 // This should be fetched from DB
  }

  deleteRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode)
    if (room?.timers) {
      clearTimeout(room.timers)
    }
    this.rooms.delete(roomCode)
  }

  getRemainingTime(roomCode: string): number {
    const room = this.rooms.get(roomCode)
    if (!room || !room.state.questionStartedAt || !room.state.currentQuestion) {
      return 0
    }

    const elapsed = Date.now() - room.state.questionStartedAt
    const timeLimit = room.state.currentQuestion.timeLimit * 1000
    return Math.max(0, timeLimit - elapsed)
  }
}

export const roomManager = new RoomManager()
