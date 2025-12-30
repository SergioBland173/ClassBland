import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { QuizRunner } from '@/components/quiz-runner'
import { QuizResults } from '@/components/quiz-results'
import { isLessonAccessible } from '@/lib/utils'

interface Props {
  params: Promise<{ courseId: string; lessonId: string; activityId: string }>
}

export default async function StudentActivityPage({ params }: Props) {
  const { courseId, lessonId, activityId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  // Verify enrollment
  const enrollment = await db.enrollment.findFirst({
    where: {
      userId: session.userId,
      courseId,
    },
  })

  if (!enrollment) notFound()

  // Get activity with questions
  const activity = await db.activity.findFirst({
    where: {
      id: activityId,
      lessonId,
      lesson: { courseId },
    },
    include: {
      lesson: {
        include: { course: true },
      },
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!activity) notFound()

  // Check if lesson is accessible
  if (!isLessonAccessible(activity.lesson.startAt, activity.lesson.endAt)) {
    redirect(`/student/courses/${courseId}`)
  }

  // Check for existing completed attempt
  const existingAttempt = await db.attempt.findFirst({
    where: {
      userId: session.userId,
      activityId,
      completedAt: { not: null },
    },
    include: {
      answers: {
        include: {
          question: true,
        },
        orderBy: {
          question: { order: 'asc' },
        },
      },
    },
    orderBy: { completedAt: 'desc' },
  })

  // If completed, show results
  if (existingAttempt) {
    return (
      <QuizResults
        attempt={existingAttempt}
        activity={activity}
        courseId={courseId}
        lessonId={lessonId}
      />
    )
  }

  // Prepare questions for quiz (hide correct answers)
  const quizQuestions = activity.questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options ? JSON.parse(q.options as string) : [],
    timeLimit: q.timeLimit,
  }))

  return (
    <QuizRunner
      activityId={activity.id}
      activityTitle={activity.title}
      questions={quizQuestions}
      activityTimeLimit={activity.timeLimit}
      basePoints={activity.basePoints}
      courseId={courseId}
      lessonId={lessonId}
    />
  )
}
