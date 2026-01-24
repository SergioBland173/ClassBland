import 'dotenv/config'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { roomManager } from './room-manager.js'
import type { ClientToServerEvents, ServerToClientEvents, Participant } from './types.js'

const prisma = new PrismaClient()
const httpServer = createServer()

// Orígenes CORS: localhost + variable de entorno para túneles
const corsOrigins = [
  'http://localhost:3000',
  'http://192.168.1.16:3000',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[]

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Namespace para sesiones en vivo
const liveNS = io.of('/live')

// Map de socket.id a roomCode para cleanup
const socketRooms = new Map<string, { roomCode: string; odlsId: string; isTeacher: boolean }>()

liveNS.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log('Cliente conectado:', socket.id)

  // Estudiante se une a la sala
  socket.on('join-room', async ({ roomCode, odlsId, odlsIdname }) => {
    try {
      const session = await prisma.liveSession.findFirst({
        where: { roomCode, status: { in: ['WAITING', 'IN_PROGRESS'] } },
        include: {
          activity: { include: { questions: { orderBy: { order: 'asc' } } } },
          participants: true,
        },
      })

      if (!session) {
        socket.emit('error', { message: 'Sesion no encontrada o ya finalizada' })
        return
      }

      // Crear o actualizar participante en DB (odlsId is actually userId)
      const participant = await prisma.liveParticipant.upsert({
        where: { sessionId_userId: { sessionId: session.id, userId: odlsId } },
        update: { isConnected: true, nickname: odlsIdname },
        create: {
          sessionId: session.id,
          userId: odlsId,
          nickname: odlsIdname,
        },
      })

      // Inicializar sala en memoria si no existe
      let roomState = roomManager.getRoomState(roomCode)
      if (!roomState) {
        roomState = roomManager.createRoom(
          roomCode,
          session.id,
          session.activity.questions.map((q) => ({
            id: q.id,
            type: q.type || 'MULTIPLE_CHOICE',
            prompt: q.prompt,
            options: q.options || '[]',
            correctIndex: q.correctIndex || 0,
            timeLimit: q.timeLimit,
          })),
          session.activity.basePoints,
          session.activity.timeLimit
        )
      }

      const participantData: Participant = {
        id: participant.id,
        odlsId: participant.userId,
        nickname: participant.nickname,
        totalScore: participant.totalScore,
        isConnected: true,
      }

      roomManager.addParticipant(roomCode, participantData)
      socketRooms.set(socket.id, { roomCode, odlsId, isTeacher: false })

      socket.join(roomCode)
      socket.emit('room-state', roomManager.getRoomState(roomCode)!)
      socket.to(roomCode).emit('participant-joined', participantData)

      console.log(`${odlsIdname} se unio a la sala ${roomCode}`)
    } catch (error) {
      console.error('Error al unirse a la sala:', error)
      socket.emit('error', { message: 'Error al unirse a la sala' })
    }
  })

  // Profesor se une a su sala
  socket.on('teacher:join-room', async ({ sessionId }) => {
    try {
      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: {
          activity: { include: { questions: { orderBy: { order: 'asc' } } } },
          participants: true,
        },
      })

      if (!session) {
        socket.emit('error', { message: 'Sesion no encontrada' })
        return
      }

      const roomCode = session.roomCode

      // Inicializar sala en memoria si no existe
      let roomState = roomManager.getRoomState(roomCode)
      if (!roomState) {
        roomState = roomManager.createRoom(
          roomCode,
          session.id,
          session.activity.questions.map((q) => ({
            id: q.id,
            type: q.type || 'MULTIPLE_CHOICE',
            prompt: q.prompt,
            options: q.options || '[]',
            correctIndex: q.correctIndex || 0,
            timeLimit: q.timeLimit,
          })),
          session.activity.basePoints,
          session.activity.timeLimit
        )

        // Cargar participantes existentes
        session.participants.forEach((p) => {
          roomManager.addParticipant(roomCode, {
            id: p.id,
            odlsId: p.userId,
            nickname: p.nickname,
            totalScore: p.totalScore,
            isConnected: p.isConnected,
          })
        })
      }

      socketRooms.set(socket.id, { roomCode, odlsId: session.teacherId, isTeacher: true })
      socket.join(roomCode)
      socket.emit('room-state', roomManager.getRoomState(roomCode)!)

      console.log(`Profesor conectado a sala ${roomCode}`)
    } catch (error) {
      console.error('Error al conectar profesor:', error)
      socket.emit('error', { message: 'Error al conectar' })
    }
  })

  // Profesor inicia la sesión
  socket.on('teacher:start-session', async ({ sessionId }) => {
    try {
      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: { activity: { include: { questions: { orderBy: { order: 'asc' } } } } },
      })

      if (!session) return

      const roomCode = session.roomCode
      const question = roomManager.startSession(roomCode)

      if (!question) {
        socket.emit('error', { message: 'No hay preguntas en esta actividad' })
        return
      }

      await prisma.liveSession.update({
        where: { id: sessionId },
        data: {
          status: 'IN_PROGRESS',
          currentQuestionIndex: 0,
          questionStartedAt: new Date(),
        },
      })

      // Enviar pregunta sin respuesta correcta
      const questionForClients = {
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        options: question.options,
        timeLimit: question.timeLimit,
        questionIndex: 0,
      }

      liveNS.to(roomCode).emit('question-started', {
        question: questionForClients,
        questionIndex: 0,
        serverTime: Date.now(),
      })

      console.log(`Sesion ${roomCode} iniciada`)
    } catch (error) {
      console.error('Error al iniciar sesion:', error)
    }
  })

  // Estudiante envía respuesta
  socket.on('submit-answer', async ({ roomCode, questionIndex, selectedIndex, timeSpent }) => {
    const socketData = socketRooms.get(socket.id)
    if (!socketData || socketData.isTeacher) return

    const room = roomManager.getRoom(roomCode)
    if (!room) return

    const session = await prisma.liveSession.findFirst({
      where: { roomCode },
      include: { activity: { include: { questions: { orderBy: { order: 'asc' } } } } },
    })

    if (!session) return

    const question = session.activity.questions[questionIndex]
    if (!question) return

    const isCorrect = selectedIndex === question.correctIndex
    let score = 0

    if (isCorrect) {
      const timeLimit = (question.timeLimit || session.activity.timeLimit || 30) * 1000
      const timeFactor = Math.max(0.3, 1 - timeSpent / timeLimit)
      score = Math.round(session.activity.basePoints * timeFactor)
    }

    // Guardar en memoria
    const result = roomManager.submitAnswer(
      roomCode,
      socketData.odlsId,
      questionIndex,
      selectedIndex,
      timeSpent,
      session.activity.basePoints
    )

    if (!result.success) {
      socket.emit('answer-received', { success: false, message: 'Ya respondiste esta pregunta' })
      return
    }

    // Guardar en DB
    const participant = await prisma.liveParticipant.findFirst({
      where: { sessionId: session.id, userId: socketData.odlsId },
    })

    if (participant) {
      await prisma.liveAnswer.create({
        data: {
          sessionId: session.id,
          participantId: participant.id,
          questionId: question.id,
          questionIndex,
          selectedIndex,
          isCorrect,
          timeSpent,
          score,
        },
      })

      await prisma.liveParticipant.update({
        where: { id: participant.id },
        data: { totalScore: { increment: score } },
      })
    }

    socket.emit('answer-received', { success: true })
    console.log(`${socketData.odlsId} respondio pregunta ${questionIndex}: ${isCorrect ? 'correcto' : 'incorrecto'}`)
  })

  // Profesor muestra resultados
  socket.on('teacher:show-results', async ({ sessionId }) => {
    try {
      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: { activity: { include: { questions: { orderBy: { order: 'asc' } } } } },
      })

      if (!session) return

      const roomCode = session.roomCode
      roomManager.showResults(roomCode)

      await prisma.liveSession.update({
        where: { id: sessionId },
        data: { status: 'SHOWING_RESULTS' },
      })

      const stats = roomManager.getQuestionStats(roomCode, session.currentQuestionIndex)
      const leaderboard = roomManager.getLeaderboard(roomCode, session.currentQuestionIndex)
      const correctIndex = session.activity.questions[session.currentQuestionIndex]?.correctIndex || 0

      liveNS.to(roomCode).emit('question-results', {
        stats: stats!,
        leaderboard: leaderboard.slice(0, 10),
        correctIndex,
      })

      console.log(`Mostrando resultados para sala ${roomCode}`)
    } catch (error) {
      console.error('Error al mostrar resultados:', error)
    }
  })

  // Profesor avanza a siguiente pregunta
  socket.on('teacher:next-question', async ({ sessionId }) => {
    try {
      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: { activity: { include: { questions: { orderBy: { order: 'asc' } } } } },
      })

      if (!session) return

      const roomCode = session.roomCode
      const question = roomManager.nextQuestion(roomCode)

      if (!question) {
        socket.emit('error', { message: 'No hay mas preguntas' })
        return
      }

      const newIndex = session.currentQuestionIndex + 1

      await prisma.liveSession.update({
        where: { id: sessionId },
        data: {
          status: 'IN_PROGRESS',
          currentQuestionIndex: newIndex,
          questionStartedAt: new Date(),
        },
      })

      const questionForClients = {
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        options: question.options,
        timeLimit: question.timeLimit,
        questionIndex: newIndex,
      }

      liveNS.to(roomCode).emit('question-started', {
        question: questionForClients,
        questionIndex: newIndex,
        serverTime: Date.now(),
      })

      console.log(`Siguiente pregunta ${newIndex} en sala ${roomCode}`)
    } catch (error) {
      console.error('Error al avanzar pregunta:', error)
    }
  })

  // Profesor termina la sesión
  socket.on('teacher:end-session', async ({ sessionId }) => {
    try {
      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
      })

      if (!session) return

      const roomCode = session.roomCode
      const finalLeaderboard = roomManager.endSession(roomCode)

      await prisma.liveSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })

      liveNS.to(roomCode).emit('session-ended', { finalLeaderboard })

      // Limpiar sala después de un momento
      setTimeout(() => {
        roomManager.deleteRoom(roomCode)
      }, 60000)

      console.log(`Sesion ${roomCode} finalizada`)
    } catch (error) {
      console.error('Error al terminar sesion:', error)
    }
  })

  // Desconexión
  socket.on('disconnect', async () => {
    const socketData = socketRooms.get(socket.id)
    if (socketData && !socketData.isTeacher) {
      roomManager.removeParticipant(socketData.roomCode, socketData.odlsId)
      socket.to(socketData.roomCode).emit('participant-left', { odlsId: socketData.odlsId })

      // Actualizar DB
      try {
        await prisma.liveParticipant.updateMany({
          where: { userId: socketData.odlsId },
          data: { isConnected: false },
        })
      } catch (e) {
        // Ignorar errores de desconexión
      }
    }
    socketRooms.delete(socket.id)
    console.log('Cliente desconectado:', socket.id)
  })
})

const PORT = process.env.WS_PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Servidor WebSocket corriendo en puerto ${PORT}`)
})
