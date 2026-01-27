import 'dotenv/config'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { createHmac, timingSafeEqual } from 'crypto'
import { exec } from 'child_process'
import { roomManager } from './room-manager.js'
import type { ClientToServerEvents, ServerToClientEvents, Participant } from './types.js'

const prisma = new PrismaClient()

// Webhook secret para GitHub (configura en .env)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'cambia-este-secreto-por-uno-seguro'

function verifyGitHubSignature(payload: string, signature: string | undefined): boolean {
  if (!signature) return false
  const hmac = createHmac('sha256', WEBHOOK_SECRET)
  const digest = 'sha256=' + hmac.update(payload).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
  } catch {
    return false
  }
}

function runDeploy() {
  console.log('[Deploy] Iniciando deployment...')

  // Paso 1: git pull
  exec('git pull origin master', { cwd: process.cwd() }, (pullError, pullStdout, pullStderr) => {
    if (pullError) {
      console.error('[Deploy] Error en git pull:', pullError.message)
      console.error('[Deploy] stderr:', pullStderr)
      return
    }
    console.log('[Deploy] Git pull exitoso:', pullStdout)

    // Paso 2: reiniciar con PM2
    exec('pm2 restart classbland-server', { cwd: process.cwd() }, (restartError) => {
      if (restartError) {
        console.error('[Deploy] Error al reiniciar:', restartError.message)
        return
      }
      console.log('[Deploy] Servidor reiniciado con PM2')
    })
  })
}

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Endpoint para webhook de GitHub
  if (req.method === 'POST' && req.url === '/deploy') {
    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => {
      const signature = req.headers['x-hub-signature-256'] as string | undefined

      if (!verifyGitHubSignature(body, signature)) {
        console.log('[Webhook] Firma invalida')
        res.writeHead(401)
        res.end('Unauthorized')
        return
      }

      try {
        const payload = JSON.parse(body)
        if (payload.ref === 'refs/heads/master') {
          console.log('[Webhook] Push detectado en master, iniciando deploy...')
          runDeploy()
          res.writeHead(200)
          res.end('Deploy iniciado')
        } else {
          console.log('[Webhook] Push a otra rama, ignorando:', payload.ref)
          res.writeHead(200)
          res.end('Ignorado - no es master')
        }
      } catch {
        res.writeHead(400)
        res.end('Invalid JSON')
      }
    })
    return
  }

  // Cualquier otra ruta
  res.writeHead(404)
  res.end('Not found')
})

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
            imageUrl: q.imageUrl,
            options: q.options || '[]',
            correctIndex: q.correctIndex || 0,
            correctIndexes: q.correctIndexes,
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
            imageUrl: q.imageUrl,
            options: q.options || '[]',
            correctIndex: q.correctIndex || 0,
            correctIndexes: q.correctIndexes,
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
        imageUrl: question.imageUrl,
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
  socket.on('submit-answer', async ({ roomCode, questionIndex, selectedIndex, timeSpent: rawTimeSpent }) => {
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

    // Validar timeSpent para evitar valores absurdos
    const maxTimeSpent = (question.timeLimit || session.activity.timeLimit || 30) * 1000
    const timeSpent = Math.min(Math.max(0, rawTimeSpent), maxTimeSpent)

    // Parsear correctIndexes con fallback a correctIndex
    let correctIndexes: number[] = []
    if (question.correctIndexes) {
      correctIndexes = JSON.parse(question.correctIndexes)
    } else if (question.correctIndex !== null) {
      correctIndexes = [question.correctIndex]
    }

    const isCorrect = correctIndexes.includes(selectedIndex)
    let score = 0

    if (isCorrect) {
      const timeLimit = maxTimeSpent
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

      // Parsear correctIndexes con fallback a correctIndex
      const currentQuestion = session.activity.questions[session.currentQuestionIndex]
      let correctIndexes: number[] = []
      if (currentQuestion?.correctIndexes) {
        correctIndexes = JSON.parse(currentQuestion.correctIndexes)
      } else if (currentQuestion?.correctIndex !== null && currentQuestion?.correctIndex !== undefined) {
        correctIndexes = [currentQuestion.correctIndex]
      }

      liveNS.to(roomCode).emit('question-results', {
        stats: stats!,
        leaderboard: leaderboard.slice(0, 10),
        correctIndexes,
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
        imageUrl: question.imageUrl,
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
