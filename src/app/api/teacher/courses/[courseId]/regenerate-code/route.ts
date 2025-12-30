import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateJoinCode } from '@/lib/utils'

interface Props {
  params: Promise<{ courseId: string }>
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { courseId } = await params
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const course = await db.course.findFirst({
      where: { id: courseId, teacherId: session.userId },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Generate unique join code
    let joinCode = generateJoinCode()
    let attempts = 0
    while (attempts < 10) {
      const existing = await db.course.findUnique({ where: { joinCode } })
      if (!existing) break
      joinCode = generateJoinCode()
      attempts++
    }

    const updated = await db.course.update({
      where: { id: courseId },
      data: { joinCode },
    })

    return NextResponse.json({ joinCode: updated.joinCode })
  } catch (error) {
    console.error('Regenerate code error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
