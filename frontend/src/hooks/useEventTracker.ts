'use client'

import { useEffect, useRef, useCallback } from 'react'
import { sessionsAPI, livekitAPI } from '@/utils/api'

interface ViolationEvent {
  type: 'tab_switch' | 'copy_paste' | 'fullscreen_exit'
  severity: 'low' | 'medium' | 'high'
  description: string
}

interface UseEventTrackerProps {
  sessionId: number
  roomId: number
  enabled: boolean
  onViolation?: (event: ViolationEvent) => void
}

export function useEventTracker({
  sessionId,
  roomId,
  enabled,
  onViolation,
}: UseEventTrackerProps) {
  const violationCountRef = useRef(0)
  const lastViolationTimeRef = useRef<number>(0)
  const snapshotIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Report violation to backend
  const reportViolation = useCallback(
    async (event: ViolationEvent) => {
      if (!enabled) return

      const now = Date.now()
      // Debounce violations (max 1 per second)
      if (now - lastViolationTimeRef.current < 1000) {
        return
      }
      lastViolationTimeRef.current = now

      violationCountRef.current++

      // Call callback
      onViolation?.(event)

      try {
        // Report to backend (this would need a new API endpoint)
        // For now, we'll log it
        console.log('Violation detected:', event)
      } catch (error) {
        console.error('Failed to report violation:', error)
      }
    },
    [enabled, onViolation]
  )

  // Page Visibility Tracker
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation({
          type: 'tab_switch',
          severity: 'high',
          description: 'Student switched tabs or minimized the window',
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, reportViolation])

  // Copy-Paste Prevention
  useEffect(() => {
    if (!enabled) return

    const preventCopyPaste = (e: Event) => {
      e.preventDefault()
      reportViolation({
        type: 'copy_paste',
        severity: 'medium',
        description: 'Student attempted to copy or paste',
      })
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
      if (
        (e.ctrlKey || e.metaKey) &&
        ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault()
        reportViolation({
          type: 'copy_paste',
          severity: 'medium',
          description: 'Student attempted keyboard shortcut for copy/paste',
        })
      }
    }

    // Prevent context menu
    const handleContextMenu = (e: Event) => {
      e.preventDefault()
    }

    document.addEventListener('copy', preventCopyPaste)
    document.addEventListener('paste', preventCopyPaste)
    document.addEventListener('cut', preventCopyPaste)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('copy', preventCopyPaste)
      document.removeEventListener('paste', preventCopyPaste)
      document.removeEventListener('cut', preventCopyPaste)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, reportViolation])

  // Fullscreen Tracker
  useEffect(() => {
    if (!enabled) return

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        reportViolation({
          type: 'fullscreen_exit',
          severity: 'high',
          description: 'Student exited fullscreen mode',
        })
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [enabled, reportViolation])

  // Webcam Snapshot (placeholder - would need actual implementation)
  const startSnapshotCapture = useCallback(() => {
    if (!enabled) return

    // Capture snapshot every 5 seconds
    snapshotIntervalRef.current = setInterval(() => {
      // This would capture from LiveKit video stream
      console.log('Capturing webcam snapshot...')
    }, 5000)
  }, [enabled])

  const stopSnapshotCapture = useCallback(() => {
    if (snapshotIntervalRef.current) {
      clearInterval(snapshotIntervalRef.current)
      snapshotIntervalRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSnapshotCapture()
    }
  }, [stopSnapshotCapture])

  return {
    violationCount: violationCountRef.current,
    startSnapshotCapture,
    stopSnapshotCapture,
  }
}
