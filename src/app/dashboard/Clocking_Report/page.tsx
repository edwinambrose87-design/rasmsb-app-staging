'use client'

import { Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

declare global {
  interface Window {
    PDFLib?: any
  }
}

type ShiftType = 'DAY' | 'NIGHT'
type CheckpointStatus = 'completed' | 'pending' | 'missed'

interface CheckpointLog {
  id: number
  name: string
  time: string
  status: CheckpointStatus
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
  shift: ShiftType
  operationDate: string
  checkpoints: CheckpointLog[]
}

interface GalleryPhoto {
  name: string
  time: string
  imageUrl: string
}

interface ProofGallery {
  guard: string
  date: string
  startTime: string
  photos: GalleryPhoto[]
  index: number
}

interface ClockingDateGroup {
  operationDate: string
  dayRounds: PatrolRoundRow[]
  nightRounds: PatrolRoundRow[]
}

function ClockingReportContent() {
  const searchParams = useSearchParams()
  const activeProjectSlug = searchParams.get('project')
  const defaultRange = useMemo(() => getDefaultClockingDateRange(), [])

  const [startDate, setStartDate] = useState(defaultRange.startDate)
  const [endDate, setEndDate] = useState(defaultRange.endDate)
  const [expandedCardIds, setExpandedCardIds] = useState<number[]>([])
  const [proofGallery, setProofGallery] = useState<ProofGallery | null>(null)
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

    async function loadClockingLogs() {
      if (!activeProjectSlug) {
        setPatrolRounds([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const { data: masterCheckpoints, error: masterError } = await supabase
          .from('clocking_master_checkpoints')
          .select('id, name')
          .eq('project_slug', activeProjectSlug)
          .order('created_at', { ascending: true })

        if (masterError) throw masterError
        const expectedCheckpoints = (masterCheckpoints || []) as MasterCheckpoint[]
        const trueTotalPoints = expectedCheckpoints.length
        const safeStartDate = startDate <= endDate ? startDate : endDate
        const safeEndDate = startDate <= endDate ? endDate : startDate
        const nextEndDate = addDays(safeEndDate, 1)

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
          .gte('date', safeStartDate)
          .lte('date', nextEndDate)
          .order('id', { ascending: false })

        if (roundsError) throw roundsError
        if (!isCurrentRequestActive) return

        const roundIds = (roundsData || []).map((row: any) => row.id)
        const scansByRoundId = await fetchScansByRoundId(roundIds)
        if (!isCurrentRequestActive) return

        const mappedRounds = (roundsData || [])
          .filter((row: any) => {
            if ((scansByRoundId.get(row.id) || []).length === 0) return false
            const operationDate = getClockingOperationDate(row.date, row.start_time)
            return operationDate >= safeStartDate && operationDate <= safeEndDate
          })
          .map((row: any) => {
            const scannedCheckpointsList = scansByRoundId.get(row.id) || []
            const isInProgress = row.status === 'in_progress'
            const storedTotalPoints = Number(row.total_points || 0)
            const roundExpectedCheckpoints = storedTotalPoints > 0
              ? expectedCheckpoints.slice(0, storedTotalPoints)
              : expectedCheckpoints
            const roundTotalPoints = storedTotalPoints || roundExpectedCheckpoints.length || trueTotalPoints
            const cleanCheckpointLogs = buildCheckpointLogs(roundExpectedCheckpoints, scannedCheckpointsList, isInProgress)
            const completedPointsCount = cleanCheckpointLogs.filter(cp =>
              cp.status === 'completed' && roundExpectedCheckpoints.some(master => normalizeName(master.name) === normalizeName(cp.name))
            ).length

            return {
              id: row.id,
              guard: row.guard,
              date: row.date,
              startTime: row.start_time,
              endTime: isInProgress ? '-- : --' : row.end_time,
              duration: isInProgress ? 'In Progress...' : row.duration,
              completedPoints: completedPointsCount,
              totalPoints: roundTotalPoints,
              missedPoints: isInProgress ? '--' : Math.max(0, roundTotalPoints - completedPointsCount),
              project_slug: row.project_slug,
              status: row.status || 'completed',
              shift: inferClockingShift(row.date, row.start_time),
              operationDate: getClockingOperationDate(row.date, row.start_time),
              checkpoints: cleanCheckpointLogs
            } as PatrolRoundRow
          })

        setPatrolRounds(mappedRounds)
      } catch (err) {
        console.error('Failed to load clocking report:', err)
      } finally {
        if (isCurrentRequestActive) setIsLoading(false)
      }
    }

    loadClockingLogs()

    return () => {
      isCurrentRequestActive = false
    }
  }, [activeProjectSlug, startDate, endDate, supabase])

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  const openDatePicker = (input: HTMLInputElement | null) => {
    if (!input) return
    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.focus()
      input.click()
    }
  }

  const normalizedStartDate = startDate <= endDate ? startDate : endDate
  const normalizedEndDate = startDate <= endDate ? endDate : startDate
  const dateGroups = useMemo(() => groupRoundsByOperationDate(patrolRounds), [patrolRounds])

  const handleDownloadReport = async () => {
    try {
      const generatedAt = new Intl.DateTimeFormat('en-MY', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date())

      const pdfBytes = await buildClockingPdf({
        projectName: formatProjectName(activeProjectSlug),
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        generatedAt,
        dateGroups
      })
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `clocking-report-${normalizedStartDate}-to-${normalizedEndDate}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.message || 'Failed to generate clocking PDF.')
    }
  }

  const toggleCard = (id: number) => {
    setExpandedCardIds(currentIds =>
      currentIds.includes(id) ? currentIds.filter(cardId => cardId !== id) : [...currentIds, id]
    )
  }

  const openProofGallery = (round: PatrolRoundRow, selectedCheckpoint: CheckpointLog) => {
    const photos = round.checkpoints
      .filter(checkpoint => Boolean(checkpoint.imageUrl))
      .map(checkpoint => ({
        name: checkpoint.name,
        time: checkpoint.time,
        imageUrl: checkpoint.imageUrl as string
      }))

    if (photos.length === 0) return

    const selectedIndex = Math.max(0, photos.findIndex(photo => photo.imageUrl === selectedCheckpoint.imageUrl))
    setProofGallery({
      guard: round.guard,
      date: round.operationDate,
      startTime: round.startTime,
      photos,
      index: selectedIndex
    })
  }

  const moveGallery = (direction: 'next' | 'previous') => {
    setProofGallery(currentGallery => {
      if (!currentGallery) return currentGallery
      const offset = direction === 'next' ? 1 : -1
      const nextIndex = (currentGallery.index + offset + currentGallery.photos.length) % currentGallery.photos.length
      return { ...currentGallery, index: nextIndex }
    })
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100%', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '35px', maxWidth: '1200px', width: '100%', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
              CLOCKING REPORT
            </h1>
            <Link
              href={`/dashboard/Clocking_Report/checkpoints?project=${activeProjectSlug}`}
              style={{ textDecoration: 'none', backgroundColor: '#1e3a8a', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(30, 58, 138, 0.2)', display: 'inline-flex', alignItems: 'center' }}
            >
              Manage Checkpoints
            </Link>
          </div>
          <p style={{ color: '#64748b', marginTop: '5px', margin: 0 }}>Filter, review, and extract security patrol compliance logs.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: 'white', padding: '10px 20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px', height: '56px', boxSizing: 'border-box' }}>
            <div onClick={() => openDatePicker(document.getElementById('clocking-start-date-picker') as HTMLInputElement | null)} style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', cursor: 'pointer' }}>
              <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px' }}>START DATE</label>
              <span style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '13px' }}>{formatDisplayDate(startDate)}</span>
              <input id="clocking-start-date-picker" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            </div>
            <div style={{ color: '#cbd5e1', fontWeight: 'bold' }}>&rarr;</div>
            <div onClick={() => openDatePicker(document.getElementById('clocking-end-date-picker') as HTMLInputElement | null)} style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', cursor: 'pointer' }}>
              <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px' }}>END DATE</label>
              <span style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '13px' }}>{formatDisplayDate(endDate)}</span>
              <input id="clocking-end-date-picker" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            </div>
          </div>

          <button onClick={handleDownloadReport} disabled={patrolRounds.length === 0} style={{ backgroundColor: patrolRounds.length === 0 ? '#94a3b8' : '#10b981', color: 'white', border: 'none', padding: '0 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: patrolRounds.length === 0 ? 'not-allowed' : 'pointer', height: '56px' }}>
            Download Report
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '1200px', width: '100%' }}>
        {isLoading ? (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600' }}>
            Connecting to data nodes and fetching active logs...
          </div>
        ) : patrolRounds.length > 0 ? (
          <>
            {dateGroups.map(group => (
              <div key={group.operationDate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ backgroundColor: '#1e3a8a', padding: '12px 20px', borderRadius: '8px', color: 'white', fontWeight: 'bold', fontSize: '15px' }}>
                  CLOCKING REPORT : {formatDisplayDate(group.operationDate)}
                </div>
                <ShiftSection title="DAY SHIFT" schedule="08:00 AM - 08:00 PM" rounds={group.dayRounds} expandedCardIds={expandedCardIds} toggleCard={toggleCard} openProofGallery={openProofGallery} />
                <ShiftSection title="NIGHT SHIFT" schedule="08:00 PM - 08:00 AM" rounds={group.nightRounds} expandedCardIds={expandedCardIds} toggleCard={toggleCard} openProofGallery={openProofGallery} />
              </div>
            ))}
          </>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#64748b' }}>
            No active compliance logs recorded for this date range.
          </div>
        )}
      </div>

      {proofGallery && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000000, backgroundColor: 'rgba(15, 23, 42, 0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '920px', maxHeight: '92vh', backgroundColor: '#ffffff', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 30px 70px rgba(15, 23, 42, 0.35)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', padding: '18px 22px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <div>
                <div style={{ color: '#1e3a8a', fontSize: '18px', fontWeight: '900' }}>Clocking Proof Gallery</div>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginTop: '3px' }}>
                  {proofGallery.guard} | {formatDisplayDate(proofGallery.date)} | Start {proofGallery.startTime}
                </div>
              </div>
              <button onClick={() => setProofGallery(null)} aria-label="Close gallery" style={{ width: '42px', height: '42px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1e3a8a', fontSize: '18px', fontWeight: '900', cursor: 'pointer' }}>
                X
              </button>
            </div>

            <div style={{ padding: '22px', backgroundColor: '#0f172a', display: 'grid', gridTemplateColumns: '58px 1fr 58px', gap: '18px', alignItems: 'center', minHeight: '520px' }}>
              <button onClick={() => moveGallery('previous')} disabled={proofGallery.photos.length <= 1} style={{ width: '58px', height: '58px', borderRadius: '50%', border: 'none', backgroundColor: proofGallery.photos.length > 1 ? '#ffffff' : '#334155', color: proofGallery.photos.length > 1 ? '#1e3a8a' : '#94a3b8', fontSize: '28px', fontWeight: '900', cursor: proofGallery.photos.length > 1 ? 'pointer' : 'not-allowed' }}>
                {'<'}
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                <img src={proofGallery.photos[proofGallery.index].imageUrl} alt={`${proofGallery.photos[proofGallery.index].name} proof`} style={{ maxWidth: '100%', maxHeight: '62vh', objectFit: 'contain', borderRadius: '12px', backgroundColor: '#020617', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.32)' }} />
                <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '900', marginTop: '16px', textAlign: 'center' }}>
                  {proofGallery.photos[proofGallery.index].name}
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '12px', fontWeight: '700', marginTop: '4px', textAlign: 'center' }}>
                  {proofGallery.photos[proofGallery.index].time} | Photo {proofGallery.index + 1} of {proofGallery.photos.length}
                </div>
              </div>

              <button onClick={() => moveGallery('next')} disabled={proofGallery.photos.length <= 1} style={{ width: '58px', height: '58px', borderRadius: '50%', border: 'none', backgroundColor: proofGallery.photos.length > 1 ? '#ffffff' : '#334155', color: proofGallery.photos.length > 1 ? '#1e3a8a' : '#94a3b8', fontSize: '28px', fontWeight: '900', cursor: proofGallery.photos.length > 1 ? 'pointer' : 'not-allowed' }}>
                {'>'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '14px 20px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              {proofGallery.photos.map((photo, index) => (
                <button key={`${photo.name}-${photo.time}-${index}`} onClick={() => setProofGallery(currentGallery => currentGallery ? { ...currentGallery, index } : currentGallery)} aria-label={`View photo ${index + 1}`} style={{ width: proofGallery.index === index ? '28px' : '10px', height: '10px', borderRadius: '999px', border: 'none', backgroundColor: proofGallery.index === index ? '#1e3a8a' : '#cbd5e1', cursor: 'pointer', transition: 'width 0.2s ease' }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ShiftSection({
  title,
  schedule,
  rounds,
  expandedCardIds,
  toggleCard,
  openProofGallery
}: {
  title: string
  schedule: string
  rounds: PatrolRoundRow[]
  expandedCardIds: number[]
  toggleCard: (id: number) => void
  openProofGallery: (round: PatrolRoundRow, selectedCheckpoint: CheckpointLog) => void
}) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', backgroundColor: title === 'DAY SHIFT' ? '#eff6ff' : '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: title === 'DAY SHIFT' ? '#0b49e8' : '#334155', fontSize: '13.5px' }}>
        {title} ({schedule})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rounds.length === 0 ? (
          <div style={{ padding: '26px 20px', fontSize: '13px', color: '#94a3b8', fontWeight: '700' }}>No clocking records for this shift.</div>
        ) : (
          rounds.map(round => (
            <RoundCard key={round.id} round={round} isExpanded={expandedCardIds.includes(round.id)} toggleCard={toggleCard} openProofGallery={openProofGallery} />
          ))
        )}
      </div>
    </div>
  )
}

function RoundCard({
  round,
  isExpanded,
  toggleCard,
  openProofGallery
}: {
  round: PatrolRoundRow
  isExpanded: boolean
  toggleCard: (id: number) => void
  openProofGallery: (round: PatrolRoundRow, selectedCheckpoint: CheckpointLog) => void
}) {
  const isCurrentRoundActive = round.status === 'in_progress'

  return (
    <div style={{ borderBottom: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: isCurrentRoundActive ? '#f0fdf4' : '#ffffff', borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none', padding: '15px 20px', width: '100%', boxSizing: 'border-box', borderLeft: isCurrentRoundActive ? '4px solid #22c55e' : 'none' }}>
        <div style={{ flex: '1 1 14%' }}><span style={labelStyle}>DATE</span><br/><span style={{ ...valueStyle, fontWeight: '700' }}>{formatDisplayDateStatic(round.operationDate)}</span></div>
        <div style={{ flex: '1 1 14%' }}><span style={labelStyle}>START TIME</span><br/><span style={{ ...valueStyle, fontWeight: '700' }}>{round.startTime}</span></div>
        <div style={{ flex: '1 1 14%' }}><span style={labelStyle}>END TIME</span><br/><span style={{ ...valueStyle, color: isCurrentRoundActive ? '#22c55e' : '#334155', fontWeight: 'normal' }}>{round.endTime}</span></div>
        <div style={{ flex: '1 1 12%' }}><span style={labelStyle}>DURATION</span><br/><span style={{ fontSize: '14px', color: isCurrentRoundActive ? '#22c55e' : '#475569', fontWeight: 'normal' }}>{round.duration}</span></div>
        <div style={{ flex: '1 1 20%' }}><span style={labelStyle}>GUARD</span><br/><span style={{ fontSize: '14px', color: '#1e3a8a', fontWeight: 'normal' }}>{round.guard} {isCurrentRoundActive && '(LIVE)'}</span></div>
        <div style={{ flex: '1 1 18%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={labelStyle}>COMPLIANCE STATS</span>
          <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>Scanned: {round.completedPoints}/{round.totalPoints}</span>
          <span style={{ fontSize: '13px', color: isCurrentRoundActive ? '#64748b' : Number(round.missedPoints) > 0 ? '#ef4444' : '#64748b', fontWeight: 'bold' }}>Missed: {round.missedPoints}</span>
        </div>
        <div style={{ flex: '1 1 5%', textAlign: 'right', paddingRight: '10px' }}>
          <button onClick={() => toggleCard(round.id)} style={{ backgroundColor: 'transparent', color: '#1e3a8a', border: 'none', fontSize: '20px', lineHeight: '1', cursor: 'pointer', padding: '10px', transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            v
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: '10px 20px 20px 20px', backgroundColor: 'white', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ ...tableHeaderStyle, width: '5%' }}>#</th>
                <th style={{ ...tableHeaderStyle, width: '50%' }}>CLOCKING POINT</th>
                <th style={{ ...tableHeaderStyle, width: '20%' }}>TIME</th>
                <th style={{ ...tableHeaderStyle, width: '15%' }}>IMAGE</th>
                <th style={{ ...tableHeaderStyle, width: '15%', textAlign: 'right', paddingRight: '20px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {round.checkpoints.map((cp, idx) => (
                <tr key={`${round.id}-${cp.id}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={cellStyle}>{idx + 1}</td>
                  <td style={{ ...cellStyle, color: '#1e293b', fontWeight: '600' }}>{cp.name}</td>
                  <td style={{ ...cellStyle, color: cp.status === 'completed' ? '#334155' : cp.status === 'missed' ? '#ef4444' : '#64748b', fontWeight: cp.status === 'completed' ? 'normal' : '700' }}>{cp.time}</td>
                  <td style={cellStyle}>
                    <button onClick={() => cp.imageUrl && openProofGallery(round, cp)} disabled={!cp.imageUrl} style={{ backgroundColor: cp.imageUrl ? '#e0f2fe' : '#f1f5f9', color: cp.imageUrl ? '#0369a1' : '#94a3b8', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: cp.imageUrl ? 'pointer' : 'not-allowed' }}>
                      {cp.imageUrl ? 'View' : 'None'}
                    </button>
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right', paddingRight: '10px' }}>
                    <span style={getCheckpointStatusStyle(cp.status)}>
                      {cp.status === 'completed' ? 'Completed' : cp.status === 'pending' ? 'Pending' : 'Missed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const labelStyle: CSSProperties = {
  fontSize: '10px',
  color: '#64748b',
  fontWeight: 800,
  display: 'inline-block',
  marginBottom: '5px'
}

const valueStyle: CSSProperties = {
  fontSize: '14px',
  color: '#334155',
  fontWeight: 500
}

const tableHeaderStyle: CSSProperties = {
  padding: '14px 10px',
  fontSize: '11px',
  color: '#475569',
  fontWeight: 800
}

const cellStyle: CSSProperties = {
  padding: '15px 10px',
  fontSize: '13px',
  color: '#334155',
  verticalAlign: 'middle'
}

function getCheckpointStatusStyle(status: CheckpointStatus): CSSProperties {
  const styles: Record<CheckpointStatus, CSSProperties> = {
    completed: { backgroundColor: '#dcfce7', color: '#15803d' },
    pending: { backgroundColor: '#e2e8f0', color: '#475569' },
    missed: { backgroundColor: '#fee2e2', color: '#b91c1c' }
  }

  return {
    ...styles[status],
    padding: '7px 18px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 800,
    display: 'inline-block'
  }
}

function buildCheckpointLogs(masterCheckpoints: MasterCheckpoint[], scannedRows: any[], isInProgress: boolean): CheckpointLog[] {
  const expectedLogs = masterCheckpoints.map((checkpoint) => {
    const matchingScan = scannedRows.find((scan) => normalizeName(scan.name) === normalizeName(checkpoint.name))
    return {
      id: checkpoint.id,
      name: checkpoint.name,
      time: matchingScan?.time || (isInProgress ? 'Pending scan' : 'Not scanned'),
      status: matchingScan ? 'completed' : isInProgress ? 'pending' : 'missed',
      imageUrl: matchingScan?.image_url || null
    } as CheckpointLog
  })

  const extraLogs = scannedRows
    .filter((scan) => !masterCheckpoints.some((checkpoint) => normalizeName(checkpoint.name) === normalizeName(scan.name)))
    .map((scan) => ({
      id: scan.id,
      name: scan.name || 'Unmapped checkpoint',
      time: scan.time || 'Recorded',
      status: 'completed' as CheckpointStatus,
      imageUrl: scan.image_url || null
    }))

  return [...expectedLogs, ...extraLogs]
}

function normalizeName(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function parseClockingDateTime(date: string, time: string) {
  const safeDate = date || toInputDate(new Date())
  const safeTime = (time || '00:00').trim().toLowerCase()
  const match = safeTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/)
  const parsedDate = new Date(`${safeDate}T00:00:00`)

  if (!match) return parsedDate

  let hours = Number(match[1])
  const minutes = Number(match[2])
  const meridiem = match[3]

  if (meridiem === 'pm' && hours < 12) hours += 12
  if (meridiem === 'am' && hours === 12) hours = 0

  parsedDate.setHours(hours, minutes, 0, 0)
  return parsedDate
}

function inferClockingShift(date: string, time: string): ShiftType {
  const clockTime = parseClockingDateTime(date, time)
  const minutes = clockTime.getHours() * 60 + clockTime.getMinutes()
  return minutes >= 20 * 60 || minutes < 8 * 60 ? 'NIGHT' : 'DAY'
}

function getClockingOperationDate(date: string, time: string) {
  const clockTime = parseClockingDateTime(date, time)
  if (clockTime.getHours() < 8) {
    clockTime.setDate(clockTime.getDate() - 1)
  }
  return toInputDate(clockTime)
}

function toInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(dateStr: string, days: number) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return toInputDate(date)
}

function getDefaultClockingDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 1)

  return {
    startDate: toInputDate(start),
    endDate: toInputDate(end)
  }
}

