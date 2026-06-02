'use client'
import { useState } from 'react'
import { useBrand } from '@/context/BrandContext'

export default function SystemConfigPage() {
  const { themeColor } = useBrand()

  // 1. Critical Incident Escalation (On/Off Toggle State)
  const [isSmsEnabled, setIsSmsEnabled] = useState(true)
  const [phoneNumbers, setPhoneNumbers] = useState('012-554 9911, 03-7846 4444')

  // 2. Expanded Server Data Retention Lifecycles
  const [vmsTimeline, setVmsTimeline] = useState('90 Days')
  const [incidentMediaTimeline, setIncidentMediaTimeline] = useState('365 Days')
  const [attendanceTimeline, setAttendanceTimeline] = useState('180 Days')   // New Field
  const [clockingTimeline, setClockingTimeline] = useState('180 Days')       // New Field
  const [incidentPdfTimeline, setIncidentPdfTimeline] = useState('Forever')   // Suggested Field
  const [auditLogTimeline, setAuditLogTimeline] = useState('90 Days')         // Suggested Field

  const handleApplyConfiguration = () => {
    alert('💾 System architecture properties successfully updated across active server runtimes!')
  }

  // Consistent Global Styling Elements
  const containerStyle = { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '30px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', marginBottom: '30px' }
  const mainHeaderStyle = { fontSize: '13px', color: themeColor, fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' as const, borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }
  const labelStyle = { fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px', letterSpacing: '0.3px', textTransform: 'uppercase' as const }
  const selectStyle = { padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13.5px', color: '#1e293b', backgroundColor: '#fff', outline: 'none', cursor: 'pointer', width: '100%' }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%', boxSizing: 'border-box' }}>
      
      {/* PAGE HEADER */}
      <div style={{ marginBottom: '35px', maxWidth: '1000px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: themeColor, margin: 0, transition: 'color 0.3s ease' }}>SYSTEM CONFIGURATION</h1>
        <p style={{ color: '#64748b', marginTop: '5px', margin: 0 }}>Configure master incident protocols, security routing parameters, and data storage lifecycles.</p>
      </div>

      <div style={{ maxWidth: '1000px', width: '100%' }}>
        
        {/* SECTION 1: CRITICAL INCIDENT ESCALATION MATRIX */}
        <div style={containerStyle}>
          <h2 style={mainHeaderStyle}>🚨 Critical Incident Escalation Matrix (SMS)</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* iOS Styled On/Off Switch Toggle Grid Element */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '15px 20px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', display: 'block' }}>Automated SMS Dispatcher</span>
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'block' }}>Broadcast immediate routing alerts to admin contacts when a "CRITICAL" log is captured.</span>
              </div>
              
              {/* Custom Toggle Track */}
              <div 
                onClick={() => setIsSmsEnabled(!isSmsEnabled)}
                style={{ width: '50px', height: '28px', backgroundColor: isSmsEnabled ? themeColor : '#cbd5e1', borderRadius: '15px', padding: '2px', cursor: 'pointer', transition: 'background-color 0.2s ease', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}
              >
                {/* Custom Toggle Knob */}
                <div style={{ width: '24px', height: '24px', backgroundColor: 'white', borderRadius: '50%', transform: isSmsEnabled ? 'translateX(22px)' : 'translateX(0px)', transition: 'transform 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            {/* Input fields for phone dispatch targets */}
            <div style={{ opacity: isSmsEnabled ? 1 : 0.5, transition: 'opacity 0.2s' }}>
              <label style={labelStyle}>Emergency Target Phone Numbers (Comma Separated)</label>
              <input 
                type="text" 
                disabled={!isSmsEnabled}
                value={phoneNumbers} 
                onChange={(e) => setPhoneNumbers(e.target.value)} 
                style={{ padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%', fontSize: '14px', color: '#1e293b', outline: 'none', boxSizing: 'border-box', backgroundColor: isSmsEnabled ? '#ffffff' : '#f1f5f9' }} 
              />
            </div>

          </div>
        </div>

        {/* SECTION 2: SERVER DATA RETENTION LIFECYCLE GRID */}
        <div style={containerStyle}>
          <h2 style={mainHeaderStyle}>💾 Server Data Retention Lifecycle</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px 35px' }}>
            
            <div>
              <label style={labelStyle}>Visitor (VMS) Purge Timeline</label>
              <select value={vmsTimeline} onChange={(e) => setVmsTimeline(e.target.value)} style={selectStyle}>
                <option>30 Days</option><option>60 Days</option><option>90 Days</option><option>180 Days</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Incident Media Retention</label>
              <select value={incidentMediaTimeline} onChange={(e) => setIncidentMediaTimeline(e.target.value)} style={selectStyle}>
                <option>90 Days</option><option>180 Days</option><option>365 Days</option><option>Forever</option>
              </select>
            </div>

            {/* NEW: Attendance Report Purge Configuration */}
            <div>
              <label style={labelStyle}>Attendance Report Log Retention</label>
              <select value={attendanceTimeline} onChange={(e) => setAttendanceTimeline(e.target.value)} style={selectStyle}>
                <option>90 Days</option><option>180 Days</option><option>365 Days</option><option>Forever</option>
              </select>
            </div>

            {/* NEW: Clocking Report Purge Configuration */}
            <div>
              <label style={labelStyle}>Clocking Guard Log Retention</label>
              <select value={clockingTimeline} onChange={(e) => setClockingTimeline(e.target.value)} style={selectStyle}>
                <option>90 Days</option><option>180 Days</option><option>365 Days</option><option>Forever</option>
              </select>
            </div>

            {/* SUGGESTED: Incident PDF Archival Policy */}
            <div>
              <label style={labelStyle}>Incident PDF Report Logs (Suggested)</label>
              <select value={incidentPdfTimeline} onChange={(e) => setIncidentPdfTimeline(e.target.value)} style={selectStyle}>
                <option>1 Year</option><option>3 Years</option><option>5 Years</option><option>Forever</option>
              </select>
            </div>

            {/* SUGGESTED: Management Operational Audit Trails */}
            <div>
              <label style={labelStyle}>Portal System Audit Trails (Suggested)</label>
              <select value={auditLogTimeline} onChange={(e) => setAuditLogTimeline(e.target.value)} style={selectStyle}>
                <option>30 Days</option><option>90 Days</option><option>180 Days</option><option>365 Days</option>
              </select>
            </div>

          </div>
        </div>

        {/* MASTER ACTIONS CONTROL ROW */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button 
            type="button" 
            onClick={handleApplyConfiguration}
            style={{ backgroundColor: themeColor, color: 'white', border: 'none', padding: '14px 35px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: 'transform 0.1s ease' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
          >
            Apply Configuration
          </button>
        </div>

      </div>
    </div>
  )
}