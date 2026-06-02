'use client'
import { useState } from 'react'
import { useBrand } from '@/context/BrandContext'

export default function SystemLogsPage() {
  const { themeColor } = useBrand()

  // State hooks for our interactive panel filters
  const [userFilter, setUserFilter] = useState('ALL')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Realistic sample ledger tracking the actions we've performed in our previous sessions
  const [logsPool] = useState([
    { id: 1, timestamp: '2026-05-25 02:15 AM', user: 'Edwin Ambrose', role: 'Admin', action: 'GEOFENCE_MODIFIED', target: 'Medan Putra Condominium', details: 'Radius expanded from 25m ➔ 80m', ip: '175.136.44.12' },
    { id: 2, timestamp: '2026-05-25 01:40 AM', user: 'Khairul Anwar', role: 'Manager', action: 'GUARD_REASSIGNED', target: 'Suresh Kumar (RAS-090)', details: 'Deployed ➔ Villa Wangsamas', ip: '210.186.5.99' },
    { id: 3, timestamp: '2026-05-25 01:10 AM', user: 'Edwin Ambrose', role: 'Admin', action: 'PROJECT_IMAGE_UPLOAD', target: 'Lim Tyre Sunway', details: 'Replaced placeholder asset with official display logo', ip: '175.136.44.12' },
    { id: 4, timestamp: '2026-05-24 11:32 PM', user: 'Colin Ambrose', role: 'Manager', action: 'GUARD_REGISTERED', target: 'Ali Abu (RAS-317)', details: 'Profile initialized with stacked width modal input structure', ip: '60.53.112.14' },
    { id: 5, timestamp: '2026-05-24 09:15 PM', user: 'Khairul Anwar', role: 'Manager', action: 'PORTAL_PASSWORD_CHANGED', target: 'villa_wangsamas', details: 'Administrative password reset logged', ip: '210.186.5.99' },
    { id: 6, timestamp: '2026-05-23 04:20 PM', user: 'Edwin Ambrose', role: 'Admin', action: 'SYS_RETENTION_UPDATED', target: 'Server Lifecycle Management', details: 'Attendance and Clocking logs retention set to 180 Days', ip: '175.136.44.12' }
  ])

  // Filter logic pipeline
  const filteredLogs = logsPool.filter(log => {
    const matchesUser = userFilter === 'ALL' || log.user === userFilter
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter
    const matchesSearch = log.target.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.details.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesUser && matchesAction && matchesSearch
  })

  // CSS Style configuration maps
  const thStyle = { backgroundColor: '#f8fafc', padding: '14px 16px', fontSize: '11px', fontWeight: '700', color: '#64748b', borderBottom: '2px solid #e2e8f0', textAlign: 'left' as const, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
  const tdStyle = { padding: '14px 16px', fontSize: '13px', color: '#334155', borderBottom: '1px solid #e2e8f0' }
  const filterSelectStyle = { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#1e293b', fontSize: '13px', fontWeight: '600', outline: 'none', cursor: 'pointer' }

  // Action badge colors helper
  const getActionBadgeStyle = (action: string) => {
    let bg = '#e2e8f0'; let text = '#475569'
    if (action.includes('REGISTERED') || action.includes('UPLOAD')) { bg = '#dcfce7'; text = '#15803d' }
    if (action.includes('MODIFIED') || action.includes('UPDATED')) { bg = '#fef9c3'; text = '#a16207' }
    if (action.includes('PASSWORD')) { bg = '#fee2e2'; text = '#b91c1c' }
    if (action.includes('REASSIGNED')) { bg = '#dbeafe'; text = '#1d4ed8' }
    return { backgroundColor: bg, color: text, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', fontFamily: 'monospace' }
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%', boxSizing: 'border-box' }}>
      
      {/* PAGE HEADER */}
      <div style={{ marginBottom: '35px', maxWidth: '1200px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: themeColor, margin: 0 }}>PORTAL SYSTEM AUDIT TRAIL</h1>
        <p style={{ color: '#64748b', marginTop: '5px', margin: 0 }}>Real-time row-by-row cryptographic logging of administrative modifications, coordinate overrides, and system configuration adjustments.</p>
      </div>

      {/* FILTER CONTROLS HUB WORKSPACE */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '25px', maxWidth: '1200px', width: '100%', boxSizing: 'border-box' }}>
        
        <div style={{ flex: 1 }}>
          <input 
            type="text" 
            placeholder="Search logs by keyword target or details..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '11px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>MANAGER:</span>
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={filterSelectStyle}>
            <option value="ALL">All Accounts</option>
            <option value="Edwin Ambrose">Edwin Ambrose</option>
            <option value="Khairul Anwar">Khairul Anwar</option>
            <option value="Colin Ambrose">Colin Ambrose</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>ACTION TYPE:</span>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={filterSelectStyle}>
            <option value="ALL">All Operations</option>
            <option value="GEOFENCE_MODIFIED">Geofence Changes</option>
            <option value="GUARD_REASSIGNED">Guard Re-routing</option>
            <option value="GUARD_REGISTERED">New Registrations</option>
            <option value="PORTAL_PASSWORD_CHANGED">Credential Adjustments</option>
            <option value="SYS_RETENTION_UPDATED">Lifecycle Configurations</option>
          </select>
        </div>

      </div>

      {/* MASTER DATA AUDIT LEDGER TABLE */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden', maxWidth: '1200px', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>User Profile</th>
              <th style={thStyle}>Action Identifier</th>
              <th style={thStyle}>Target Scope</th>
              <th style={thStyle}>Modification Details</th>
              <th style={thStyle}>Network IP</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} style={{ transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#64748b' }}>{log.timestamp}</td>
                <td style={tdStyle}>
                  <strong>{log.user}</strong>
                  <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', fontWeight: 'bold' }}>{log.role.toUpperCase()}</span>
                </td>
                <td style={tdStyle}>
                  <span style={getActionBadgeStyle(log.action)}>{log.action}</span>
                </td>
                <td style={{ ...tdStyle, fontWeight: '600' }}>{log.target}</td>
                <td style={{ ...tdStyle, color: '#475569', fontStyle: 'italic' }}>{log.details}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#94a3b8', fontSize: '12px' }}>{log.ip}</td>
              </tr>
            ))}

            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}>
                  No system audit receipts match your active filtering configuration query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}