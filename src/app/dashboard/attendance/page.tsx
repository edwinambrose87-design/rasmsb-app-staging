'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useBrand } from '@/context/BrandContext'

type ShiftType = 'DAY' | 'NIGHT'

declare global {
  interface Window {
    PDFLib?: any
  }
}

interface AttendanceRow {
  id: string
  guard_id: string | null
  project_id: string | null
  clock_in_time: string
  clock_out_time: string | null
  status: string | null
  scheduled_shift: string | null
  actual_shift: string | null
  attendance_type: string | null
  shift_exception_reason: string | null
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
  attendanceType: 'NORMAL' | 'OT'
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
    date.setDate(date.getDate() - 3)
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
  const startDateRef = useRef<HTMLInputElement | null>(null)
  const endDateRef = useRef<HTMLInputElement | null>(null)

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
        .select('id, guard_id, project_id, clock_in_time, clock_out_time, status, scheduled_shift, actual_shift, attendance_type, shift_exception_reason')
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
          .select('id, guard_id, project_id, clock_in_time, clock_out_time, status, scheduled_shift, actual_shift, attendance_type, shift_exception_reason')
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

  const handleExportPdf = async () => {
    const projectName = activeProject?.name || 'All Sites'
    const reportDates = activeTimelineDates.length > 0 ? activeTimelineDates : [startDate]
    const generatedAt = new Intl.DateTimeFormat('en-MY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date())

    try {
      const pdfBytes = await buildAttendancePdf({
        projectName,
        startDate,
        endDate,
        generatedAt,
        reportDates,
        records: attendanceRecords
      })
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `attendance-report-${startDate}-to-${endDate}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate attendance PDF.')
    }
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '58px', boxSizing: 'border-box', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)' }}>
            <label onClick={() => openDatePicker(startDateRef.current)} style={{ display: 'grid', gridTemplateColumns: '1fr 34px', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 8px 6px 12px', minWidth: '150px', borderRadius: '9px', backgroundColor: '#f8fafc' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>START DATE</span>
                <input ref={startDateRef} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} style={{ color: themeColor, fontWeight: '700', fontSize: '13px', border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', width: '110px' }} />
              </span>
              <button type="button" onClick={(event) => { event.preventDefault(); openDatePicker(startDateRef.current) }} aria-label="Open start date calendar" style={{ width: '34px', height: '34px', border: 'none', borderRadius: '8px', backgroundColor: '#ffffff', color: themeColor, fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                📅
              </button>
            </label>
            <label onClick={() => openDatePicker(endDateRef.current)} style={{ display: 'grid', gridTemplateColumns: '1fr 34px', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 8px 6px 12px', minWidth: '150px', borderRadius: '9px', backgroundColor: '#f8fafc' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>END DATE</span>
                <input ref={endDateRef} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} style={{ color: themeColor, fontWeight: '700', fontSize: '13px', border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', width: '110px' }} />
              </span>
              <button type="button" onClick={(event) => { event.preventDefault(); openDatePicker(endDateRef.current) }} aria-label="Open end date calendar" style={{ width: '34px', height: '34px', border: 'none', borderRadius: '8px', backgroundColor: '#ffffff', color: themeColor, fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                📅
              </button>
            </label>
          </div>
          <button onClick={handleExportPdf} disabled={attendanceRecords.length === 0} style={{ backgroundColor: attendanceRecords.length === 0 ? '#94a3b8' : '#10b981', color: 'white', border: 'none', padding: '0 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: attendanceRecords.length === 0 ? 'not-allowed' : 'pointer', height: '56px' }}>
            Download Report
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
                    {row.attendanceType === 'OT' ? (
                      <span style={{ backgroundColor: '#ea580c', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '3px 7px', borderRadius: '4px' }}>OT</span>
                    ) : (
                      <span style={{ backgroundColor: row.arrivalStatus === 'LATE' ? '#ea580c' : '#10b981', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '3px 7px', borderRadius: '4px' }}>{row.arrivalStatus}</span>
                    )}
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
  const shift = normalizeShift(row.actual_shift) || inferShiftFromClockIn(clockIn)
  const scheduledShift = normalizeShift(row.scheduled_shift) || normalizeShift(guard?.shift_type) || shift
  const schedule = scheduledShift === 'NIGHT' ? NIGHT_SCHEDULE : DAY_SCHEDULE
  const attendanceType = row.attendance_type?.toUpperCase() === 'OT' ? 'OT' : 'NORMAL'

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
    attendanceType,
    dutyStatus: clockOut ? normalizeStatus(row.status, 'COMPLETED') : 'ACTIVE'
  }
}

function normalizeShift(shiftType?: string | null): ShiftType | null {
  if (shiftType?.toLowerCase().includes('night')) return 'NIGHT'
  if (shiftType?.toLowerCase().includes('day')) return 'DAY'
  return null
}

function inferShiftFromClockIn(clockIn: Date): ShiftType {
  return clockIn.getHours() >= 20 || clockIn.getHours() < 8 ? 'NIGHT' : 'DAY'
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

async function buildAttendancePdf({
  projectName,
  startDate,
  endDate,
  generatedAt,
  reportDates,
  records
}: {
  projectName: string
  startDate: string
  endDate: string
  generatedAt: string
  reportDates: string[]
  records: AttendanceRecord[]
}) {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib()
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 34
  const contentWidth = pageWidth - margin * 2
  const navy = rgb(0.11, 0.24, 0.55)
  const slate = rgb(0.29, 0.36, 0.45)
  const border = rgb(0.87, 0.9, 0.94)
  const green = rgb(0.02, 0.59, 0.41)
  const red = rgb(0.86, 0.15, 0.15)
  const orange = rgb(0.92, 0.35, 0.05)
  const blue = rgb(0.15, 0.39, 0.92)
  const gray = rgb(0.39, 0.45, 0.55)

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - 34

  const addPage = () => {
    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = pageHeight - 34
    drawHeader(false)
  }

  const ensureSpace = (height: number) => {
    if (y - height < 36) addPage()
  }

  const drawText = (value: string, x: number, yPos: number, size = 9, options?: { bold?: boolean; color?: any; maxWidth?: number }) => {
    page.drawText(sanitizePdfText(value), {
      x,
      y: yPos,
      size,
      font: options?.bold ? boldFont : font,
      color: options?.color || rgb(0.06, 0.09, 0.16),
      maxWidth: options?.maxWidth
    })
  }

  const drawHeader = (full: boolean) => {
    drawText('RASMSB', margin, y, 18, { bold: true, color: navy })
    y -= 23
    drawText('Daily Attendance Report', margin, y, 14, { bold: true, color: navy })
    y -= 16
    if (full) {
      drawText(`Monitoring Site: ${projectName}`, margin, y, 9, { color: slate })
      y -= 13
      drawText(`Date Range: ${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}    Generated: ${generatedAt}`, margin, y, 9, { color: slate })
      y -= 16
    }
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1.4, color: navy })
    y -= 18
  }

  const drawBadge = (value: string, x: number, yPos: number, color: any) => {
    const width = Math.max(22, boldFont.widthOfTextAtSize(value, 7) + 9)
    page.drawRectangle({ x, y: yPos - 3, width, height: 12, color })
    drawText(value, x + 4, yPos, 7, { bold: true, color: rgb(1, 1, 1) })
    return width
  }

  const drawWrapped = (value: string, x: number, yPos: number, width: number, size = 8, isBold = false, color: any = rgb(0.06, 0.09, 0.16)) => {
    const words = sanitizePdfText(value).split(/\s+/)
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      const measured = (isBold ? boldFont : font).widthOfTextAtSize(next, size)
      if (measured > width && line) {
        lines.push(line)
        line = word
      } else {
        line = next
      }
    }
    if (line) lines.push(line)
    lines.slice(0, 3).forEach((lineText, index) => drawText(lineText, x, yPos - index * (size + 2), size, { bold: isBold, color }))
  }

  const drawShift = (title: string, schedule: string, rows: AttendanceRecord[]) => {
    ensureSpace(72)
    page.drawRectangle({ x: margin, y: y - 17, width: contentWidth, height: 22, color: rgb(0.94, 0.97, 1), borderColor: rgb(0.86, 0.92, 1), borderWidth: 0.7 })
    drawText(`${title} (${schedule})`, margin + 8, y - 9, 10, { bold: true, color: navy })
    y -= 32

    const cols = [margin, margin + 120, margin + 230, margin + 362, margin + 424]
    drawText('GUARD DETAILS', cols[0], y, 7, { bold: true, color: slate })
    drawText('SCHEDULED SHIFT', cols[1], y, 7, { bold: true, color: slate })
    drawText('CLOCK IN / OUT', cols[2], y, 7, { bold: true, color: slate })
    drawText('HOURS', cols[3], y, 7, { bold: true, color: slate })
    drawText('STATUS', cols[4], y, 7, { bold: true, color: slate })
    y -= 8
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.7, color: border })
    y -= 14

    if (rows.length === 0) {
      drawText('No records for this shift.', margin, y, 9, { bold: true, color: rgb(0.58, 0.64, 0.72) })
      y -= 24
      return
    }

    for (const row of rows) {
      ensureSpace(44)
      const rowTop = y
      drawWrapped(row.guardName, cols[0], rowTop, 110, 8.5, true)
      drawText(`ID: ${row.guardId}`, cols[0], rowTop - 13, 7, { color: slate })
      drawWrapped(row.schedule, cols[1], rowTop, 96, 8, false, slate)
      drawText(`In: ${row.clockIn}`, cols[2], rowTop, 8, { bold: true, color: green })
      drawText(`Out: ${row.clockOut}`, cols[2], rowTop - 12, 8, { bold: true, color: red })
      drawWrapped(row.totalHours, cols[3], rowTop, 52, 8, true)

      let statusX = cols[4]
      if (row.attendanceType === 'OT') {
        statusX += drawBadge('OT', statusX, rowTop, orange) + 4
      } else {
        statusX += drawBadge(row.arrivalStatus, statusX, rowTop, row.arrivalStatus === 'LATE' ? orange : green) + 4
      }
      drawBadge(row.dutyStatus, statusX, rowTop, row.dutyStatus === 'ACTIVE' ? blue : gray)

      y -= 30
      page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: border })
      y -= 10
    }
  }

  drawHeader(true)
  for (const targetDate of reportDates) {
    ensureSpace(64)
    page.drawRectangle({ x: margin, y: y - 16, width: contentWidth, height: 22, color: navy })
    drawText(`ATTENDANCE: ${formatDisplayDate(targetDate)}`, margin + 10, y - 8, 10, { bold: true, color: rgb(1, 1, 1) })
    y -= 34
    drawShift('DAY SHIFT', DAY_SCHEDULE, records.filter(record => record.date === targetDate && record.shift === 'DAY'))
    y -= 8
    drawShift('NIGHT SHIFT', NIGHT_SCHEDULE, records.filter(record => record.date === targetDate && record.shift === 'NIGHT'))
    y -= 12
  }

  return pdfDoc.save()
}

function toInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function loadPdfLib() {
  if (window.PDFLib) return window.PDFLib

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-pdf-lib="true"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load PDF generator.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = '/vendor/pdf-lib.min.js'
    script.async = true
    script.dataset.pdfLib = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load PDF generator.'))
    document.body.appendChild(script)
  })

  if (!window.PDFLib) throw new Error('PDF generator is unavailable.')
  return window.PDFLib
}

function sanitizePdfText(value: string) {
  return value.replace(/[^\x20-\x7E]/g, '')
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
