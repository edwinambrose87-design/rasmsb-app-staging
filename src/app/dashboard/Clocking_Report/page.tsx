'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface CheckpointLog {
  id: number
  name: string
  time: string
  imageUrl: string | null
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

  const [startDate, setStartDate] = useState('2026-05-14')
  const [endDate, setEndDate] = useState('2026-06-05')
  const [expandedCardIds, setExpandedCardIds] = useState<number[]>([])
  
  const [patrolRounds, setPatrolRounds] = useState<PatrolRoundRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // ✅ FIXES RACE CONDITIONS: Prevents slow database responses from overwriting faster dropdown selections
    let isCurrentRequestActive = true
    
    async function streamClockingLogs() {
      if (!activeProjectSlug) return
      
      setIsLoading(true)
      try {
        // 1. DYNAMIC REPOSITORY LOOKUP: Read the real total checkpoints assigned to this project
        const { data: masterCheckpoints, error: masterError } = await supabase
          .from('clocking_master_checkpoints')
          .select('id')
          .eq('project_slug', activeProjectSlug)

        if (masterError) throw masterError
        const trueTotalPoints = masterCheckpoints ? masterCheckpoints.length : 0

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
            status,
            clocking_checkpoints (
              id,
              name,
              time,
              image_url
            )
          `)
          .eq('project_slug', activeProjectSlug)

        if (roundsError) throw roundsError

        // Abort state updates immediately if the user switched the project dropdown while this query was running
        if (!isCurrentRequestActive) return

        if (roundsData) {
          const filteredData = roundsData.filter((row: any) => {
            const recordDate = new Date(row.date + 'T00:00:00')
            const filterStart = new Date(startDate + 'T00:00:00')
            const filterEnd = new Date(endDate + 'T00:00:00')
            return recordDate >= filterStart && recordDate <= filterEnd
          })

          const mappedRounds: PatrolRoundRow[] = filteredData.map((row: any) => {
            const scannedCheckpointsList = row.clocking_checkpoints || []
            const isInProgress = row.status === 'in_progress'

            const completedPointsCount = scannedCheckpointsList.length
            
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
              checkpoints: scannedCheckpointsList.map((cp: any) => ({
                id: cp.id,
                name: cp.name || 'UNKNOWN STATION PIN',
                time: cp.time || 'Pending Data...',
                imageUrl: cp.image_url || null
              }))
            }
          })
          setPatrolRounds(mappedRounds)
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
                          <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '30%', textTransform: 'uppercase' as const }}>Time</th>
                          <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '15%', textAlign: 'right', paddingRight: '20px', textTransform: 'uppercase' as const }}>Image</th>
                        </tr>
                      </thead>
                      <tbody>
                        {round.checkpoints.length > 0 ? (
                          round.checkpoints.map((cp, idx) => (
                            <tr key={cp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '14px 10px', fontSize: '14px', color: '#64748b' }}>{idx + 1}</td>
                              <td style={{ padding: '14px 10px', fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{cp.name}</td>
                              <td style={{ padding: '14px 10px', fontSize: '14px', color: '#334155' }}>{cp.time}</td>
                              <td style={{ padding: '14px 10px', textAlign: 'right', paddingRight: '10px' }}>
                                <button 
                                  onClick={() => alert(cp.imageUrl ? `Opening Proof Photo Node: ${cp.imageUrl}` : `No file upload bound for ${cp.name}`)}
                                  style={{ 
                                    backgroundColor: cp.imageUrl ? '#e0f2fe' : '#f1f5f9', 
                                    color: cp.imageUrl ? '#0369a1' : '#94a3b8', 
                                    border: 'none', 
                                    padding: '6px 20px', 
                                    borderRadius: '6px', 
                                    fontSize: '13px', 
                                    fontWeight: '600', 
                                    cursor: cp.imageUrl ? 'pointer' : 'not-allowed' 
                                  }}
                                  disabled={!cp.imageUrl}
                                >
                                  {cp.imageUrl ? 'View' : 'None'}
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ padding: '20px', textTransform: 'uppercase', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
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

export default function ClockingReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', fontWeight: '600' }}>Loading view parameters...</div>}>
      <ClockingReportContent />
    </Suspense>
  )
}
