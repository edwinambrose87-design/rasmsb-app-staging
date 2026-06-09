'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useBrand } from '@/context/BrandContext'

type ShiftType = 'DAY' | 'NIGHT'

interface AttendanceRow {
  id: string
  guard_id: string | null
  project_id: string | null
  clock_in_time: string
  clock_out_time: string | null
  status: string | null
}

interface GuardRow {
  id: string
  name: string | null
  staff_id: string | null
  shift_type: string | null
}

interface ProjectRow {
  id: string
  name: string
  slug: string
}

interface AttendanceRecord {
  id: string
  date: string
  shift: ShiftType
  guardName: string
  guardId: string
  schedule: string
  clockIn: string
  clockOut: string
  totalHours: string
  arrivalStatus: 'ON TIME' | 'LATE'
  dutyStatus: string
}

const DAY_SCHEDULE = '08:00 AM - 08:00 PM'
const NIGHT_SCHEDULE = '08:00 PM - 08:00 AM'

function AttendanceReportContent() {
  const searchParams = useSearchParams()
  const activeProjectSlug = searchParams.get('project')
  const { themeColor } = useBrand()

  const today = useMemo(() => new Date(), [])
  const defaultStartDate = useMemo(() => {
    const date = new Date(today)
    date.setDate(date.getDate() - 14)
    return toInputDate(date)
  }, [today])
  const defaultEndDate = useMemo(() => toInputDate(today), [today])

  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [activeProject, setActiveProject] = useState<ProjectRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [scopeNotice, setScopeNotice] = useState<string | null>(null)

  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  )

  const lightBg = themeColor === '#dc2626' ? '#fef2f2' : '#eff6ff'
  const borderBg = themeColor === '#dc2626' ? '#fee2e2' : '#dbeafe'
  const textBg = themeColor === '#dc2626' ? '#b91c1c' : '#1d4ed8'

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    setScopeNotice(null)

    try {
      let projectId: string | null = null

      if (activeProjectSlug) {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, slug')
          .eq('slug', activeProjectSlug)
          .maybeSingle()

        if (projectError) throw projectError
        setActiveProject(projectData)
        projectId = projectData?.id || null
      } else {
        setActiveProject(null)
      }

      const rangeStart = new Date(`${startDate}T00:00:00`)
      const rangeEnd = new Date(`${endDate}T00:00:00`)
      rangeEnd.setDate(rangeEnd.getDate() + 1)

      let attendanceQuery = supabase
        .from('guard_attendance')
        .select('id, guard_id, project_id, clock_in_time, clock_out_time, status')
        .gte('clock_in_time', rangeStart.toISOString())
        .lt('clock_in_time', rangeEnd.toISOString())
        .order('clock_in_time', { ascending: false })

      if (projectId) {
        attendanceQuery = attendanceQuery.eq('project_id', projectId)
      }

      const { data: attendanceData, error: attendanceError } = await attendanceQuery
      if (attendanceError) throw attendanceError

      let rows = (attendanceData || []) as AttendanceRow[]

      if (projectId && rows.length === 0) {
        const { data: allAttendanceData, error: allAttendanceError } = await supabase
          .from('guard_attendance')
          .select('id, guard_id, project_id, clock_in_time, clock_out_time, status')
          .gte('clock_in_time', rangeStart.toISOString())
          .lt('clock_in_time', rangeEnd.toISOString())
          .order('clock_in_time', { ascending: false })

        if (allAttendanceError) throw allAttendanceError

        const fallbackRows = (allAttendanceData || []) as AttendanceRow[]
        if (fallbackRows.length > 0) {
          rows = fallbackRows
          setScopeNotice(
            `Attendance rows exist for this date range, but none are linked to ${activeProjectSlug || 'the selected project'}. Showing available rows so you can verify project_id mapping.`
          )
        }
      }

      const guardIds = Array.from(new Set(rows.map(row => row.guard_id).filter(Boolean))) as string[]
      const guardsById = new Map<string, GuardRow>()

      if (guardIds.length > 0) {
        const { data: guardData, error: guardError } = await supabase
          .from('guards')
          .select('id, name, staff_id, shift_type')
          .in('id', guardIds)

        if (guardError) throw guardError
        ;((guardData || []) as GuardRow[]).forEach(guard => guardsById.set(guard.id, guard))
      }

      setAttendanceRecords(rows.map(row => mapAttendanceRecord(row, guardsById.get(row.guard_id || ''))))
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load attendance records.')
      setAttendanceRecords([])
    } finally {
      setIsLoading(false)
    }
  }, [activeProjectSlug, endDate, startDate, supabase])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-attendance-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guard_attendance' }, () => {
        fetchAttendance()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAttendance, supabase])

  const activeTimelineDates = useMemo(() => {
    const dateSet = new Set(attendanceRecords.map(record => record.date))
    return Array.from(dateSet).sort((a, b) => b.localeCompare(a))
  }, [attendanceRecords])

  const handleExportCsv = () => {
    const headers = ['Date', 'Shift', 'Guard Name', 'Staff ID', 'Schedule', 'Clock In', 'Clock Out', 'Hours', 'Status']
    const csvRows = attendanceRecords.map(record => [
      record.date,
      record.shift,
      record.guardName,
      record.guardId,
      record.schedule,
      record.clockIn,
      record.clockOut,
      record.totalHours,
      record.dutyStatus
    ])
    const csv = [headers, ...csvRows].map(row => row.map(escapeCsvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `attendance-report-${startDate}-to-${endDate}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100%', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '35px', maxWidth: '1200px', width: '100%', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: themeColor, margin: 0, transition: 'color 0.3s ease' }}>
            ATTENDANCE REPORT
          </h1>
          <p style={{ color: '#64748b', marginTop: '5px', margin: 0 }}>
            {activeProject ? `Live guard attendance for ${activeProject.name}.` : 'Live guard attendance across available sites.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: 'white', padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px', minHeight: '56px', boxSizing: 'border-box' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', cursor: 'pointer' }}>
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>START DATE</span>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} style={{ color: themeColor, fontWeight: '600', fontSize: '13px', border: 'none', outline: 'none', background: 'transparent' }} />
            </label>
            <div style={{ color: '#cbd5e1' }}>TO</div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', cursor: 'pointer' }}>
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>END DATE</span>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} style={{ color: themeColor, fontWeight: '600', fontSize: '13px', border: 'none', outline: 'none', background: 'transparent' }} />
            </label>
          </div>
          <button onClick={handleExportCsv} disabled={attendanceRecords.length === 0} style={{ backgroundColor: attendanceRecords.length === 0 ? '#94a3b8' : '#10b981', color: 'white', border: 'none', padding: '0 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: attendanceRecords.length === 0 ? 'not-allowed' : 'pointer', height: '56px' }}>
            Export Attendance Log
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '35px', color: '#64748b', fontWeight: '700', maxWidth: '1200px' }}>
          Syncing live attendance records...
        </div>
      )}

      {!isLoading && errorMessage && (
        <div style={{ backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca', padding: '22px', color: '#b91c1c', fontWeight: '700', maxWidth: '1200px' }}>
          {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && attendanceRecords.length === 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '35px', color: '#64748b', fontWeight: '700', maxWidth: '1200px' }}>
          No attendance records found for this date range.
        </div>
      )}

      {!isLoading && !errorMessage && attendanceRecords.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', maxWidth: '1200px', width: '100%' }}>
          {scopeNotice && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '10px', padding: '14px 18px', fontSize: '13px', fontWeight: '700', lineHeight: 1.5 }}>
              {scopeNotice}
            </div>
          )}

          {activeTimelineDates.map((targetDate) => {
            const dayShiftGuards = attendanceRecords.filter(record => record.date === targetDate && record.shift === 'DAY')
            const nightShiftGuards = attendanceRecords.filter(record => record.date === targetDate && record.shift === 'NIGHT')

            return (
              <div key={targetDate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ backgroundColor: themeColor, padding: '12px 20px', borderRadius: '8px', color: 'white', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background-color 0.3s ease' }}>
                  ATTENDANCE : {formatDisplayDate(targetDate)}
                </div>

                <AttendanceShiftTable title="DAY SHIFT" schedule={DAY_SCHEDULE} rows={dayShiftGuards} headerBg={lightBg} headerBorder={borderBg} headerText={textBg} />
                <AttendanceShiftTable title="NIGHT SHIFT" schedule={NIGHT_SCHEDULE} rows={nightShiftGuards} headerBg="#f8fafc" headerBorder="#e2e8f0" headerText="#334155" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AttendanceShiftTable({
  title,
  schedule,
  rows,
  headerBg,
  headerBorder,
  headerText
}: {
  title: string
  schedule: string
  rows: AttendanceRecord[]
  headerBg: string
  headerBorder: string
  headerText: string
}) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', backgroundColor: headerBg, borderBottom: `1px solid ${headerBorder}`, fontWeight: 'bold', color: headerText, fontSize: '13.5px' }}>
        {title} ({schedule})
      </div>

      <div style={{ padding: '10px 20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
              <th style={thStyle}>GUARD DETAILS</th>
              <th style={thStyle}>SCHEDULED SHIFT</th>
              <th style={thStyle}>CLOCK IN / CLOCK OUT</th>
              <th style={thStyle}>HOURS LOG</th>
              <th style={thStyle}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '22px 8px', fontSize: '13px', color: '#94a3b8', fontWeight: '700' }}>No records for this shift.</td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 8px', verticalAlign: 'top' }}>
                  <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block' }}>{row.guardName}</strong>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>ID: {row.guardId}</span>
                </td>
                <td style={{ padding: '14px 8px', fontSize: '13px', color: '#475569', verticalAlign: 'top' }}>{row.schedule}</td>
                <td style={{ padding: '14px 8px', fontSize: '13px', verticalAlign: 'top' }}>
                  <span style={{ color: '#10b981', fontWeight: '600', display: 'block' }}>In: {row.clockIn}</span>
                  <span style={{ color: '#ef4444', fontWeight: '600', display: 'block', marginTop: '3px' }}>Out: {row.clockOut}</span>
                </td>
                <td style={{ padding: '14px 8px', fontSize: '13.5px', color: '#1e293b', fontWeight: 'bold', verticalAlign: 'top' }}>{row.totalHours}</td>
                <td style={{ padding: '14px 8px', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ backgroundColor: row.arrivalStatus === 'LATE' ? '#ea580c' : '#10b981', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '3px 7px', borderRadius: '4px' }}>{row.arrivalStatus}</span>
                    <span style={{ backgroundColor: row.dutyStatus === 'ACTIVE' ? '#2563eb' : '#64748b', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '3px 7px', borderRadius: '4px' }}>{row.dutyStatus}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function mapAttendanceRecord(row: AttendanceRow, guard?: GuardRow): AttendanceRecord {
  const clockIn = new Date(row.clock_in_time)
  const clockOut = row.clock_out_time ? new Date(row.clock_out_time) : null
  const shift = resolveShift(clockIn, guard?.shift_type)
  const schedule = shift === 'NIGHT' ? NIGHT_SCHEDULE : DAY_SCHEDULE

  return {
    id: row.id,
    date: toInputDate(clockIn),
    shift,
    guardName: guard?.name || 'Unknown Guard',
    guardId: guard?.staff_id || 'UNLINKED',
    schedule,
    clockIn: formatDateTime(clockIn),
    clockOut: clockOut ? formatDateTime(clockOut) : 'Active shift',
    totalHours: clockOut ? formatDuration(clockIn, clockOut) : 'In Progress',
    arrivalStatus: isLate(clockIn, shift) ? 'LATE' : 'ON TIME',
    dutyStatus: clockOut ? normalizeStatus(row.status, 'COMPLETED') : 'ACTIVE'
  }
}

function resolveShift(clockIn: Date, shiftType?: string | null): ShiftType {
  if (shiftType?.toLowerCase().includes('night')) return 'NIGHT'
  if (shiftType?.toLowerCase().includes('day')) return 'DAY'
  return clockIn.getHours() >= 18 || clockIn.getHours() < 6 ? 'NIGHT' : 'DAY'
}

function isLate(clockIn: Date, shift: ShiftType) {
  const scheduledStart = new Date(clockIn)
  scheduledStart.setHours(shift === 'DAY' ? 8 : 20, 15, 0, 0)
  return clockIn.getTime() > scheduledStart.getTime()
}

function normalizeStatus(status: string | null, fallback: string) {
  if (!status) return fallback
  return status.replace(/_/g, ' ').toUpperCase()
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

function formatDisplayDate(dateStr: string) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function formatDuration(start: Date, end: Date) {
  const diffMs = Math.max(0, end.getTime() - start.getTime())
  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

function toInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

const thStyle = {
  padding: '12px 8px',
  fontSize: '11px',
  color: '#64748b',
  width: '20%'
}

export default function AttendanceReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: '#64748b', fontWeight: '700' }}>Loading attendance report...</div>}>
      <AttendanceReportContent />
    </Suspense>
  )
}
