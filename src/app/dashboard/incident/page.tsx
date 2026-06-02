'use client'
import { useState } from 'react'

export default function IncidentReportPage() {
  const [startDate, setStartDate] = useState('2026-05-14')
  const [endDate, setEndDate] = useState('2026-05-16')
  const [expandedCardIds, setExpandedCardIds] = useState<number[]>([1])
  
  // Main Navigation Tab State ('LIVE' or 'VAULT')
  const [activeMainTab, setActiveMainTab] = useState<'LIVE' | 'VAULT'>('LIVE')
  
  // Inner Sub-Tab State for filtering Active vs Resolved Live Incidents
  const [activeSubTab, setActiveSubTab] = useState<'ACTIVE' | 'RESOLVED_HIST'>('ACTIVE')

  const [vaultSearch, setVaultSearch] = useState('')
  const [vaultSiteFilter, setVaultSiteFilter] = useState('ALL')

  // State-driven live operational incidents pool with updated 'NEW INCIDENT' status labels
  const [incidents, setIncidents] = useState([
    {
      id: 1,
      ticketNo: 'INC-2026-0089',
      date: '15-05-2026',
      time: '02:15 AM',
      pureDate: '2026-05-15',
      type: 'Property Damage / Vandalism',
      reportedBy: 'Guard Pratap',
      severity: 'MAJOR',
      status: 'NEW INCIDENT', 
      location: 'Block A, Basement Parking L1 (Column 12B)',
      description: 'During a routine patrol round, the guard discovered that the fire extinguisher glass case had been smashed open. The extinguisher was removed and sprayed across vehicles parked in lots 104 and 105. No suspects were found in the immediate vicinity.',
      actionTaken: 'Guards immediately cordoned off the area, notified the Resident Building Manager via intercom, and reviewed CCTV footage from Camera 04. Footage showed two youngsters trespassing through the exit ramp at 01:58 AM.',
      evidenceCount: 2
    },
    {
      id: 2,
      ticketNo: 'INC-2026-0090',
      date: '15-05-2026',
      time: '10:45 AM',
      pureDate: '2026-05-15',
      type: 'Facility Failure (Water Leak)',
      reportedBy: 'Guard Suresh Kumar',
      severity: 'CRITICAL',
      status: 'RESOLVED', 
      location: 'Block B, Level 14 Tech Riser Room',
      description: 'Main joint PVC water supply pipes burst causing immediate localized flooding out into the common elevator lobby walkway zones.',
      actionTaken: 'Internal maintenance shut down the master valves trunk immediately. Spent 2 hours vacuuming residual water spill volumes dry.',
      evidenceCount: 1
    },
    {
      id: 3,
      ticketNo: 'INC-2026-0091',
      date: '16-05-2026',
      time: '09:20 AM',
      pureDate: '2026-05-16',
      type: 'Trespassing / Loitering',
      reportedBy: 'Guard Maniam',
      severity: 'MINOR',
      status: 'PENDING ACTION', 
      location: 'Perimeter Fencing Section D (Near Water Pump)',
      description: 'Discovered a hole cut in the wire fencing fabric on the exterior boundary line.',
      actionTaken: 'Fencing hole temporarily patched shut with heavy security steel cable zip-ties. Perimeter round frequencies doubled.',
      evidenceCount: 3
    }
  ])

  // Sample static pool for long-term immutable compliance document receipts
  const [pdfVaultPool] = useState([
    { id: 'PDF-9921', date: '2026-05-20', site: 'Medan Putra Condominium', type: 'Property Damage / Vandalism', guard: 'Guard Pratap', supervisor: 'Edwin Ambrose', fileName: 'INCIDENT_LOG_MP_9921.pdf', size: '1.4 MB' },
    { id: 'PDF-9874', date: '2026-05-14', site: 'Villa Wangsamas', type: 'Facility Failure (Water Leak)', guard: 'Guard Ahmad Faiz', supervisor: 'Khairul Anwar', fileName: 'INCIDENT_LOG_VW_9874.pdf', size: '1.8 MB' },
    { id: 'PDF-9810', date: '2026-05-08', site: 'Lim Tyre Sunway', type: 'Trespassing / Loitering', guard: 'Guard Suresh Kumar', supervisor: 'Colin Ambrose', fileName: 'INCIDENT_LOG_LT_9810.pdf', size: '2.1 MB' }
  ])

  // Core Status Advancement Workflow State Machine
  const advanceTicketWorkflow = (id: number, currentStatus: string) => {
    setIncidents(prev => prev.map(ticket => {
      if (ticket.id !== id) return ticket
      let nextStatus = currentStatus
      if (currentStatus === 'NEW INCIDENT') {
        nextStatus = 'PENDING ACTION'
      } else if (currentStatus === 'PENDING ACTION') {
        nextStatus = 'RESOLVED'
      }
      return { ...ticket, status: nextStatus }
    }))
  }

  const toggleAccordion = (id: number) => {
    if (expandedCardIds.includes(id)) {
      setExpandedCardIds(expandedCardIds.filter(cardId => cardId !== id))
    } else {
      setExpandedCardIds([...expandedCardIds, id])
    }
  }

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  // Filter and Sort Incidents based on Main and Sub-Tabs chosen
  const getFilteredIncidents = () => {
    const dateBounded = incidents.filter(item => item.pureDate >= startDate && item.pureDate <= endDate)

    if (activeSubTab === 'ACTIVE') {
      const activeTickets = dateBounded.filter(item => item.status !== 'RESOLVED')
      
      // Sort priority layout: Force brand-new alerts ('NEW INCIDENT') to float above active items ('PENDING ACTION')
      return activeTickets.sort((a, b) => {
        if (a.status === 'NEW INCIDENT' && b.status !== 'NEW INCIDENT') return -1
        if (a.status !== 'NEW INCIDENT' && b.status === 'NEW INCIDENT') return 1
        return 0
      })
    } else {
      return dateBounded.filter(item => item.status === 'RESOLVED')
    }
  }

  const filteredIncidents = getFilteredIncidents()

  // Track the badge numbers specifically for 'NEW INCIDENT' ticket entries
  const newAlertsIndicatorCount = incidents.filter(item => item.status === 'NEW INCIDENT').length

  const filteredVaultRecords = pdfVaultPool.filter(record => {
    const matchesSite = vaultSiteFilter === 'ALL' || record.site === vaultSiteFilter
    const matchesSearch = record.type.toLowerCase().includes(vaultSearch.toLowerCase()) || 
                          record.guard.toLowerCase().includes(vaultSearch.toLowerCase()) ||
                          record.id.toLowerCase().includes(vaultSearch.toLowerCase())
    return matchesSite && matchesSearch
  })

  const mainTabStyle = (isActive: boolean) => ({
    padding: '10px 20px',
    backgroundColor: isActive ? '#1e3a8a' : 'transparent',
    color: isActive ? 'white' : '#64748b',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  })

  const subTabStyle = (isActive: boolean) => ({
    padding: '8px 16px',
    backgroundColor: isActive ? 'white' : 'transparent',
    color: isActive ? '#1e3a8a' : '#475569',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12.5px',
    fontWeight: isActive ? '700' : '600',
    cursor: 'pointer',
    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 0.15s ease'
  })

  const thStyle = { backgroundColor: '#f8fafc', padding: '14px 16px', fontSize: '11px', fontWeight: '700' as const, color: '#64748b', borderBottom: '2px solid #e2e8f0', textAlign: 'left' as const, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
  const tdStyle = { padding: '14px 16px', fontSize: '13px', color: '#334155', borderBottom: '1px solid #e2e8f0' }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%', boxSizing: 'border-box' }}>
      
      {/* ROW 1: Title Left & Main Navigation Tabs Right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', maxWidth: '1200px', width: '100%' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>INCIDENT REPORT LOGS</h1>
          <p style={{ color: '#64748b', marginTop: '5px', margin: 0 }}>Monitor safety logs, operational disruptions, and guard asset responses.</p>
        </div>

        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px', height: '44px', alignItems: 'center' }}>
          <button type="button" onClick={() => setActiveMainTab('LIVE')} style={mainTabStyle(activeMainTab === 'LIVE')}>
            🚨 Live Matrix Track
          </button>
          <button type="button" onClick={() => setActiveMainTab('VAULT')} style={mainTabStyle(activeMainTab === 'VAULT')}>
            🗄️ Archived PDF Vault
          </button>
        </div>
      </div>

      {/* ROW 2: Sub-toggles Left & Date Filters Right */}
      {activeMainTab === 'LIVE' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', maxWidth: '1200px', width: '100%' }}>
          
          <div style={{ display: 'flex', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0', gap: '4px', backgroundColor: '#f1f5f9' }}>
            <button type="button" onClick={() => setActiveSubTab('ACTIVE')} style={subTabStyle(activeSubTab === 'ACTIVE')}>
              ⚡ Active Incidents {newAlertsIndicatorCount > 0 && `(${newAlertsIndicatorCount})`}
            </button>
            <button type="button" onClick={() => setActiveSubTab('RESOLVED_HIST')} style={subTabStyle(activeSubTab === 'RESOLVED_HIST')}>
              ✅ Resolved History
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ backgroundColor: 'white', padding: '8px 16px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px', height: '46px', boxSizing: 'border-box' }}>
              <div onClick={() => document.getElementById('inc-start-picker')?.showPicker()} style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', cursor: 'pointer' }}>
                <label style={{ fontSize: '8px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px' }}>START DATE</label>
                <span style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '12px' }}>{formatDisplayDate(startDate)}</span>
                <input id="inc-start-picker" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
              </div>
              <div style={{ color: '#cbd5e1', fontWeight: 'bold', fontSize: '11px' }}>➔</div>
              <div onClick={() => document.getElementById('inc-end-picker')?.showPicker()} style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', cursor: 'pointer' }}>
                <label style={{ fontSize: '8px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px' }}>END DATE</label>
                <span style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '12px' }}>{formatDisplayDate(endDate)}</span>
                <input id="inc-end-picker" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
              </div>
            </div>
            <button onClick={() => alert('Exporting active logs...')} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0 20px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 'bold', cursor: 'pointer', height: '46px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>Export Logs</button>
          </div>

        </div>
      )}

      {/* COMPONENT CONTENT FRAME VIEWPORT CONTAINER */}
      <div style={{ maxWidth: '1200px', width: '100%' }}>
        
        {activeMainTab === 'LIVE' ? (
          /* SUB-VIEW 1: LIVE INCIDENT DATA STREAM MATRIX CARDS */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', width: '100%' }}>
            {filteredIncidents.map((incident) => {
              const isExpanded = expandedCardIds.includes(incident.id)

              return (
                <div key={incident.id} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', overflow: 'hidden', width: '100%' }}>
                  
                  <div onClick={() => toggleAccordion(incident.id)} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', borderBottom: isExpanded ? '2px solid #e2e8f0' : 'none', padding: '18px 20px', width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                    <div style={{ flex: '1 1 18%' }}><span style={{ fontSize: '10px', color: '#64748b' }}>TICKET NO</span><br/><span style={{ fontSize: '14px', color: '#1e3a8a', fontWeight: 'bold' }}>{incident.ticketNo}</span></div>
                    <div style={{ flex: '1 1 15%' }}><span style={{ fontSize: '10px', color: '#64748b' }}>DATE / TIME</span><br/><span style={{ fontSize: '13.5px', color: '#334155' }}>{incident.date}</span><br/><span style={{ fontSize: '12px', color: '#64748b' }}>{incident.time}</span></div>
                    <div style={{ flex: '1 1 25%' }}><span style={{ fontSize: '10px', color: '#64748b' }}>INCIDENT TYPE</span><br/><span style={{ fontSize: '14px', color: '#1e293b', fontWeight: 'bold' }}>{incident.type}</span></div>
                    <div style={{ flex: '1 1 17%' }}><span style={{ fontSize: '10px', color: '#64748b' }}>REPORTED BY</span><br/><span style={{ fontSize: '14px', color: '#475569' }}>{incident.reportedBy}</span></div>
                    
                    <div style={{ flex: '1 1 10%' }}>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>SEVERITY</span><br/>
                      <span style={{ backgroundColor: incident.severity === 'CRITICAL' ? '#ef4444' : incident.severity === 'MAJOR' ? '#f59e0b' : '#3b82f6', color: 'white', fontSize: '11px', fontWeight: 'bold', padding: '3px 9px', borderRadius: '4px', display: 'inline-block', marginTop: '2px' }}>{incident.severity}</span>
                    </div>

                    <div style={{ flex: '1 1 15%' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px' }}>STATUS</span>
                      <span style={{ color: incident.status === 'NEW INCIDENT' ? '#ef4444' : incident.status === 'PENDING ACTION' ? '#2563eb' : '#10b981', fontSize: '13px', fontWeight: incident.status === 'NEW INCIDENT' ? '700' : '400' }}>
                        • {incident.status}
                      </span>
                    </div>

                    <div style={{ flex: '1 1 3%', textAlign: 'right', color: '#1e3a8a', fontSize: '14px' }}>{isExpanded ? '▲' : '▼'}</div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '25px', backgroundColor: 'white' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '15px 20px', borderRadius: '8px', borderLeft: '4px solid #1e3a8a', marginBottom: '25px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>EXACT LOCATION FIELD</span>
                        <span style={{ fontSize: '14.5px', color: '#1e293b', fontWeight: 'bold' }}>📍 {incident.location}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '25px' }}>
                        <div>
                          <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', margin: '0 0 8px 0' }}>DETAILED INCIDENT DESCRIPTION</h4>
                          <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.6', margin: 0 }}>{incident.description}</p>
                        </div>
                        <div>
                          <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', margin: '0 0 8px 0' }}>IMMEDIATE ACTION TAKEN BY SECURITY FORCE</h4>
                          <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.6', margin: 0 }}>{incident.actionTaken}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9', marginTop: '10px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Attached Files: {incident.evidenceCount} Photographic Evidences captured via Mobile App</span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button onClick={() => alert('Viewing evidence log assets...')} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>View Photo Evidence</button>

                          {incident.status === 'NEW INCIDENT' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); advanceTicketWorkflow(incident.id, incident.status); }}
                              style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Acknowledge
                            </button>
                          )}

                          {incident.status === 'PENDING ACTION' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); advanceTicketWorkflow(incident.id, incident.status); }}
                              style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Resolve
                            </button>
                          )}

                          {incident.status === 'RESOLVED' && (
                            <button
                              disabled
                              style={{ backgroundColor: '#cbd5e1', color: '#64748b', border: 'none', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'not-allowed' }}
                            >
                              Resolved Archive Locked
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )
            })}

            {filteredIncidents.length === 0 && (
              <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' }}>
                No active incidents mapped within this selection deck timeline query.
              </div>
            )}
          </div>
        ) : (
          /* SUB-VIEW 2: IMMUTABLE COMPLIANCE PDF RECORDS VAULT */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', marginTop: '5px' }}>
            
            <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px 25px', display: 'flex', gap: '20px', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <div style={{ flex: 1 }}>
                <input 
                  type="text" 
                  placeholder="Search vault files by record token, guard identity, or situation type..."
                  value={vaultSearch}
                  onChange={(e) => setVaultSearch(e.target.value)}
                  style={{ width: '100%', padding: '11px 15px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>PROJECT LOGS:</span>
                <select value={vaultSiteFilter} onChange={(e) => setVaultSiteFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer', outline: 'none' }}>
                  <option value="ALL">All Deployment Sites</option>
                  <option value="Medan Putra Condominium">Medan Putra Condominium</option>
                  <option value="Villa Wangsamas">Villa Wangsamas</option>
                  <option value="Lim Tyre Sunway">Lim Tyre Sunway</option>
                </select>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Record Token ID</th>
                    <th style={thStyle}>Archived Date</th>
                    <th style={thStyle}>Deployment Site Location</th>
                    <th style={thStyle}>Classification Type</th>
                    <th style={thStyle}>Reporting Guard</th>
                    <th style={thStyle}>Validating Manager</th>
                    <th style={thStyle}>Compliance Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVaultRecords.map((record) => (
                    <tr key={record.id} style={{ transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 'bold', color: '#1e3a8a' }}>{record.id}</td>
                      <td style={tdStyle}>{record.date}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{record.site}</td>
                      <td style={tdStyle}>{record.type}</td>
                      <td style={tdStyle}>{record.guard}</td>
                      <td style={tdStyle}>⚙️ {record.supervisor}</td>
                      <td style={tdStyle}>
                        <button 
                          type="button"
                          onClick={() => alert(`📄 Initializing secure document streaming download payload: ${record.fileName}`)}
                          style={{ backgroundColor: '#ffffff', border: '1px solid #1e3a8a', color: '#1e3a8a', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease' }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1e3a8a'; e.currentTarget.style.color = '#ffffff' }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = '#1e3a8a' }}
                        >
                          📥 Download PDF ({record.size})
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}