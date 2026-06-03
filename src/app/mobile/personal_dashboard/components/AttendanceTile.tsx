'use client'
import { useState, useEffect, useRef } from 'react'

export default function AttendanceTile() {
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  
  const [capturedImageData, setCapturedImageData] = useState<string | null>(null)
  const [isSuccessState, setIsSuccessState] = useState(false)
  
  // 🔔 NEW: Elegant custom in-app notification banner state
  const [showCustomToast, setShowCustomToast] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

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

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
    setCameraError(null)
    setCapturedImageData(null)
    setIsSuccessState(false)
  }

  const startCameraStream = async () => {
    setShowCamera(true)
    setCameraError(null)
    setCapturedImageData(null)
    setIsSuccessState(false)
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
      setCameraError("Camera access denied or unassigned. Please check application settings permissions.")
    }
  }

  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (context) {
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const base64Data = canvas.toDataURL('image/jpeg')
      setCapturedImageData(base64Data)
      setIsSuccessState(true)

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // 📝 RE-ENGINEERED: Trigger beautiful dynamic custom notification banner instead of old alert()
      setTimeout(() => {
        setIsClockedIn(true)
        setShowCamera(false)
        setCapturedImageData(null)
        setIsSuccessState(false)
        
        // Open custom toast banner dynamically
        setShowCustomToast(true)
      }, 3000)
    }
  }

  // Auto-dismiss the custom toast banner after 4 seconds
  useEffect(() => {
    if (showCustomToast) {
      const timer = setTimeout(() => {
        setShowCustomToast(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [showCustomToast])

  const handleClockOutSequence = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Execute terminal sign-out sequence? Shift duration tally will lock.")) {
      setIsClockedIn(false)
    }
  }

  const formatDutyTally = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* 🔥 NEW: PREMIUM CUSTOM TOAST NOTIFICATION LAYER */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: showCustomToast ? 'translateY(0) translateX(-50%)' : 'translateY(-100px) translateX(-50%)',
        width: 'calc(100% - 40px)',
        maxWidth: '350px',
        backgroundColor: '#10b981',
        borderRadius: '16px',
        padding: '16px 20px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        zIndex: 9999999,
        boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4), 0 8px 10px -6px rgba(16, 185, 129, 0.2)',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        opacity: showCustomToast ? 1 : 0
      }}>
        <div style={{ width: '28px', height: '28px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: '#ffffff', fontWeight: 'bold' }}>✓</div>
        <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', letterSpacing: '0.2px' }}>
          Attendance successfully updated.
        </div>
      </div>

      {/* COMPONENT INTERFACE TILES */}
      <div 
        onClick={!isClockedIn ? startCameraStream : undefined}
        style={{ 
          backgroundColor: '#ffffff', 
          border: isClockedIn ? '2px solid #10b981' : '1px solid #eef2f6', 
          borderRadius: '20px', 
          padding: '24px 12px', 
          textAlign: 'center', 
          cursor: !isClockedIn ? 'pointer' : 'default', 
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '14px',
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
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e3a8a' }}>
            {isClockedIn ? 'Clocked In' : 'Attendance'}
          </h3>
          
          {isClockedIn ? (
            <div style={{ marginTop: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', fontFamily: 'monospace', display: 'block' }}>
                ⏱️ {formatDutyTally(elapsedSeconds)}
              </span>
              <button 
                onClick={handleClockOutSequence}
                style={{ marginTop: '8px', backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Sign-Out Shift
              </button>
            </div>
          ) : (
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '500', lineHeight: '1.3' }}>
              Sign-In Shift
            </p>
          )}
        </div>
      </div>

      {/* DYNAMIC CAM MODAL SYSTEM POPUP LAYER OVERLAY */}
      {showCamera && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          backgroundColor: 'rgba(15, 23, 42, 0.75)', 
          backdropFilter: 'blur(4px)',
          zIndex: 99999, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'flex-start', 
          padding: '60px 20px 20px 20px', 
          boxSizing: 'border-box', 
          fontFamily: 'system-ui, -apple-system, sans-serif' 
        }}>
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '390px', borderRadius: '24px', padding: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                RASMSB Attendance Verification
              </h4>
              {!isSuccessState && (
                <button onClick={stopCameraStream} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '270px', backgroundColor: '#0f172a', borderRadius: '16px', overflow: 'hidden', position: 'relative', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
              {cameraError ? (
                <div style={{ color: '#f87171', fontSize: '12px', padding: '20px', textAlign: 'center', fontWeight: '600' }}>⚠️ {cameraError}</div>
              ) : capturedImageData ? (
                <img 
                  src={capturedImageData} 
                  alt="Captured Selfie" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
                />
              )}

              {isSuccessState && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', backgroundColor: 'rgba(16, 185, 129, 0.9)', color: 'white', padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                  Processing secure verification frames...
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                onClick={stopCameraStream}
                disabled={isSuccessState}
                style={{ flex: 1, height: '46px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#475569', fontSize: '13px', fontWeight: '700', cursor: isSuccessState ? 'not-allowed' : 'pointer', opacity: isSuccessState ? 0.5 : 1 }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCaptureSnapshot}
                disabled={!!cameraError || isSuccessState}
                style={{ flex: 2, height: '46px', backgroundColor: (!!cameraError || isSuccessState) ? '#cbd5e1' : '#10b981', border: 'none', borderRadius: '12px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: (!!cameraError || isSuccessState) ? 'not-allowed' : 'pointer', boxShadow: (!cameraError && !isSuccessState) ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none' }}
              >
                {isSuccessState ? 'Verifying Identity...' : 'Snap & Clock In'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}