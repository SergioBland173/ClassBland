'use client'

import { cn } from '@/lib/utils'
import { Users, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Participant {
  id: string
  nickname: string
  totalScore: number
  isConnected: boolean
}

interface ParticipantsListProps {
  participants: Participant[]
  className?: string
}

export function ParticipantsList({ participants, className }: ParticipantsListProps) {
  const connected = participants.filter((p) => p.isConnected).length
  const total = participants.length

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Participantes
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {connected}/{total} conectados
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {participants.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Esperando participantes...
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                  participant.isConnected
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {participant.isConnected ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                <span className="truncate max-w-[120px]">{participant.nickname}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
