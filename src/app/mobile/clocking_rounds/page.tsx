'use client'

import { Suspense, useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

interface MasterCheckpoint {
  id: number
  name: string
  project_slug: string
}

interface PatrolRound {
  id: number
  guard: string
  date: string
  start_time: string
  end_time: string | null
  duration: string | null
  completed_points: number | null
  total_points: number | null
  missed_points: number | null
  project_slug: string
  status: string | null
}

interface ScannedCheckpoint {
  id: number
  name: string
  time: string
  image_url?: string | null
}

interface ParsedQrPayload {
  projectSlug: string
  checkpointId: number
}

interface ScanNotice {
  title: string
  body: string
  kind: 'success' | 'warning' | 'error'
  nextAction: 'scan' | 'close'
}

declare global {
  interface Window {
    BarcodeDetector?: any
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function MobileClockingRoundsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project_id')
  const guardId = searchParams.get('guard_id')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanLoopRef = useRef<number | null>(null)
  const lastScanValueRef = useRef('')
  const activeRoundRef = useRef<PatrolRound | null>(null)
  const scannedCheckpointsRef = useRef<ScannedCheckpoint[]>([])
  const scannedNameLocksRef = useRef<Set<string>>(new Set())
  const isHandlingScanRef = useRef(false)
  const completionRedirectRef = useRef<number | null>(null)

  const [projectName, setProjectName] = useState('Clocking Round')
  const [projectSlug, setProjectSlug] = useState('')
  const [guardName, setGuardName] = useState('Security Officer')
  const [masterCheckpoints, setMasterCheckpoints] = useState<MasterCheckpoint[]>([])
  const [activeRound, setActiveRound] = useState<PatrolRound | null>(null)
  const [scannedCheckpoints, setScannedCheckpoints] = useState<ScannedCheckpoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isRoundFinished, setIsRoundFinished] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [scanNotice, setScanNotice] = useState<ScanNotice | null>(null)
  const [completionNotice, setCompletionNotice] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      window.cancelAnimationFrame(scanLoopRef.current)
      scanLoopRef.current = null
    }

    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setIsScanning(false)
  }, [])

  const goBack = useCallback(() => {
    const params = new URLSearchParams()
    if (projectId) params.set('project_id', projectId)
    if (guardId) params.set('guard_id', guardId)
    router.push(`/mobile/personal_dashboard?${params.toString()}`)
  }, [guardId, projectId, router])

  const fetchScannedCheckpoints = useCallback(async (roundId: number) => {
    const { data, error } = await supabase
      .from('clocking_checkpoints')
      .select('id, name, time, image_url')
      .eq('clocking_round_id', roundId)
      .order('id', { ascending: true })

    if (error) {
      const fallback = await supabase
        .from('clocking_checkpoints')
        .select('id, name, time, image_url')
        .eq('round_id', roundId)
        .order('id', { ascending: true })

      if (fallback.error) {
        setScannedCheckpoints([])
        scannedCheckpointsRef.current = []
        scannedNameLocksRef.current = new Set()
        return
      }
      const fallbackScans = (fallback.data || []) as ScannedCheckpoint[]
      setScannedCheckpoints(fallbackScans)
      scannedCheckpointsRef.current = fallbackScans
      scannedNameLocksRef.current = new Set(fallbackScans.map(scan => scan.name))
      return
    }

    const scans = (data || []) as ScannedCheckpoint[]
    setScannedCheckpoints(scans)
    scannedCheckpointsRef.current = scans
    scannedNameLocksRef.current = new Set(scans.map(scan => scan.name))
  }, [])

  const fetchClockingSetup = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    setIsRoundFinished(false)

    try {
      if (!projectId || !guardId) {
        setErrorMessage('Missing guard or project session. Please log in again.')
        return
      }

      const [{ data: projectData, error: projectError }, { data: guardData, error: guardError }] = await Promise.all([
        supabase.from('projects').select('name, slug').eq('id', projectId).maybeSingle(),
        supabase.from('guards').select('name').eq('id', guardId).maybeSingle()
      ])

      if (projectError) throw projectError
      if (guardError) throw guardError

      const resolvedSlug = projectData?.slug || ''
      const resolvedGuardName = guardData?.name || 'Security Officer'
      setProjectName(projectData?.name || 'Clocking Round')
      setProjectSlug(resolvedSlug)
      setGuardName(resolvedGuardName)

      if (!resolvedSlug) {
        setErrorMessage('This project does not have a site slug configured.')
        return
      }

      const { data: checkpointData, error: checkpointError } = await supabase
        .from('clocking_master_checkpoints')
        .select('id, name, project_slug')
        .eq('project_slug', resolvedSlug)
        .order('created_at', { ascending: true })

      if (checkpointError) throw checkpointError
      setMasterCheckpoints((checkpointData || []) as MasterCheckpoint[])

      const { data: roundData, error: roundError } = await supabase
        .from('clocking_rounds')
        .select('id, guard, date, start_time, end_time, duration, completed_points, total_points, missed_points, project_slug, status')
        .eq('project_slug', resolvedSlug)
        .eq('guard', resolvedGuardName)
        .eq('status', 'in_progress')
        .order('id', { ascending: false })
        .limit(1)

      if (roundError) throw roundError

      const existingRound = (roundData?.[0] || null) as PatrolRound | null
      setActiveRound(existingRound)

      if (existingRound) {
        await fetchScannedCheckpoints(existingRound.id)
      } else {
        setScannedCheckpoints([])
        scannedCheckpointsRef.current = []
        scannedNameLocksRef.current = new Set()
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load clocking setup.')
    } finally {
      setIsLoading(false)
    }
  }, [fetchScannedCheckpoints, guardId, projectId])

  useEffect(() => {
    fetchClockingSetup()
    return () => {
      stopCamera()
      if (completionRedirectRef.current) {
        window.clearTimeout(completionRedirectRef.current)
      }
    }
  }, [fetchClockingSetup, stopCamera])

  useEffect(() => {
    activeRoundRef.current = activeRound
  }, [activeRound])

  useEffect(() => {
    scannedCheckpointsRef.current = scannedCheckpoints
  }, [scannedCheckpoints])

  const handleSecureLogout = () => {
    stopCamera()
    sessionStorage.clear()
    localStorage.removeItem('active_guard_id')
    localStorage.removeItem('ras_project_title')
    router.replace('/mobile')
  }

  const startRound = async () => {
    if (!projectSlug) return
    if (masterCheckpoints.length === 0) {
      setErrorMessage('No checkpoints configured for this site yet.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setMessage(null)

    try {
      const now = new Date()
      const { data, error } = await supabase
        .from('clocking_rounds')
        .insert({
          guard: guardName,
          date: toInputDate(now),
          start_time: formatClockTime(now),
          end_time: '-- : --',
          duration: 'In Progress...',
          completed_points: 0,
          total_points: masterCheckpoints.length,
          missed_points: masterCheckpoints.length,
          project_slug: projectSlug,
          status: 'in_progress'
        })
        .select('id, guard, date, start_time, end_time, duration, completed_points, total_points, missed_points, project_slug, status')
        .single()

      if (error) throw error
      const startedRound = data as PatrolRound
      activeRoundRef.current = startedRound
      setActiveRound(startedRound)
      setScannedCheckpoints([])
      scannedCheckpointsRef.current = []
      scannedNameLocksRef.current = new Set()
      setMessage('Patrol round started. Scan the first checkpoint QR.')
      await startCamera(startedRound)
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not start patrol round.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const completeRound = async () => {
    if (!activeRound) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setMessage(null)

    try {
      const now = new Date()
      const startDate = parseRoundStart(activeRound.date, activeRound.start_time)
      const completed = scannedCheckpoints.length
      const missed = Math.max(0, masterCheckpoints.length - completed)

      const { error } = await supabase
        .from('clocking_rounds')
        .update({
          end_time: formatClockTime(now),
          duration: formatDuration(startDate, now),
          completed_points: completed,
          total_points: masterCheckpoints.length,
          missed_points: missed,
          status: 'completed'
        })
        .eq('id', activeRound.id)

      if (error) throw error

      stopCamera()
      setIsScannerOpen(false)
      setActiveRound(null)
      activeRoundRef.current = null
      setIsRoundFinished(true)
      setScanNotice(null)
      setCompletionNotice(true)
      setMessage(null)
      if (completionRedirectRef.current) {
        window.clearTimeout(completionRedirectRef.current)
      }
      completionRedirectRef.current = window.setTimeout(() => {
        setCompletionNotice(false)
        goBack()
      }, 6000)
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not complete patrol round.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const startCamera = async (roundOverride?: PatrolRound) => {
    setCameraError(null)
    setMessage(null)

    const roundToScan = roundOverride || activeRoundRef.current

    if (!roundToScan) {
      setErrorMessage('Start a patrol round before scanning QR codes.')
      return
    }

    setIsScannerOpen(true)

    if (!('BarcodeDetector' in window)) {
      setCameraError('QR scanner is not supported on this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      })
      streamRef.current = stream
      const videoElement = await waitForVideoElement(videoRef)
      videoElement.srcObject = stream
      await videoElement.play()
      setIsScanning(true)
      runScanLoop()
    } catch (err: any) {
      setCameraError(err.message || 'Camera permission was blocked.')
    }
  }

  const runScanLoop = async () => {
    if (!videoRef.current || !canvasRef.current || !window.BarcodeDetector) return

    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    const scan = async () => {
      if (!videoRef.current || !context || !activeRoundRef.current) return

      if (!isHandlingScanRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

        try {
          const codes = await detector.detect(canvas)
          const rawValue = codes?.[0]?.rawValue
          if (rawValue && rawValue !== lastScanValueRef.current) {
            lastScanValueRef.current = rawValue
            await handleQrPayload(rawValue)
            setTimeout(() => {
              lastScanValueRef.current = ''
            }, 1800)
          }
        } catch {
          // Keep scanning; detector failures are common on low-light frames.
        }
      }

      scanLoopRef.current = window.requestAnimationFrame(scan)
    }

    scanLoopRef.current = window.requestAnimationFrame(scan)
  }

  function closeScanner() {
    stopCamera()
    setIsScannerOpen(false)
  }

  async function handleScanNoticeOk() {
    const notice = scanNotice
    setScanNotice(null)

    if (!notice) return
    if (notice.nextAction === 'scan' && activeRoundRef.current) {
      await startCamera()
    } else {
      setIsScannerOpen(false)
    }
  }

  const handleQrPayload = async (rawValue: string) => {
    if (isHandlingScanRef.current) return
    isHandlingScanRef.current = true
    stopCamera()

    const currentRound = activeRoundRef.current
    if (!currentRound) {
      isHandlingScanRef.current = false
      return
    }
    setErrorMessage(null)
    setMessage(null)

    const parsed = parseQrPayload(rawValue)
    if (!parsed) {
      showScanNotice('Invalid QR Code', 'This QR code is not a valid RASMSB checkpoint.', 'error', 'scan')
      isHandlingScanRef.current = false
      return
    }

    if (parsed.projectSlug !== projectSlug) {
      showScanNotice('Wrong Site QR', 'This checkpoint belongs to another site.', 'error', 'scan')
      isHandlingScanRef.current = false
      return
    }

    const checkpoint = masterCheckpoints.find(point => point.id === parsed.checkpointId)
    if (!checkpoint) {
      showScanNotice('Unknown Checkpoint', 'Checkpoint is not registered under this site.', 'error', 'scan')
      isHandlingScanRef.current = false
      return
    }

    const currentScans = scannedCheckpointsRef.current
    const expectedCheckpoint = masterCheckpoints[currentScans.length]

    if (expectedCheckpoint && checkpoint.id !== expectedCheckpoint.id) {
      showScanNotice(
        'QR Point Mistake',
        `Please scan point ${currentScans.length + 1}: ${expectedCheckpoint.name}.`,
        'warning',
        'scan'
      )
      isHandlingScanRef.current = false
      return
    }

    if (currentScans.some(point => point.name === checkpoint.name) || scannedNameLocksRef.current.has(checkpoint.name)) {
      showScanNotice('Already Scanned', `${checkpoint.name} has already been scanned for this round.`, 'warning', 'scan')
      isHandlingScanRef.current = false
      return
    }

    scannedNameLocksRef.current.add(checkpoint.name)
    setIsSubmitting(true)
    try {
      const time = formatClockTime(new Date())
      const alreadySaved = await checkpointExistsForRound(currentRound.id, checkpoint.name)
      if (alreadySaved) {
        const syncedScans = [...scannedCheckpointsRef.current, { id: checkpoint.id, name: checkpoint.name, time }]
        scannedCheckpointsRef.current = syncedScans
        setScannedCheckpoints(syncedScans)
        showScanNotice('Already Scanned', `${checkpoint.name} was already saved for this round.`, 'warning', nextScanAction(syncedScans.length))
        return
      }

      const insertedCheckpoint = await insertCheckpointWithFallback(currentRound.id, checkpoint.name, time)
      const nextScans = [...scannedCheckpointsRef.current, insertedCheckpoint]

      scannedCheckpointsRef.current = nextScans
      setScannedCheckpoints(nextScans)
      showScanNotice(
        'Scan Successful',
        nextScans.length >= masterCheckpoints.length
          ? `${checkpoint.name} completed. All checkpoints have been scanned.`
          : `${checkpoint.name} completed. Tap OK to scan checkpoint ${nextScans.length + 1} of ${masterCheckpoints.length}.`,
        'success',
        nextScanAction(nextScans.length)
      )

      await supabase
        .from('clocking_rounds')
        .update({
          completed_points: nextScans.length,
          total_points: masterCheckpoints.length,
          missed_points: Math.max(0, masterCheckpoints.length - nextScans.length)
        })
        .eq('id', currentRound.id)
    } catch (err: any) {
      scannedNameLocksRef.current.delete(checkpoint.name)
      showScanNotice('Scan Not Saved', err.message || 'Could not save checkpoint scan.', 'error', 'scan')
    } finally {
      setIsSubmitting(false)
      isHandlingScanRef.current = false
    }
  }

  function showScanNotice(title: string, body: string, kind: ScanNotice['kind'], nextAction: ScanNotice['nextAction']) {
    setScanNotice({ title, body, kind, nextAction })
    setIsScannerOpen(true)
  }

  function nextScanAction(scanCount: number): ScanNotice['nextAction'] {
    return scanCount >= masterCheckpoints.length ? 'close' : 'scan'
  }

  const checkpointExistsForRound = async (roundId: number, name: string) => {
    const candidateKeys = ['clocking_round_id', 'round_id', 'clocking_rounds_id']

    for (const key of candidateKeys) {
      const { data, error } = await supabase
        .from('clocking_checkpoints')
        .select('id')
        .eq(key, roundId)
        .eq('name', name)
        .limit(1)

      if (!error && data && data.length > 0) return true
      if (!error) return false
    }

    return false
  }

  const insertCheckpointWithFallback = async (roundId: number, name: string, time: string) => {
    const basePayload = {
      name,
      time,
      image_url: null
    }

    const candidateKeys = ['clocking_round_id', 'round_id', 'clocking_rounds_id']

    for (const key of candidateKeys) {
      const { data, error } = await supabase
        .from('clocking_checkpoints')
        .insert({ ...basePayload, [key]: roundId })
        .select('id, name, time, image_url')
        .single()

      if (!error && data) return data as ScannedCheckpoint
    }

    throw new Error('Checkpoint table is missing a recognized round link column.')
  }

  const scannedIds = new Set(scannedCheckpoints.map(scan => scan.name))
  const progressPercent = masterCheckpoints.length > 0
    ? Math.min(100, Math.round((scannedCheckpoints.length / masterCheckpoints.length) * 100))
    : 0

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh', width: '100vw', padding: '0 20px 30px 20px', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', position: 'relative', overflowX: 'hidden' }}>
      <style>{`
        @keyframes rasScannerLine {
          0% { top: 18%; opacity: 0.45; }
          50% { top: 78%; opacity: 1; }
          100% { top: 18%; opacity: 0.45; }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 4px 15px 4px', width: '100%', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '22px', fontWeight: '900', color: '#1e3a8a', letterSpacing: '-0.5px' }}>RASMSB</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => alert('No active corporate broadcast dispatches found.')} aria-label="Notifications" style={{ position: 'relative', cursor: 'pointer', border: 'none', background: 'transparent', padding: 0 }}>
            <span style={{ fontSize: '22px', color: '#1e3a8a' }}>🔔</span>
            <span style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }} />
          </button>
          <button onClick={() => setIsDrawerOpen(true)} aria-label="Open menu" style={{ display: 'flex', flexDirection: 'column', gap: '5px', cursor: 'pointer', padding: '4px', border: 'none', background: 'transparent' }}>
            <span style={menuLineStyle} />
            <span style={menuLineStyle} />
            <span style={menuLineStyle} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button onClick={goBack} style={{ width: '42px', height: '42px', borderRadius: '12px', border: '1px solid #dbe3ef', backgroundColor: '#ffffff', color: '#1e3a8a', fontSize: '20px', fontWeight: '900' }}>
          &lt;
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '1px' }}>QR PATROL ROUND</div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#1e3a8a' }}>{projectName}</div>
        </div>
      </div>

      {isLoading && <div style={messageStyle}>Loading patrol checkpoints...</div>}
      {!isLoading && errorMessage && <div style={{ ...messageStyle, color: '#b91c1c', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>{errorMessage}</div>}
      {!isLoading && message && <div style={{ ...messageStyle, color: '#047857', borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' }}>{message}</div>}

      {!isLoading && (
        <>
          <section style={{ backgroundColor: '#25479a', borderRadius: '24px', padding: '22px', marginBottom: '18px', color: '#ffffff', boxShadow: '0 10px 20px -5px rgba(37, 71, 154, 0.25)' }}>
            <div style={{ fontSize: '11px', fontWeight: '900', color: '#93c5fd', letterSpacing: '1px' }}>ACTIVE ROUND STATUS</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '14px', marginTop: '8px' }}>
              <div>
                <div style={{ fontSize: '25px', fontWeight: '900' }}>{scannedCheckpoints.length}/{masterCheckpoints.length}</div>
                <div style={{ fontSize: '12px', color: '#dbeafe', fontWeight: '700' }}>{activeRound ? `Started ${activeRound.start_time}` : isRoundFinished ? 'Round completed' : 'No round started'}</div>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '900', backgroundColor: activeRound || isRoundFinished ? '#10b981' : '#64748b', padding: '7px 10px', borderRadius: '999px' }}>
                {activeRound ? 'IN PROGRESS' : isRoundFinished ? 'COMPLETED' : 'READY'}
              </div>
            </div>
            <div style={{ height: '9px', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: '999px', overflow: 'hidden', marginTop: '16px' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#38bdf8', transition: 'width 0.25s ease' }} />
            </div>
          </section>

          {!activeRound && !isRoundFinished ? (
            <button onClick={startRound} disabled={isSubmitting || masterCheckpoints.length === 0} style={{ width: '100%', height: '54px', borderRadius: '16px', border: 'none', backgroundColor: masterCheckpoints.length === 0 ? '#94a3b8' : '#10b981', color: '#ffffff', fontSize: '15px', fontWeight: '900', boxShadow: '0 10px 18px rgba(16, 185, 129, 0.22)', cursor: masterCheckpoints.length === 0 ? 'not-allowed' : 'pointer', marginBottom: '18px' }}>
              {isSubmitting ? 'Starting Round...' : 'Clocking Rounds'}
            </button>
          ) : activeRound && scannedCheckpoints.length < masterCheckpoints.length ? (
            <div style={{ marginBottom: '18px' }}>
              <button onClick={() => startCamera()} disabled={isSubmitting} style={{ width: '100%', height: '50px', borderRadius: '15px', border: 'none', backgroundColor: '#1e3a8a', color: '#ffffff', fontSize: '13px', fontWeight: '900', cursor: 'pointer' }}>
                Scan Next QR
              </button>
            </div>
          ) : activeRound ? (
            <button onClick={completeRound} disabled={isSubmitting} style={{ width: '100%', height: '54px', borderRadius: '16px', border: 'none', backgroundColor: '#10b981', color: '#ffffff', fontSize: '15px', fontWeight: '900', boxShadow: '0 10px 18px rgba(16, 185, 129, 0.22)', cursor: 'pointer', marginBottom: '18px' }}>
              {isSubmitting ? 'Saving...' : 'Complete Clocking'}
            </button>
          ) : (
            <div style={{ ...messageStyle, color: '#047857', borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' }}>Clocking round completed.</div>
          )}

          {cameraError && <div style={{ ...messageStyle, color: '#92400e', borderColor: '#fde68a', backgroundColor: '#fffbeb' }}>{cameraError}</div>}

          <section style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 10px 18px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ backgroundColor: '#eff6ff', color: '#1e3a8a', fontSize: '12px', fontWeight: '900', letterSpacing: '0.3px', padding: '13px 16px', borderBottom: '1px solid #dbeafe' }}>
              CHECKPOINT LIST
            </div>
            <div style={{ padding: '6px 16px' }}>
              {masterCheckpoints.length === 0 ? (
                <div style={{ padding: '18px 0', color: '#64748b', fontSize: '13px', fontWeight: '800' }}>No checkpoints configured for this site.</div>
              ) : masterCheckpoints.map((checkpoint, index) => {
                const isScanned = scannedIds.has(checkpoint.name)
                return (
                  <div key={checkpoint.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 0', borderBottom: index === masterCheckpoints.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ color: '#0f172a', fontSize: '14px', fontWeight: '900' }}>{checkpoint.name}</div>
                      <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '800', marginTop: '4px' }}>CP-{String(index + 1).padStart(3, '0')}</div>
                    </div>
                    <span style={{ color: '#ffffff', backgroundColor: isScanned ? '#10b981' : '#94a3b8', padding: '5px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: '900' }}>
                      {isScanned ? 'SCANNED' : 'PENDING'}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}

      {activeRound && isScannerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999998, backgroundColor: 'rgba(15, 23, 42, 0.72)', padding: '20px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '18px', boxSizing: 'border-box', boxShadow: '0 24px 50px rgba(15, 23, 42, 0.28)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
              <div>
                <div style={{ color: '#1e3a8a', fontSize: '11px', fontWeight: '900', letterSpacing: '1px' }}>SCAN CHECKPOINT</div>
                <div style={{ color: '#0f172a', fontSize: '18px', fontWeight: '900', marginTop: '4px' }}>
                  {scannedCheckpoints.length + 1 > masterCheckpoints.length ? 'All checkpoints scanned' : `${scannedCheckpoints.length + 1} of ${masterCheckpoints.length}`}
                </div>
              </div>
              <button onClick={closeScanner} aria-label="Close scanner" style={{ width: '38px', height: '38px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#64748b', fontSize: '16px', fontWeight: '900' }}>X</button>
            </div>

            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '18px', backgroundColor: '#0f172a', minHeight: '280px', border: '1px solid #1e293b' }}>
              <video ref={videoRef} playsInline muted style={{ display: isScanning ? 'block' : 'none', width: '100%', height: '320px', objectFit: 'cover' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {!isScanning && (
                <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#cbd5e1', fontSize: '13px', fontWeight: '800', padding: '24px', boxSizing: 'border-box' }}>
                  Opening camera...
                </div>
              )}
              {isScanning && (
                <div style={{
                  position: 'absolute',
                  left: '10%',
                  right: '10%',
                  height: '3px',
                  borderRadius: '999px',
                  backgroundColor: '#38bdf8',
                  boxShadow: '0 0 18px rgba(56, 189, 248, 0.95)',
                  animation: 'rasScannerLine 1.45s ease-in-out infinite',
                  pointerEvents: 'none'
                }} />
              )}
            </div>

            <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '800', textAlign: 'center', margin: '12px 0 2px 0' }}>
              Hold the QR code in front of the camera.
            </div>

            <button onClick={closeScanner} style={{ width: '100%', height: '46px', borderRadius: '14px', border: 'none', backgroundColor: '#f1f5f9', color: '#1e3a8a', fontSize: '13px', fontWeight: '900', marginTop: '12px' }}>
              Close Scanner
            </button>
          </div>
        </div>
      )}

      {scanNotice && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000000, backgroundColor: 'rgba(15, 23, 42, 0.56)', padding: '24px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', textAlign: 'center', boxShadow: '0 24px 50px rgba(15, 23, 42, 0.3)' }}>
            <div style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              margin: '0 auto 14px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: '900',
              backgroundColor: scanNotice.kind === 'success' ? '#10b981' : scanNotice.kind === 'warning' ? '#f59e0b' : '#ef4444'
            }}>
              {scanNotice.kind === 'success' ? '✓' : '!'}
            </div>
            <div style={{ color: '#0f172a', fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>{scanNotice.title}</div>
            <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', lineHeight: 1.5, marginBottom: '18px' }}>{scanNotice.body}</div>
            <button onClick={handleScanNoticeOk} style={{ width: '100%', height: '48px', borderRadius: '15px', border: 'none', backgroundColor: '#1e3a8a', color: '#ffffff', fontSize: '14px', fontWeight: '900' }}>
              OK
            </button>
          </div>
        </div>
      )}

      {completionNotice && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000001, backgroundColor: 'rgba(15, 23, 42, 0.58)', padding: '24px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '26px 24px', textAlign: 'center', boxShadow: '0 24px 50px rgba(15, 23, 42, 0.3)' }}>
            <div style={{ width: '62px', height: '62px', borderRadius: '50%', margin: '0 auto 15px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '30px', fontWeight: '900', backgroundColor: '#10b981' }}>
              ✓
            </div>
            <div style={{ color: '#0f172a', fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>Patrolling Completed Successfully</div>
            <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', lineHeight: 1.5 }}>Returning to dashboard...</div>
          </div>
        </div>
      )}

      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(3px)',
        zIndex: 999999,
        transition: 'opacity 0.3s ease-in-out, visibility 0.3s',
        opacity: isDrawerOpen ? 1 : 0,
        visibility: isDrawerOpen ? 'visible' : 'hidden'
      }} onClick={() => setIsDrawerOpen(false)}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '80%',
          maxWidth: '310px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-10px 0 25px -5px rgba(15, 23, 42, 0.15)',
          padding: '30px 24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'transform 0.3s ease-in-out',
          transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)'
        }} onClick={(event) => event.stopPropagation()}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#1e3a8a', letterSpacing: '-0.3px' }}>Terminal Account</span>
              <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer', padding: '4px', fontWeight: 'bold' }}>X</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '25px' }}>
              <button onClick={goBack} style={drawerButtonStyle}>Back to Dashboard</button>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Operational Post</label>
                <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569', marginTop: '3px', lineHeight: '1.3' }}>{projectName}</div>
              </div>
            </div>
          </div>
          <button onClick={handleSecureLogout} style={{ width: '100%', height: '48px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#ef4444', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            Sign Out Terminal
          </button>
        </div>
      </div>
    </div>
  )
}

function parseQrPayload(rawValue: string): ParsedQrPayload | null {
  const parts = rawValue.split('|')
  if (parts.length !== 3 || parts[0] !== 'RASMSB') return null
  const checkpointId = Number(parts[2])
  if (!parts[1] || !Number.isFinite(checkpointId)) return null
  return {
    projectSlug: parts[1],
    checkpointId
  }
}

function toInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatClockTime(date: Date) {
  return new Intl.DateTimeFormat('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

function parseRoundStart(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number)
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) return new Date()

  let hours = Number(match[1])
  const minutes = Number(match[2])
  const meridiem = match[3].toUpperCase()
  if (meridiem === 'PM' && hours < 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0

  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

function formatDuration(start: Date, end: Date) {
  const diffMs = Math.max(0, end.getTime() - start.getTime())
  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

function waitForVideoElement(ref: RefObject<HTMLVideoElement | null>) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    let attempts = 0

    const check = () => {
      if (ref.current) {
        resolve(ref.current)
        return
      }

      attempts += 1
      if (attempts > 30) {
        reject(new Error('Scanner view is not ready yet. Please try again.'))
        return
      }

      window.requestAnimationFrame(check)
    }

    check()
  })
}

const messageStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  padding: '16px',
  color: '#64748b',
  fontSize: '13px',
  fontWeight: '800',
  textAlign: 'center' as const,
  marginBottom: '14px'
}

const menuLineStyle = {
  width: '22px',
  height: '3px',
  backgroundColor: '#1e3a8a',
  borderRadius: '2px'
}

const drawerButtonStyle = {
  width: '100%',
  height: '44px',
  backgroundColor: '#eff6ff',
  border: '1px solid #dbeafe',
  borderRadius: '12px',
  color: '#1e3a8a',
  fontSize: '13px',
  fontWeight: '800',
  cursor: 'pointer',
  textAlign: 'left' as const,
  padding: '0 14px'
}

export default function MobileClockingRoundsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '20px', color: '#64748b', fontWeight: '800' }}>Loading clocking round...</div>}>
      <MobileClockingRoundsContent />
    </Suspense>
  )
}
