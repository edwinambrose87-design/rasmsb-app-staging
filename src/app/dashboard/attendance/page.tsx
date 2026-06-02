'use client'
import { useState } from 'react'
import { useBrand } from '@/context/BrandContext' // Import branding hook

export default function AttendanceReportPage() {
  const [startDate, setStartDate] = useState('2026-05-14')
  const [endDate, setEndDate] = useState('2026-05-15')
  
  // Pull the dynamic color variable chosen by the manager
  const { themeColor } = useBrand()

  // Helper functions to generate lighter tint variations for row headers dynamically
  const getLightTint = (hex: string) => {
    return hex === '#dc2626' ? '#fef2f2' : '#eff6ff' // Red tint vs Blue tint
  }
  const getBorderTint = (hex: string) => {
    return hex === '#dc2626' ? '#fee2e2' : '#dbeafe'
  }
  const getTextTint = (hex: string) => {
    return hex === '#dc2626' ? '#b91c1c' : '#1d4ed8'
  }

  const lightBg = getLightTint(themeColor)
  const borderBg = getBorderTint(themeColor)
  const textBg = getTextTint(themeColor)

  const [attendanceRecords] = useState([
    { id: 1, date: '2026-05-14', shift: 'DAY', guardName: 'Pratap', guardId: 'RAS-089', schedule: '08:00 AM - 08:00 PM', clockIn: '07:54 AM (14/05/26)', clockOut: '08:02 PM (14/05/26)', totalHours: '12 Hrs', arrivalStatus: 'ON TIME', isBuffer: false, bufferFor: '' },
    { id: 2, date: '2026-05-14', shift: 'DAY', guardName: 'Suresh Kumar', guardId: 'RAS-090', schedule: '08:00 AM - 08:00 PM', clockIn: '08:24 AM (14/05/26)', clockOut: '08:00 PM (14/05/26)', totalHours: '12 Hrs', arrivalStatus: 'LATE', isBuffer: false, bufferFor: '' },
    { id: 3, date: '2026-05-14', shift: 'NIGHT', guardName: 'Vikram Singh', guardId: 'RAS-204', schedule: '08:00 PM - 08:00 AM', clockIn: '07:58 PM (14/05/26)', clockOut: '08:00 AM (15/05/26)', totalHours: '12 Hrs', arrivalStatus: 'ON TIME', isBuffer: true, bufferFor: 'Maniam (Medical Leave)' },
    { id: 4, date: '2026-05-15', shift: 'DAY', guardName: 'Vikram Singh', guardId: 'RAS-204', schedule: '08:00 AM - 08:00 PM', clockIn: '08:00 AM (15/05/26)', clockOut: '12:00 PM (15/05/26)', totalHours: '4 Hrs', arrivalStatus: 'ON TIME', isBuffer: true, bufferFor: 'Maniam (Extended OT Coverage)' },
    { id: 5, date: '2026-05-15', shift: 'DAY', guardName: 'Maniam', guardId: 'RAS-091', schedule: '08:00 AM - 08:00 PM', clockIn: '12:00 PM (15/05/26)', clockOut: '08:00 PM (15/05/26)', totalHours: '8 Hrs', arrivalStatus: 'ON TIME', isBuffer: false, bufferFor: '' },
    { id: 6, date: '2026-05-15', shift: 'DAY', guardName: 'Pratap', guardId: 'RAS-089', schedule: '08:00 AM - 08:00 PM', clockIn: '07:50 AM (15/05/26)', clockOut: '08:05 PM (15/05/26)', totalHours: '12 Hrs', arrivalStatus: 'ON TIME', isBuffer: false, bufferFor: '' }
  ])

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  const activeTimelineDates = ['2026-05-14', '2026-05-15']

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100%', width: '100%', boxSizing: 'border-box' }}>
      
      {/* HEADER CONTROLS - TITLE DYNAMICALLY MATCHES MAIN THEME */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '35px', maxWidth: '1200px', width: '100%' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: themeColor, margin: 0, transition: 'color 0.3s ease' }}>
            ATTENDANCE REPORT
          </h1>
          <p style={{ color: '#64748b', marginTop: '5px', margin: 0 }}>Track guard turn-up tracking metrics, shift timelines, and overtime tracking audits.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: 'white', padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px', height: '56px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>START DATE</label>
              <span style={{ color: themeColor, fontWeight: '600', fontSize: '13px' }}>{formatDisplayDate(startDate)}</span>
            </div>
            <div style={{ color: '#cbd5e1' }}>➔</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>END DATE</label>
              <span style={{ color: themeColor, fontWeight: '600', fontSize: '13px' }}>{formatDisplayDate(endDate)}</span>
            </div>
          </div>
          <button style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', height: '56px' }}>
            Export Attendance Log
          </button>
        </div>
      </div>

      {/* TIMELINE TIMESTAMPS LOOP */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', maxWidth: '1200px', width: '100%' }}>
        {activeTimelineDates.map((targetDate) => {
          const dayShiftGuards = attendanceRecords.filter(r => r.date === targetDate && r.shift === 'DAY')
          const nightShiftGuards = attendanceRecords.filter(r => r.date === targetDate && r.shift === 'NIGHT')
          const textFormatDate = formatDisplayDate(targetDate)

          return (
            <div key={targetDate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* DYNAMIC: Banner background follows themeColor selection perfectly */}
              <div style={{ backgroundColor: themeColor, padding: '12px 20px', borderRadius: '8px', color: 'white', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background-color 0.3s ease' }}>
                <span>📅</span> ATTENDANCE : {textFormatDate}
              </div>

              {/* ☀️ DAY SHIFT SUB-TABLE */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {/* DYNAMIC: Inner row title adaptively changes backgrounds & text colors */}
                <div style={{ padding: '14px 20px', backgroundColor: lightBg, borderBottom: `1px solid ${borderBg}`, fontWeight: 'bold', color: textBg, fontSize: '13.5px' }}>
                  ☀️ DAY SHIFT (08:00 AM - 08:00 PM)
                </div>
                
                <div style={{ padding: '10px 20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                        <th style={{ padding: '12px 8px', fontSize: '11px', color: '#64748b', width: '28%' }}>GUARD DETAILS</th>
                        <th style={{ padding: '12px 8px', fontSize: '11px', color: '#64748b', width: '18%' }}>SCHEDULED SHIFT</th>
                        <th style={{ padding: '12px 8px', fontSize: '11px', color: '#64748b', width: '26%' }}>CLOCK IN / CLOCK OUT</th>
                        <th style={{ padding: '12px 8px', fontSize: '11px', color: '#64748b', width: '12%' }}>HOURS LOG</th>
                        <th style={{ padding: '12px 8px', fontSize: '11px', color: '#64748b', width: '16%' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayShiftGuards.map((row) => (
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
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                              <span style={{ backgroundColor: row.arrivalStatus === 'LATE' ? '#ea580c' : '#10b981', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '3px 7px', borderRadius: '4px' }}>{row.arrivalStatus}</span>
                              <span style={{ color: '#cbd5e1', fontSize: '12px' }}>/</span>
                              <span style={{ backgroundColor: '#64748b', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '3px 7px', borderRadius: '4px' }}>COMPLETED</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 🌙 NIGHT SHIFT SUB-TABLE */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#334155', fontSize: '13.5px' }}>
                  🌙 NIGHT SHIFT (08:00 PM - 08:00 AM)
                </div>
                
                <div style={{ padding: '10px 20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                        <th style={{ padding: '12px 8px', fontSize: '11px', color: '#64748b', width: '28%' }}>GUARD DETAILS</th>
                        <th style={{ padding: '12px 8px', fontSize: '11px', color: '#64748b', width: '18%' }}>SCHEDULED SHIFT</th>
                        <th style={{ padding: '12px 8px', fontSize: '11px', color: '#64748b', width: '26%' }}>CLOCK IN / CLOCK OUT</th>
                        <th style={{ padding: '12px 8px', fontSize: '11px', color: '#64748b', width: '12%' }}>HOURS LOG</th>
                        <th style={{ padding: '12px 8px', fontSize: '11px', color: '#64748b', width: '16%' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nightShiftGuards.map((row) => (
                        <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 8px', verticalAlign: 'top' }}>
                            <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block' }}>{row.guardName}</strong>
                            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>ID: {row.guardId}</span>
                            {row.isBuffer && (
                              <div style={{ marginTop: '6px' }}>
                                <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>BUFFER GUARD</span>
                                <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600', display: 'block', marginTop: '2px' }}>↳ {row.bufferFor}</span>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 8px', fontSize: '13px', color: '#475569', verticalAlign: 'top' }}>{row.schedule}</td>
                          <td style={{ padding: '14px 8px', fontSize: '13px', verticalAlign: 'top' }}>
                            <span style={{ color: '#10b981', fontWeight: '600', display: 'block' }}>In: {row.clockIn}</span>
                            <span style={{ color: '#ef4444', fontWeight: '600', display: 'block', marginTop: '3px' }}>Out: {row.clockOut}</span>
                          </td>
                          <td style={{ padding: '14px 8px', fontSize: '13.5px', color: '#1e293b', fontWeight: 'bold', verticalAlign: 'top' }}>{row.totalHours}</td>
                          <td style={{ padding: '14px 8px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                              <span style={{ backgroundColor: row.arrivalStatus === 'LATE' ? '#ea580c' : '#10b981', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '3px 7px', borderRadius: '4px' }}>{row.arrivalStatus}</span>
                              <span style={{ color: '#cbd5e1', fontSize: '12px' }}>/</span>
                              <span style={{ backgroundColor: '#64748b', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '3px 7px', borderRadius: '4px' }}>COMPLETED</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )
        })}
      </div>

    </div>
  )
}