'use client'
import { useState, useEffect, useRef } from 'react'

export default function AttendanceTile() {
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // ⏰ LIVE DUTY TIMER LOOP TRACKER
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isClockedIn) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
      }, 1000)
    } else {
      setElapsedSeconds(0)
    }
    return () => clearInterval(interval)
  }, [isClockedIn])

  // CLEANUP CAMERA PORTS ON CLOSE
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
    setCameraError(null)
  }

  // 📸 REQUEST NATIVE DEVICE FRONT SELFIE CAMERA PORTAL
  const startCameraStream = async () => {
    setShowCamera(true)
    setCameraError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      })
      streamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err: any) {
      console.error("Camera hardware lock exception:", err)
      setCameraError("Camera access denied or unassigned. Please inspect system app tracking permissions.")
    }
  }

  // 📝 COMMIT TRANSACTIONS AND COMMENCE SHIFT TIMER
  const handleCaptureSnapshot = () => {
    // Note: Future connection integration point for base64 storage snapshots
    setIsClockedIn(true)
    stopCameraStream()
  }

  const handleClockOutSequence = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent reopening camera framework on container click
    if (confirm("Execute terminal sign-out sequence? Shift duration tally will lock.")) {
      setIsClockedIn(false)
    }
  }

  // UTILITY PARSER FOR DUTY TIMER FORMAT
  const formatDutyTally = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      {/* CARD INTERFACES LINK */}
      <div 
        onClick={!isClockedIn ? startCameraStream : undefined}
        style={{ 
          backgroundColor: '#ffffff', 
          border: isClockedIn ? '2px solid #10b981' : '1px solid #e2e8f0', 
          borderRadius: '16px', 
          padding: '24px 12px', 
          textAlign: 'center', 
          cursor: !isClockedIn ? 'pointer' : 'default', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '12px',
          position: 'relative',
          transition: 'border 0.2s ease-in-out'
        }}
      >
        <div style={{ 
          width: '52px', 
          height: '52px', 
          backgroundColor: isClockedIn ? '#ecfdf5' : '#eff6ff', 
          borderRadius: '14px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: '24px', 
          border: isClockedIn ? '1px solid #a7f3d0' : '1px solid #bfdbfe' 
        }}>
          {isClockedIn ? '✅' : '📅'}
        </div>
        
        <div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a' }}>
            {isClockedIn ? 'Clocked In' : 'Attendance'}
          </h3>
          
          {isClockedIn ? (
            <div style={{ marginTop: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981', fontFamily: 'monospace', display: 'block' }}>
                ⏱️ {formatDutyTally(elapsedSeconds)}
              </span>
              <button 
                onClick={handleClockOutSequence}
                style={{ marginTop: '8px', backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Sign-Out Shift
              </button>
            </div>
          ) : (
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.3' }}>
              Sign-In / Sign-Out Duty Shift
            </p>
          )}
        </div>
      </div>

      {/* DYNAMIC CAM MODAL SYSTEM POPUP LAYER OVERLAY */}
      {showCamera && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.85)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '400px', borderRadius: '16px', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#1e3a8a' }}>Biometric Attendance Identity Capture</h4>
              <button onClick={stopCameraStream} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>

            {/* VIDEO CAPTURE FEED AREA */}
            <div style={{ width: '100%', height: '260px', backgroundColor: '#0f172a', borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {cameraError ? (
                <div style={{ color: '#f87171', fontSize: '12px', padding: '20px', textAlign: 'center', fontWeight: '600' }}>⚠️ {cameraError}</div>
              ) : (
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
                />
              )}
            </div>

            {/* LOWER PORT CONTROLS */}
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                onClick={stopCameraStream}
                style={{ flex: 1, height: '44px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCaptureSnapshot}
                disabled={!!cameraError}
                style={{ flex: 2, height: '44px', backgroundColor: !!cameraError ? '#cbd5e1' : '#10b981', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 'bold', cursor: !!cameraError ? 'not-allowed' : 'pointer', boxShadow: !cameraError ? '0 4px 6px -1px rgba(16, 185, 129, 0.2)' : 'none' }}
              >
                Snap Photo & Clock In
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}