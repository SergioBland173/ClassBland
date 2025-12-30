import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { calculateScore } from '@/lib/utils'
import { z } from 'zod'

const submitAnswerSchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  selectedIndex: z.number().int(),
  timeSpent: z.number().int().min(0),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = submitAnswerSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { attemptId, questionId, selectedIndex, timeSpent } = result.data

    // Verify attempt belongs to user and is not completed
    const attempt = await db.attempt.findFirst({
      where: {
        id: attemptId,
        userId: session.userId,
        completedAt: null,
      },
      include: {
        activity: true,
      },
    })

    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found or already completed' },
        { status: 404 }
      )
    }

    // Get question
    const question = await db.question.findFirst({
      where: {
        id: questionId,
        activityId: attempt.activityId,
      },
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Check if already answered
    const existingAnswer = await db.answer.findUnique({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
    })

    if (existingAnswer) {
      return NextResponse.json(
        { error: 'Question already answered' },
        { status: 409 }
      )
    }

    // Determine if correct
    const isCorrect = selectedIndex === question.correctIndex

    // Calculate score
    const timeLimit = question.timeLimit || attempt.activity.timeLimit
    const score = calculateScore(
      isCorrect,
      timeSpent,
      timeLimit,
      attempt.activity.basePoints
    )

    // Create answer
    const answer = await db.answer.create({
      data: {
        attemptId,
        questionId,
        selectedIndex,
        isCorrect,
        timeSpent,
        score,
      },
    })

    // Update attempt total score
    await db.attempt.update({
      where: { id: attemptId },
      data: {
        totalScore: {
          increment: score,
        },
      },
    })

    return NextResponse.json({
      answer,
      isCorrect,
      score,
      correctIndex: question.correctIndex,
    })
  } catch (error) {
    console.error('Submit answer error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
