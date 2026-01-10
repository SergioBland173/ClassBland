'use client'

import { cn } from '@/lib/utils'
import { Trophy, Medal, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LeaderboardEntry {
  odlsId?: string
  odlsIdname?: string
  nickname?: string
  totalScore: number
  lastAnswerCorrect?: boolean
  lastAnswerScore?: number
  position: number
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  currentUserId?: string
  limit?: number
  showLastAnswer?: boolean
  className?: string
}

export function Leaderboard({
  entries,
  currentUserId,
  limit = 10,
  showLastAnswer = false,
  className,
}: LeaderboardProps) {
  const displayEntries = entries.slice(0, limit)

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">
            {position}
          </span>
        )
    }
  }

  const getPositionBg = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/20'
      case 2:
        return 'bg-gray-500/10 border-gray-500/20'
      case 3:
        return 'bg-amber-600/10 border-amber-600/20'
      default:
        return ''
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Clasificacion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aun no hay puntuaciones
          </p>
        ) : (
          displayEntries.map((entry) => {
            const odlsId = entry.odlsId
            const nickname = entry.odlsIdname || entry.nickname || 'Anonimo'
            const isCurrentUser = odlsId === currentUserId

            return (
              <div
                key={odlsId || entry.position}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg border transition-colors',
                  getPositionBg(entry.position),
                  isCurrentUser && 'ring-2 ring-primary'
                )}
              >
                {getPositionIcon(entry.position)}

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'font-medium truncate',
                      isCurrentUser && 'text-primary'
                    )}
                  >
                    {nickname}
                    {isCurrentUser && ' (Tu)'}
                  </p>
                  {showLastAnswer && entry.lastAnswerScore !== undefined && (
                    <p
                      className={cn(
                        'text-xs',
                        entry.lastAnswerCorrect
                          ? 'text-green-500'
                          : 'text-red-500'
                      )}
                    >
                      {entry.lastAnswerCorrect
                        ? `+${entry.lastAnswerScore} pts`
                        : 'Incorrecto'}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-bold text-lg tabular-nums">
                    {entry.totalScore.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">pts</p>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
