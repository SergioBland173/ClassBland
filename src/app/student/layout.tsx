import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { StudentNav } from '@/components/student-nav'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session || session.role !== 'STUDENT') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentNav user={session} />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
