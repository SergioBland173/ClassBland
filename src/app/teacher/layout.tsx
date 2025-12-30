import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TeacherNav } from '@/components/teacher-nav'

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session || session.role !== 'TEACHER') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <TeacherNav user={session} />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