function groupRoundsByOperationDate(rounds: PatrolRoundRow[]): ClockingDateGroup[] {
  const groupedRounds = new Map<string, PatrolRoundRow[]>()

  rounds.forEach((round) => {
    const currentRounds = groupedRounds.get(round.operationDate) || []
    groupedRounds.set(round.operationDate, [...currentRounds, round])
  })

  return Array.from(groupedRounds.entries())
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([operationDate, dateRounds]) => ({
      operationDate,
      dayRounds: dateRounds.filter(round => round.shift === 'DAY'),
      nightRounds: dateRounds.filter(round => round.shift === 'NIGHT')
    }))
}

function formatDisplayDateStatic(dateStr: string) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function formatProjectName(slug: string | null) {
  if (!slug) return 'Selected Site'
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.length <= 3 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

async function loadPdfLib() {
  if (typeof window === 'undefined') throw new Error('PDF download is only available in the browser.')

  if (!window.PDFLib) {
    await new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-pdf-lib="true"]')
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true })
        existingScript.addEventListener('error', () => reject(new Error('Unable to load PDF generator.')), { once: true })
        return
      }

      const script = document.createElement('script')
      script.src = '/vendor/pdf-lib.min.js'
      script.async = true
      script.dataset.pdfLib = 'true'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Unable to load PDF generator.'))
      document.body.appendChild(script)
    })
  }

  if (!window.PDFLib) throw new Error('PDF generator is not ready yet. Please try again.')
  return window.PDFLib
}

