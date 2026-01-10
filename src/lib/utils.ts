import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function generateRoomCode(): string {
  const chars = '0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function calculateScore(
  isCorrect: boolean,
  timeSpent: number,
  timeLimit: number | null,
  basePoints: number = 100
): number {
  if (!isCorrect) return 0

  if (!timeLimit) return basePoints

  // Score = base * max(0.3, 1 - (time_spent / time_limit))
  const timeFactor = Math.max(0.3, 1 - timeSpent / timeLimit)
  return Math.round(basePoints * timeFactor)
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function isLessonAccessible(startAt: Date, endAt: Date): boolean {
  const now = new Date()
  return now >= startAt && now <= endAt
}
