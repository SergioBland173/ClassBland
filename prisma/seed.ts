import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const teacherEmail = process.env.SEED_TEACHER_EMAIL || 'teacher@classbland.local'
  const teacherPassword = process.env.SEED_TEACHER_PASSWORD || 'Teacher123!'
  const studentEmail = process.env.SEED_STUDENT_EMAIL || 'student@classbland.local'
  const studentPassword = process.env.SEED_STUDENT_PASSWORD || 'Student123!'

  // Create teacher
  const teacherHash = await bcrypt.hash(teacherPassword, 12)
  const teacher = await prisma.user.upsert({
    where: { email: teacherEmail },
    update: {},
    create: {
      email: teacherEmail,
      displayName: 'Prof. Demo',
      passwordHash: teacherHash,
      role: 'TEACHER',
    },
  })
  console.log(`✅ Teacher created: ${teacher.email}`)

  // Create student
  const studentHash = await bcrypt.hash(studentPassword, 12)
  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    update: {},
    create: {
      email: studentEmail,
      displayName: 'Estudiante Demo',
      passwordHash: studentHash,
      role: 'STUDENT',
    },
  })
  console.log(`✅ Student created: ${student.email}`)

  // Create a demo course
  const course = await prisma.course.upsert({
    where: { joinCode: 'DEMO2024' },
    update: {},
    create: {
      name: 'Matemáticas Básicas',
      description: 'Curso de demostración para ClassBland',
      joinCode: 'DEMO2024',
      teacherId: teacher.id,
    },
  })
  console.log(`✅ Course created: ${course.name} (code: ${course.joinCode})`)

  // Enroll student in course
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: student.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      userId: student.id,
      courseId: course.id,
    },
  })
  console.log(`✅ Student enrolled in course`)

  // Create a demo lesson (active now)
  const now = new Date()
  const startAt = new Date(now.getTime() - 1000 * 60 * 60) // 1 hour ago
  const endAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7) // 1 week from now

  const lesson = await prisma.lesson.upsert({
    where: { id: 'demo-lesson-1' },
    update: {},
    create: {
      id: 'demo-lesson-1',
      title: 'Introducción a los números',
      content: 'En esta clase aprenderemos los conceptos básicos de los números naturales.',
      startAt,
      endAt,
      courseId: course.id,
      order: 1,
    },
  })
  console.log(`✅ Lesson created: ${lesson.title}`)

  // Create demo activity
  const activity = await prisma.activity.upsert({
    where: { id: 'demo-activity-1' },
    update: {},
    create: {
      id: 'demo-activity-1',
      title: 'Quiz: Números Naturales',
      timeLimit: 300, // 5 minutes
      basePoints: 100,
      lessonId: lesson.id,
      order: 1,
    },
  })
  console.log(`✅ Activity created: ${activity.title}`)

  // Create demo questions
  const questions = [
    {
      id: 'demo-q-1',
      prompt: '¿Cuánto es 2 + 2?',
      options: JSON.stringify(['3', '4', '5', '6']),
      correctIndex: 1,
      timeLimit: 30,
      order: 1,
    },
    {
      id: 'demo-q-2',
      prompt: '¿Cuál es el número más grande?',
      options: JSON.stringify(['10', '5', '15', '8']),
      correctIndex: 2,
      timeLimit: 20,
      order: 2,
    },
    {
      id: 'demo-q-3',
      prompt: '¿Cuánto es 10 - 3?',
      options: JSON.stringify(['5', '6', '7', '8']),
      correctIndex: 2,
      timeLimit: 25,
      order: 3,
    },
  ]

  for (const q of questions) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        prompt: q.prompt,
        options: q.options,
        correctIndex: q.correctIndex,
        timeLimit: q.timeLimit,
        order: q.order,
        activityId: activity.id,
      },
    })
  }
  console.log(`✅ ${questions.length} questions created`)

  console.log('\n🎉 Seed completed!')
  console.log('\n📋 Test accounts:')
  console.log(`   Teacher: ${teacherEmail} / ${teacherPassword}`)
  console.log(`   Student: ${studentEmail} / ${studentPassword}`)
  console.log(`   Demo course code: DEMO2024`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
