'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { autoCloseExpiredAttendanceRows } from '@/lib/attendanceShift'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AttendanceTileProps {
  guardId: string | null
  projectId: string | null
  onDutyStatusChange?: (isOnDuty: boolean) => void
}

type ShiftType = 'DAY' | 'NIGHT'

interface ShiftDecision {
  scheduledShift: ShiftType
  actualShift: ShiftType
  attendanceType: 'NORMAL' | 'OT'
  shiftExceptionReason: string | null
}

export default function AttendanceTile({ guardId, projectId, onDutyStatusChange }: AttendanceTileProps) {
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [isClockOutSubmitting, setIsClockOutSubmitting] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  
  const [capturedImageData, setCapturedImageData] = useState<string | null>(null)
  const [isSuccessState, setIsSuccessState] = useState(false)
  const [showCustomToast, setShowCustomToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('Attendance successfully updated.')
  const [toastColor, setToastColor] = useState('#10b981') // Green for success, Red for signout

  // 🔔 NEW: Custom Modern In-App Sign-Out Confirmation Overlay state
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [pendingShiftDecision, setPendingShiftDecision] = useState<ShiftDecision | null>(null)
  const [activeShiftDecision, setActiveShiftDecision] = useState<ShiftDecision | null>(null)
  
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    onDutyStatusChange?.(isClockedIn)
  }, [isClockedIn, onDutyStatusChange])

  const restoreActiveShift = useCallback(async () => {
    if (!guardId) return null

    const { data, error } = await supabase
      .from('guard_attendance')
      .select('id, clock_in_time, clock_out_time, status, actual_shift')
      .eq('guard_id', guardId)
      .is('clock_out_time', null)
      .order('clock_in_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Failed to restore active attendance session:', error)
      return null
    }

    if (data) {
      const [checkedShift] = await autoCloseExpiredAttendanceRows(supabase, [data])
      if (checkedShift.clock_out_time) {
        setIsClockedIn(false)
        return null
      }

      setIsClockedIn(true)
      return checkedShift
    }

    setIsClockedIn(false)
    return null
  }, [guardId])

  useEffect(() => {
    restoreActiveShift()
    const interval = setInterval(() => {
      restoreActiveShift()
    }, 60000)

    return () => clearInterval(interval)
  }, [restoreActiveShift])

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
    setCameraError(null)
    setCapturedImageData(null)
    setIsSuccessState(false)
    setActiveShiftDecision(null)
  }

  const startCameraStream = async (approvedShiftDecision?: ShiftDecision) => {
    const activeShift = await restoreActiveShift()
    if (activeShift) {
      setToastMessage('You are already clocked in. Sign out before starting a new shift.')
      setToastColor('#10b981')
      setShowCustomToast(true)
      return
    }

    const shiftDecision = approvedShiftDecision || await resolveShiftDecision()
    if (shiftDecision.attendanceType === 'OT' && !approvedShiftDecision) {
      setPendingShiftDecision(shiftDecision)
      return
    }

    setActiveShiftDecision(shiftDecision)
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
    } catch {
      setCameraError("Camera access denied. Please check device application permissions.")
    }
  }

  // SNAPSHOT PHOTO AND WRITE INTEGRATION TO DATABASE
  const handleCaptureSnapshot = async () => {
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

      // Live write operation directly inside database rows
      if (guardId) {
        const activeShift = await restoreActiveShift()
        if (activeShift) {
          setShowCamera(false)
          setCapturedImageData(null)
          setIsSuccessState(false)
          setToastMessage('Existing active shift restored. Sign out before starting a new shift.')
          setToastColor('#10b981')
          setShowCustomToast(true)
          return
        }

        const currentProjectId = await fetchCurrentGuardProjectId()
        const { data: attendanceLog, error: dbError } = await supabase
          .from('guard_attendance')
          .insert([
            {
              guard_id: guardId,
              project_id: currentProjectId || projectId || null,
              selfie_url: base64Data, 
              status: 'CLOCKED_IN',
              scheduled_shift: activeShiftDecision?.scheduledShift || getActualShift(new Date()),
              actual_shift: activeShiftDecision?.actualShift || getActualShift(new Date()),
              attendance_type: activeShiftDecision?.attendanceType || 'NORMAL',
              shift_exception_reason: activeShiftDecision?.shiftExceptionReason || null
            }
          ])
          .select('id, clock_in_time')
          .single()

        if (dbError) {
          console.error("Supabase Log Error:", dbError)
          setCameraError(`Database rejected logs: ${dbError.message}`)
          setIsSuccessState(false)
          return
        }

        if (attendanceLog) {
          setIsClockedIn(true)
        }
      }

      setTimeout(() => {
        setIsClockedIn(true)
        setShowCamera(false)
        setCapturedImageData(null)
        setIsSuccessState(false)
        setActiveShiftDecision(null)
        
        // Present custom green success banner
        setToastMessage('Attendance successfully updated.')
        setToastColor('#10b981')
        setShowCustomToast(true)
      }, 3000)
    }
  }

  // Handle dynamic checkout workflow with clean confirmation UI
  const executeClockOut = async () => {
    if (!guardId) return

    setIsClockOutSubmitting(true)

    try {
      const { data: closedRows, error: updateError } = await supabase
        .from('guard_attendance')
        .update({
          clock_out_time: new Date().toISOString(),
          status: 'CLOCKED_OUT'
        })
        .eq('guard_id', guardId)
        .is('clock_out_time', null)
        .select('id')

      if (updateError) throw updateError
      if (!closedRows || closedRows.length === 0) {
        throw new Error('No active attendance session found to close.')
      }

      setIsClockedIn(false)
      setShowSignOutConfirm(false)

      setToastMessage('Duty shift logged out successfully.')
      setToastColor('#ef4444')
      setShowCustomToast(true)
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to sign out shift.')
      setToastColor('#ef4444')
      setShowCustomToast(true)
    } finally {
      setIsClockOutSubmitting(false)
    }
  }

  useEffect(() => {
    if (showCustomToast) {
      const timer = setTimeout(() => {
        setShowCustomToast(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [showCustomToast])

  const resolveShiftDecision = async (): Promise<ShiftDecision> => {
    const actualShift = getActualShift(new Date())
    let scheduledShift = actualShift

    if (guardId) {
      const { data, error } = await supabase
        .from('guards')
        .select('shift_type')
        .eq('id', guardId)
        .maybeSingle()

      if (!error && data?.shift_type) {
        scheduledShift = normalizeShift(data.shift_type)
      }
    }

    const isOt = scheduledShift !== actualShift
    return {
      scheduledShift,
      actualShift,
      attendanceType: isOt ? 'OT' : 'NORMAL',
      shiftExceptionReason: isOt ? 'OUTSIDE_SCHEDULE' : null
    }
  }

  const fetchCurrentGuardProjectId = async () => {
    if (!guardId) return null

    const { data, error } = await supabase
      .from('guards')
      .select('project_id')
      .eq('id', guardId)
      .maybeSingle()

    if (error) {
      console.error('Failed to load latest guard project assignment:', error)
      return null
    }

    return data?.project_id || null
  }

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* 🔔 APPROVED CUSTOM IN-APP TOAST BANNER */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: showCustomToast ? 'translateY(0) translateX(-50%)' : 'translateY(-100px) translateX(-50%)',
        width: 'calc(100% - 40px)',
        maxWidth: '350px',
        backgroundColor: toastColor,
        borderRadius: '16px',
        padding: '16px 20px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        zIndex: 9999999,
        boxShadow: `0 10px 25px -5px ${toastColor}60`,
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        opacity: showCustomToast ? 1 : 0
      }}>
        <div style={{ width: '24px', height: '24px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#ffffff', fontWeight: 'bold' }}>✓</div>
        <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', letterSpacing: '0.2px' }}>
          {toastMessage}
        </div>
      </div>

      {/* COMPONENT INTERFACE TILE DISPLAY GRID */}
      <div 
        onClick={!isClockedIn ? () => startCameraStream() : undefined}
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
          position: 'relative'
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
            Attendance
          </h3>

          {isClockedIn ? (
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowSignOutConfirm(true); }}
                style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.15)' }}
              >
                Sign-Out Shift
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startCameraStream(); }}
                style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.15)' }}
              >
                Sign-In Shift
              </button>
            </div>
          )}
        </div>
      </div>

      {pendingShiftDecision && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '370px', borderRadius: '24px', padding: '24px', boxSizing: 'border-box', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#fff7ed', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#ea580c', margin: '0 auto 16px auto' }}>!</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '800', color: '#1e293b' }}>Outside Scheduled Shift</h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5', fontWeight: '500' }}>
              Your assigned shift is {getShiftLabel(pendingShiftDecision.scheduledShift)}. The current time belongs to {getShiftLabel(pendingShiftDecision.actualShift)}.
            </p>
            <p style={{ margin: '0 0 24px 0', fontSize: '12px', color: '#92400e', lineHeight: '1.5', fontWeight: '700', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '10px' }}>
              Continue only if this duty is approved as OT.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setPendingShiftDecision(null)} style={{ flex: 1, height: '44px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#475569', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { const decision = pendingShiftDecision; setPendingShiftDecision(null); startCameraStream(decision); }} style={{ flex: 1.4, height: '44px', backgroundColor: '#ea580c', border: 'none', borderRadius: '12px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.2)' }}>Continue as OT</button>
            </div>
          </div>
        </div>
      )}

      {/* 📸 CAMERA FEED POPUP MODAL SCREEN */}
      {showCamera && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '60px 20px 20px 20px', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '390px', borderRadius: '24px', padding: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                RASMSB Attendance Verification
              </h4>
              {!isSuccessState && (
                <button onClick={stopCameraStream} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '270px', backgroundColor: '#0f172a', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
              {cameraError ? (
                <div style={{ color: '#f87171', fontSize: '12px', padding: '20px', textAlign: 'center', fontWeight: '600' }}>⚠️ {cameraError}</div>
              ) : capturedImageData ? (
                <img src={capturedImageData} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
              )}
              {isSuccessState && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', backgroundColor: 'rgba(16, 185, 129, 0.9)', color: 'white', padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                  Processing secure verification frames...
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button onClick={stopCameraStream} disabled={isSuccessState} style={{ flex: 1, height: '46px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#475569', fontSize: '13px', fontWeight: '700', cursor: isSuccessState ? 'not-allowed' : 'pointer' }}>Cancel</button>
              <button onClick={handleCaptureSnapshot} disabled={!!cameraError || isSuccessState} style={{ flex: 2, height: '46px', backgroundColor: (!!cameraError || isSuccessState) ? '#cbd5e1' : '#10b981', border: 'none', borderRadius: '12px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: (!!cameraError || isSuccessState) ? 'not-allowed' : 'pointer' }}>
                {isSuccessState ? 'Verifying Identity...' : 'Snap & Clock In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛑 UPGRADED: HIGH-PREMIUM SIGN OUT CONFIRMATION MODAL CARD */}
      {showSignOutConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '360px', borderRadius: '24px', padding: '24px', boxSizing: 'border-box', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#ef4444', margin: '0 auto 16px auto' }}>🚪</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '800', color: '#1e293b' }}>Confirm Sign-Out</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5', fontWeight: '500' }}>Are you sure you want to end your active duty shift right now? Your cumulative shift timeline tally will be safely locked.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowSignOutConfirm(false)} style={{ flex: 1, height: '44px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#475569', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
              <button onClick={executeClockOut} disabled={isClockOutSubmitting} style={{ flex: 1, height: '44px', backgroundColor: isClockOutSubmitting ? '#fca5a5' : '#ef4444', border: 'none', borderRadius: '12px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: isClockOutSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}>{isClockOutSubmitting ? 'Signing Out...' : 'Sign Out'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function getActualShift(date: Date): ShiftType {
  const minutes = date.getHours() * 60 + date.getMinutes()
  const dayHandoverStart = 7 * 60 + 45
  const nightHandoverStart = 19 * 60 + 45

  if (minutes >= nightHandoverStart || minutes < dayHandoverStart) return 'NIGHT'
  return 'DAY'
}

function normalizeShift(value: string): ShiftType {
  return value.toLowerCase().includes('night') ? 'NIGHT' : 'DAY'
}

function getShiftLabel(shift: ShiftType) {
  return shift === 'NIGHT' ? 'Night Shift (08:00 PM - 08:00 AM)' : 'Day Shift (08:00 AM - 08:00 PM)'
}
