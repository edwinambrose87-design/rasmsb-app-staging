'use client'
import { useState, useEffect, Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface CheckpointLog {
  id: number
  name: string
  time: string
  status: 'completed' | 'pending' | 'missed'
  imageUrl: string | null
}

interface MasterCheckpoint {
  id: number
  name: string
}

interface PatrolRoundRow {
  id: number
  guard: string
  date: string
  startTime: string
  endTime: string
  duration: string
  completedPoints: number
  totalPoints: number
  missedPoints: string | number
  project_slug: string
  status: string
  checkpoints: CheckpointLog[]
}

function ClockingReportContent() {
  const searchParams = useSearchParams()
  const activeProjectSlug = searchParams.get('project')
  const defaultRange = useMemo(() => getDefaultDateRange(), [])

  const [startDate, setStartDate] = useState(defaultRange.startDate)
  const [endDate, setEndDate] = useState(defaultRange.endDate)
  const [expandedCardIds, setExpandedCardIds] = useState<number[]>([])
  
  const [patrolRounds, setPatrolRounds] = useState<PatrolRoundRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  )

  useEffect(() => {
    // ✅ FIXES RACE CONDITIONS: Prevents slow database responses from overwriting faster dropdown selections
    let isCurrentRequestActive = true

    async function fetchScansByRoundId(roundIds: number[]) {
      const scansByRoundId = new Map<number, any[]>()
      if (roundIds.length === 0) return scansByRoundId

      const { data, error } = await supabase
        .from('clocking_checkpoints')
        .select('id, round_id, name, time, image_url')
        .in('round_id', roundIds)
        .order('id', { ascending: true })

      if (error) throw error

      ;(data || []).forEach((scan: any) => {
        const roundScans = scansByRoundId.get(scan.round_id) || []
        scansByRoundId.set(scan.round_id, [...roundScans, scan])
      })

      return scansByRoundId
    }
    
    async function streamClockingLogs() {
      if (!activeProjectSlug) {
        setPatrolRounds([])
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      try {
        // 1. DYNAMIC REPOSITORY LOOKUP: Read the real total checkpoints assigned to this project
        const { data: masterCheckpoints, error: masterError } = await supabase
          .from('clocking_master_checkpoints')
          .select('id, name')
          .eq('project_slug', activeProjectSlug)
          .order('created_at', { ascending: true })

        if (masterError) throw masterError
        const expectedCheckpoints = (masterCheckpoints || []) as MasterCheckpoint[]
        const trueTotalPoints = expectedCheckpoints.length

        // 2. LIVE PATROL STREAM: Fetch rounds data and sub-join matching scan timestamps
        const { data: roundsData, error: roundsError } = await supabase
          .from('clocking_rounds')
          .select(`
            id,
            guard,
            date,
            start_time,
            end_time,
            duration,
            completed_points,
            total_points,
            missed_points,
            project_slug,
            status
          `)
          .eq('project_slug', activeProjectSlug)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('id', { ascending: false })

        if (roundsError) throw roundsError

        // Abort state updates immediately if the user switched the project dropdown while this query was running
        if (!isCurrentRequestActive) return

        if (roundsData) {
          const roundIds = roundsData.map((row: any) => row.id)
          const scansByRoundId = await fetchScansByRoundId(roundIds)

          if (!isCurrentRequestActive) return

          const roundsWithScanData = roundsData.filter((row: any) => (scansByRoundId.get(row.id) || []).length > 0)

          const mappedRounds: PatrolRoundRow[] = roundsWithScanData.map((row: any) => {
            const scannedCheckpointsList = scansByRoundId.get(row.id) || []
            const isInProgress = row.status === 'in_progress'
            const cleanCheckpointLogs = buildCheckpointLogs(expectedCheckpoints, scannedCheckpointsList, isInProgress)
            const completedPointsCount = cleanCheckpointLogs.filter(cp => cp.status === 'completed' && expectedCheckpoints.some(master => normalizeName(master.name) === normalizeName(cp.name))).length
            
            // Mask summary telemetry fields with conditional placeholders if the shift is active
            const finalEndTime = isInProgress ? '-- : --' : row.end_time
            const finalDuration = isInProgress ? 'In Progress...' : row.duration
            const finalMissedStats = isInProgress ? '--' : Math.max(0, trueTotalPoints - completedPointsCount)

            return {
              id: row.id,
              guard: row.guard,
              date: row.date,
              startTime: row.start_time,
              endTime: finalEndTime,
              duration: finalDuration,
              completedPoints: completedPointsCount,
              totalPoints: trueTotalPoints,
              missedPoints: finalMissedStats,
              project_slug: row.project_slug,
              status: row.status || 'completed',
              checkpoints: cleanCheckpointLogs
            }
          })
          setPatrolRounds(mappedRounds)
        } else {
          setPatrolRounds([])
        }
      } catch (err) {
        console.error('Failed to pull raw clocking ledger profiles:', err)
      } finally {
        if (isCurrentRequestActive) {
          setIsLoading(false)
        }
      }
    }

    streamClockingLogs()

    // Cleanup cancels stale component state loads automatically on teardown/dropdown switch
    return () => {
      isCurrentRequestActive = false
    }
  }, [activeProjectSlug, startDate, endDate, supabase])

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  const handleDownloadReport = () => {
    alert(`Generating Custom Range Export...\nRange: ${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`)
  }

  const toggleCard = (id: number) => {
    if (expandedCardIds.includes(id)) {
      setExpandedCardIds(expandedCardIds.filter(cardId => cardId !== id))
    } else {
      setExpandedCardIds([...expandedCardIds, id])
    }
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100%', width: '100%', boxSizing: 'border-box' }}>
      
      {/* HEADER ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '35px', maxWidth: '1200px', width: '100%' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
              CLOCKING REPORT
            </h1>
            <Link 
              href={`/dashboard/Clocking_Report/checkpoints?project=${activeProjectSlug}`} 
              style={{ textDecoration: 'none', backgroundColor: '#1e3a8a', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(30, 58, 138, 0.2)', display: 'inline-flex', alignItems: 'center' }}
            >
              ⚙️ Manage Checkpoints
            </Link>
          </div>
          <p style={{ color: '#64748b', marginTop: '5px', margin: 0 }}>Filter, review, and extract custom security patrol compliance logs.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: 'white', padding: '10px 20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px', height: '56px', boxSizing: 'border-box' }}>
            <div onClick={() => (document.getElementById('start-date-picker') as HTMLInputElement)?.showPicker()} style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', cursor: 'pointer' }}>
              <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px' }}>START DATE</label>
              <span style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '13px' }}>{formatDisplayDate(startDate)}</span>
              <input id="start-date-picker" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            </div>
            <div style={{ color: '#cbd5e1', fontWeight: 'bold' }}>➔</div>
            <div onClick={() => (document.getElementById('end-date-picker') as HTMLInputElement)?.showPicker()} style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', cursor: 'pointer' }}>
              <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px' }}>END DATE</label>
              <span style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '13px' }}>{formatDisplayDate(endDate)}</span>
              <input id="end-date-picker" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            </div>
          </div>

          <button onClick={handleDownloadReport} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', height: '56px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>
            Download Report
          </button>
        </div>
      </div>

      {/* COMPONENT CARDS LEDGER */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '1200px', width: '100%' }}>
        {isLoading ? (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600' }}>
            Connecting to data nodes and fetching active logs...
          </div>
        ) : patrolRounds.length > 0 ? (
          patrolRounds.map((round) => {
            const isExpanded = expandedCardIds.includes(round.id)
            const isCurrentRoundActive = round.status === 'in_progress'

            return (
              <div key={round.id} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', overflow: 'hidden', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: isCurrentRoundActive ? '#f0fdf4' : '#f1f5f9', borderBottom: isExpanded ? '2px solid #e2e8f0' : 'none', padding: '15px 20px', width: '100%', boxSizing: 'border-box', borderLeft: isCurrentRoundActive ? '4px solid #22c55e' : 'none' }}>
                  <div style={{ flex: '1 1 20%' }}><span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>GUARD</span><br/><span style={{ fontSize: '14px', color: '#1e3a8a', fontWeight: 'bold' }}>{round.guard} {isCurrentRoundActive && '🟢 (LIVE)'}</span></div>
                  <div style={{ flex: '1 1 15%' }}><span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>DATE</span><br/><span style={{ fontSize: '14px', color: '#334155' }}>{formatDisplayDate(round.date)}</span></div>
                  <div style={{ flex: '1 1 15%' }}><span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>START TIME</span><br/><span style={{ fontSize: '14px', color: '#334155' }}>{round.startTime}</span></div>
                  <div style={{ flex: '1 1 15%' }}><span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>END TIME</span><br/><span style={{ fontSize: '14px', color: isCurrentRoundActive ? '#22c55e' : '#334155', fontWeight: isCurrentRoundActive ? 'bold' : 'normal' }}>{round.endTime}</span></div>
                  <div style={{ flex: '1 1 12%' }}><span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>DURATION</span><br/><span style={{ fontSize: '14px', color: isCurrentRoundActive ? '#22c55e' : '#475569', fontWeight: 'bold' }}>{round.duration}</span></div>
                  
                  <div style={{ flex: '1 1 18%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>COMPLIANCE STATS</span>
                    <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>Scanned: {round.completedPoints}/{round.totalPoints}</span>
                    <span style={{ fontSize: '13px', color: isCurrentRoundActive ? '#64748b' : Number(round.missedPoints) > 0 ? '#ef4444' : '#64748b', fontWeight: 'bold' }}>Missed: {round.missedPoints}</span>
                  </div>

                  <div style={{ flex: '1 1 5%', textAlign: 'right', paddingRight: '10px' }}>
                    <button
                      onClick={() => toggleCard(round.id)}
                      style={{ backgroundColor: 'transparent', color: '#1e3a8a', border: 'none', fontSize: '20px', lineHeight: '1', cursor: 'pointer', padding: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      ▼
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '10px 20px 20px 20px', backgroundColor: 'white' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                          <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '5%' }}>#</th>
                          <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '50%', textTransform: 'uppercase' as const }}>Clocking Point</th>
                          <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '20%', textTransform: 'uppercase' as const }}>Time</th>
                          <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '15%', textTransform: 'uppercase' as const }}>Image</th>
                          <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '15%', textAlign: 'right', paddingRight: '20px', textTransform: 'uppercase' as const }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {round.checkpoints.length > 0 ? (
                          round.checkpoints.map((cp, idx) => (
                            <tr key={cp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '14px 10px', fontSize: '14px', color: '#64748b' }}>{idx + 1}</td>
                              <td style={{ padding: '14px 10px', fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{cp.name}</td>
                              <td style={{ padding: '14px 10px', fontSize: '14px', color: cp.status === 'completed' ? '#334155' : cp.status === 'missed' ? '#ef4444' : '#64748b', fontWeight: cp.status === 'completed' ? 'normal' : '700' }}>{cp.time}</td>
                              <td style={{ padding: '14px 10px' }}>
                                <button
                                  onClick={() => cp.imageUrl && window.open(cp.imageUrl, '_blank', 'noopener,noreferrer')}
                                  style={{
                                    backgroundColor: cp.imageUrl ? '#e0f2fe' : '#f1f5f9',
                                    color: cp.imageUrl ? '#0369a1' : '#94a3b8',
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: cp.imageUrl ? 'pointer' : 'not-allowed'
                                  }}
                                  disabled={!cp.imageUrl}
                                >
                                  {cp.imageUrl ? 'View' : 'None'}
                                </button>
                              </td>
                              <td style={{ padding: '14px 10px', textAlign: 'right', paddingRight: '10px' }}>
                                <span style={getCheckpointStatusStyle(cp.status)}>
                                  {cp.status === 'completed' ? 'Completed' : cp.status === 'pending' ? 'Pending' : 'Missed'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} style={{ padding: '20px', textTransform: 'uppercase', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                              ⚠️ No physical checkpoints scanned on this round yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#64748b' }}>
            No active compliance logs recorded within this specific date range.
          </div>
        )}
      </div>
    </div>
  )
}

function getDefaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 3)

  return {
    startDate: toInputDate(start),
    endDate: toInputDate(end)
  }
}

function toInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeName(name: string) {
  return (name || '').trim().toUpperCase()
}

function buildCheckpointLogs(masterCheckpoints: MasterCheckpoint[], scannedCheckpoints: any[], isInProgress: boolean): CheckpointLog[] {
  const uniqueScans = new Map<string, any>()

  ;[...scannedCheckpoints]
    .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
    .forEach(scan => {
      const key = normalizeName(scan.name || '')
      if (key && !uniqueScans.has(key)) {
        uniqueScans.set(key, scan)
      }
    })

  const expectedLogs = masterCheckpoints.map((checkpoint) => {
    const scan = uniqueScans.get(normalizeName(checkpoint.name))
    if (scan) {
      return {
        id: scan.id || checkpoint.id,
        name: checkpoint.name,
        time: scan.time || 'Time unavailable',
        status: 'completed' as const,
        imageUrl: scan.image_url || null
      }
    }

    return {
      id: checkpoint.id,
      name: checkpoint.name,
      time: isInProgress ? 'Awaiting scan' : 'Not scanned',
      status: isInProgress ? 'pending' as const : 'missed' as const,
      imageUrl: null
    }
  })

  const masterNames = new Set(masterCheckpoints.map(checkpoint => normalizeName(checkpoint.name)))
  const additionalScans = Array.from(uniqueScans.values())
    .filter(scan => !masterNames.has(normalizeName(scan.name || '')))
    .map(scan => ({
      id: scan.id,
      name: scan.name || 'UNKNOWN STATION PIN',
      time: scan.time || 'Time unavailable',
      status: 'completed' as const,
      imageUrl: scan.image_url || null
    }))

  return [...expectedLogs, ...additionalScans]
}

function getCheckpointStatusStyle(status: CheckpointLog['status']) {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '92px',
    padding: '6px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '800'
  }

  if (status === 'completed') {
    return { ...baseStyle, backgroundColor: '#dcfce7', color: '#15803d' }
  }

  if (status === 'pending') {
    return { ...baseStyle, backgroundColor: '#e0f2fe', color: '#0369a1' }
  }

  return { ...baseStyle, backgroundColor: '#fee2e2', color: '#b91c1c' }
}

export default function ClockingReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', fontWeight: '600' }}>Loading view parameters...</div>}>
      <ClockingReportContent />
    </Suspense>
  )
}
