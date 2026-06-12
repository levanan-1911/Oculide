'use client'

import { useEffect, useState, useRef } from 'react'
import { Room, Track, RoomEvent } from 'livekit-client'
import { livekitAPI } from '@/utils/api'

interface LiveKitVideoProps {
  roomName: string
  participantName: string
  isPublisher?: boolean
  onError?: (error: Error) => void
}

export default function LiveKitVideo({
  roomName,
  participantName,
  isPublisher = true,
  onError,
}: LiveKitVideoProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const roomRef = useRef<Room | null>(null)

  useEffect(() => {
    let mounted = true
    let room: Room | null = null

    const connectToRoom = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Get token from backend
        const response = await livekitAPI.generateToken({
          room_name: roomName,
          participant_name: participantName,
        })

        const token = response.data.token

        // Create LiveKit room
        room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            facingMode: 'user',
          },
        })

        roomRef.current = room

        // Connect to room
        await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880', token)

        if (!mounted) return

        setIsConnected(true)
        setIsLoading(false)

        // Handle tracks
        room.on(RoomEvent.TrackSubscribed, (track: Track) => {
          if (track.kind === Track.Kind.Video && videoRef.current) {
            const element = track.attach()
            videoRef.current.appendChild(element)
          }
        })

        room.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
          track.detach()
        })

        room.on(RoomEvent.Disconnected, () => {
          if (mounted) {
            setIsConnected(false)
          }
        })

        // Publish tracks if publisher
        if (isPublisher) {
          await room.localParticipant.enableCameraAndMicrophone()
        }
      } catch (err) {
        if (!mounted) return
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to room'
        setError(errorMessage)
        setIsLoading(false)
        onError?.(err instanceof Error ? err : new Error(errorMessage))
      }
    }

    connectToRoom()

    return () => {
      mounted = false
      if (room) {
        room.disconnect()
      }
    }
  }, [roomName, participantName, isPublisher, onError])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 rounded-lg">
        <div className="text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to video...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 rounded-lg">
        <div className="text-white text-center p-4">
          <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
      />
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <p className="text-white">Disconnected</p>
        </div>
      )}
      {isConnected && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
          Live
        </div>
      )}
    </div>
  )
}
