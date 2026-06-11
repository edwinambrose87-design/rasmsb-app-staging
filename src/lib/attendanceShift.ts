export type AttendanceShiftType = 'DAY' | 'NIGHT'

export interface AttendanceAutoCloseRow {
  id: string
  clock_in_time: string
  clock_out_time: string | null
  status: string | null
  actual_shift: string | null
}

export function normalizeAttendanceShift(shiftType?: string | null): AttendanceShiftType | null {
  if (shiftType?.toLowerCase().includes('night')) return 'NIGHT'
  if (shiftType?.toLowerCase().includes('day')) return 'DAY'
  return null
}

export function inferAttendanceShift(clockIn: Date): AttendanceShiftType {
  const minutes = clockIn.getHours() * 60 + clockIn.getMinutes()
  const dayHandoverStart = 7 * 60 + 45
  const nightHandoverStart = 19 * 60 + 45

  if (minutes >= nightHandoverStart || minutes < dayHandoverStart) return 'NIGHT'
  return 'DAY'
}

export function getAttendanceShiftEnd(clockIn: Date, actualShift?: string | null) {
  const shift = normalizeAttendanceShift(actualShift) || inferAttendanceShift(clockIn)
  const shiftEnd = new Date(clockIn)

  if (shift === 'DAY') {
    shiftEnd.setHours(20, 0, 0, 0)
  } else if (clockIn.getHours() >= 20) {
    shiftEnd.setDate(shiftEnd.getDate() + 1)
    shiftEnd.setHours(8, 0, 0, 0)
  } else {
    shiftEnd.setHours(8, 0, 0, 0)
  }

  if (shiftEnd.getTime() <= clockIn.getTime()) {
    shiftEnd.setDate(shiftEnd.getDate() + 1)
  }

  return shiftEnd
}

export async function autoCloseExpiredAttendanceRows<T extends AttendanceAutoCloseRow>(
  supabase: any,
  rows: T[],
  now = new Date()
) {
  const updatedRows = await Promise.all(rows.map(async (row) => {
    const clockIn = new Date(row.clock_in_time)
    const shiftEnd = getAttendanceShiftEnd(clockIn, row.actual_shift)
    const clockOut = row.clock_out_time ? new Date(row.clock_out_time) : null
    const shouldCloseOpenShift = !clockOut && now.getTime() > shiftEnd.getTime()
    const shouldCapLateClockOut = clockOut && clockOut.getTime() > shiftEnd.getTime()

    if (!shouldCloseOpenShift && !shouldCapLateClockOut) return row

    const autoClosedRow = {
      ...row,
      clock_out_time: shiftEnd.toISOString(),
      status: 'CLOCKED_OUT'
    }

    const { error } = await supabase
      .from('guard_attendance')
      .update({
        clock_out_time: autoClosedRow.clock_out_time,
        status: autoClosedRow.status
      })
      .eq('id', row.id)

    if (error) {
      console.error('Failed to auto-close expired attendance session:', error)
      return row
    }

    return autoClosedRow
  }))

  return updatedRows
}