function sanitizePdfText(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/[^\x00-\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function buildClockingPdf({
  projectName,
  startDate,
  endDate,
  generatedAt,
  dateGroups
}: {
  projectName: string
  startDate: string
  endDate: string
  generatedAt: string
  dateGroups: ClockingDateGroup[]
}) {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib()
  const pdfDoc = await PDFDocument.create()
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 34
  const contentWidth = pageWidth - margin * 2

  const colors = {
    navy: rgb(0.12, 0.23, 0.54),
    slate: rgb(0.29, 0.36, 0.47),
    lightSlate: rgb(0.92, 0.95, 0.98),
    border: rgb(0.82, 0.87, 0.93),
    green: rgb(0.02, 0.58, 0.35),
    red: rgb(0.86, 0.15, 0.15),
    white: rgb(1, 1, 1),
    black: rgb(0.03, 0.05, 0.1)
  }

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  const addPage = () => {
    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = pageHeight - margin
  }

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) addPage()
  }

  const drawText = (text: string, x: number, textY: number, size = 10, font = regularFont, color = colors.black) => {
    page.drawText(sanitizePdfText(text), { x, y: textY, size, font, color })
  }

  const drawHeader = () => {
    page.drawRectangle({ x: margin, y: y - 86, width: contentWidth, height: 86, color: colors.navy })
    drawText('RASMSB', margin + 18, y - 28, 18, boldFont, colors.white)
    drawText('Daily Clocking Report', margin + 18, y - 52, 12, boldFont, colors.white)
    drawText(`Monitoring Site: ${projectName}`, margin + 310, y - 28, 9, boldFont, colors.white)
    drawText(`Date Range: ${formatDisplayDateStatic(startDate)} to ${formatDisplayDateStatic(endDate)}`, margin + 310, y - 46, 9, regularFont, colors.white)
    drawText('Operation Window: 08:00 AM to next day 08:00 AM', margin + 310, y - 64, 9, regularFont, colors.white)
    y -= 112
  }

  const drawSectionTitle = (title: string) => {
    ensureSpace(42)
    page.drawRectangle({ x: margin, y: y - 26, width: contentWidth, height: 26, color: colors.navy })
    drawText(title, margin + 12, y - 18, 11, boldFont, colors.white)
    y -= 42
  }

  const drawShift = (title: string, schedule: string, rounds: PatrolRoundRow[]) => {
    ensureSpace(58)
    page.drawRectangle({ x: margin, y: y - 30, width: contentWidth, height: 30, color: colors.lightSlate, borderColor: colors.border, borderWidth: 0.8 })
    drawText(`${title} (${schedule})`, margin + 12, y - 20, 10, boldFont, colors.navy)
    y -= 42

    if (rounds.length === 0) {
      ensureSpace(38)
      page.drawRectangle({ x: margin, y: y - 28, width: contentWidth, height: 28, borderColor: colors.border, borderWidth: 0.6 })
      drawText('No clocking records for this shift.', margin + 12, y - 19, 9, regularFont, colors.slate)
      y -= 42
      return
    }

    rounds.forEach((round, index) => {
      ensureSpace(78 + Math.max(1, round.checkpoints.length) * 22)
      page.drawRectangle({ x: margin, y: y - 38, width: contentWidth, height: 38, color: index % 2 === 0 ? rgb(0.98, 0.99, 1) : colors.white, borderColor: colors.border, borderWidth: 0.6 })
      drawText('GUARD', margin + 12, y - 13, 7, boldFont, colors.slate)
      drawText(round.guard, margin + 12, y - 28, 9, boldFont, colors.navy)
      drawText('START', margin + 150, y - 13, 7, boldFont, colors.slate)
      drawText(round.startTime, margin + 150, y - 28, 9, regularFont, colors.black)
      drawText('END', margin + 225, y - 13, 7, boldFont, colors.slate)
      drawText(round.endTime, margin + 225, y - 28, 9, regularFont, colors.black)
      drawText('DURATION', margin + 300, y - 13, 7, boldFont, colors.slate)
      drawText(round.duration, margin + 300, y - 28, 9, boldFont, colors.black)
      drawText('COMPLIANCE', margin + 395, y - 13, 7, boldFont, colors.slate)
      drawText(`${round.completedPoints}/${round.totalPoints} scanned`, margin + 395, y - 28, 9, boldFont, round.completedPoints === round.totalPoints ? colors.green : colors.red)
      y -= 48

      page.drawRectangle({ x: margin + 12, y: y - 19, width: contentWidth - 24, height: 19, color: colors.lightSlate })
      drawText('#', margin + 20, y - 13, 7, boldFont, colors.slate)
      drawText('CLOCKING POINT', margin + 48, y - 13, 7, boldFont, colors.slate)
      drawText('TIME', margin + 300, y - 13, 7, boldFont, colors.slate)
      drawText('PROOF', margin + 390, y - 13, 7, boldFont, colors.slate)
      drawText('STATUS', margin + 460, y - 13, 7, boldFont, colors.slate)
      y -= 22

      round.checkpoints.forEach((checkpoint, checkpointIndex) => {
        ensureSpace(24)
        const statusColor = checkpoint.status === 'completed' ? colors.green : checkpoint.status === 'missed' ? colors.red : colors.slate
        drawText(String(checkpointIndex + 1), margin + 20, y - 12, 8, regularFont, colors.black)
        drawText(checkpoint.name, margin + 48, y - 12, 8, boldFont, colors.black)
        drawText(checkpoint.time, margin + 300, y - 12, 8, regularFont, statusColor)
        drawText(checkpoint.imageUrl ? 'Yes' : 'None', margin + 390, y - 12, 8, regularFont, colors.slate)
        drawText(checkpoint.status.toUpperCase(), margin + 460, y - 12, 8, boldFont, statusColor)
        page.drawLine({ start: { x: margin + 12, y: y - 18 }, end: { x: margin + contentWidth - 12, y: y - 18 }, thickness: 0.35, color: colors.border })
        y -= 21
      })

      y -= 12
    })
  }

  drawHeader()
  dateGroups.forEach((group) => {
    drawSectionTitle(`CLOCKING REPORT: ${formatDisplayDateStatic(group.operationDate)}`)
    drawShift('DAY SHIFT', '08:00 AM - 08:00 PM', group.dayRounds)
    drawShift('NIGHT SHIFT', '08:00 PM - 08:00 AM', group.nightRounds)
  })

  const pages = pdfDoc.getPages()
  pages.forEach((pdfPage: any, index: number) => {
    pdfPage.drawText(sanitizePdfText(`Generated: ${generatedAt}`), {
      x: margin,
      y: 18,
      size: 7,
      font: regularFont,
      color: colors.slate
    })
    pdfPage.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: pageWidth - margin - 62,
      y: 18,
      size: 7,
      font: regularFont,
      color: colors.slate
    })
  })

  return await pdfDoc.save()
}

export default function ClockingReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: '#64748b', fontWeight: 700 }}>Loading clocking report...</div>}>
      <ClockingReportContent />
    </Suspense>
  )
}
