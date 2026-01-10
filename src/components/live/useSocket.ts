'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  namespace?: string
  autoConnect?: boolean
}

export function useSocket(options: UseSocketOptions = {}) {
  const { namespace = '/live', autoConnect = true } = options
  const socketRef = useRef<Socket | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!autoConnect) return

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'

    const newSocket = io(`${socketUrl}${namespace}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setIsConnected(true)
      setError(null)
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
    })

    newSocket.on('connect_error', (err) => {
      setError(err.message)
      setIsConnected(false)
    })

    newSocket.on('error', (data: { message: string }) => {
      setError(data.message)
    })

    return () => {
      newSocket.disconnect()
      socketRef.current = null
      setSocket(null)
    }
  }, [namespace, autoConnect])

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler)
    return () => {
      socketRef.current?.off(event, handler)
    }
  }, [])

  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    if (handler) {
      socketRef.current?.off(event, handler)
    } else {
      socketRef.current?.removeAllListeners(event)
    }
  }, [])

  return {
    socket,
    isConnected,
    error,
    emit,
    on,
    off,
  }
}
