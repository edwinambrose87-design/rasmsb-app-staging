'use client'
import { useState } from 'react'

export default function VMSPage() {
  // Active Tab state tracking: 'visitor' | 'contractor' | 'delivery' | 'all-onsite'
  const [activeTab, setActiveTab] = useState<'visitor' | 'contractor' | 'delivery' | 'all-onsite'>('visitor')
  
  // Interactive state-driven date parameters
  const [startDate, setStartDate] = useState('2026-05-15')
  const [endDate, setEndDate] = useState('2026-05-16')

  // Master VMS Ledger Dataset with Phone Numbers & Category Labels
  const vmsLogs = {
    visitor: [
      { id: 1, name: 'Anwar Ibrahim', ic: '850312-14-5543', phone: '012-334 5566', vehicle: 'WUY 8821', type: 'Car', unit: 'Block A, A-14-05', checkIn: '15-05-2026 08:30 AM', checkOut: '15-05-2026 11:15 AM', status: 'DEPARTED', color: '#10b981', pureDate: '2026-05-15', categoryLabel: 'Visitor' },
      { id: 2, name: 'Sarah Connor', ic: '921104-10-5226', phone: '017-665 1122', vehicle: 'VBF 432', type: 'Car', unit: 'Block B, B-03-11', checkIn: '15-05-2026 02:45 PM', checkOut: '-- : --', status: 'ON-SITE', color: '#f59e0b', pureDate: '2026-05-15', categoryLabel: 'Visitor' },
      { id: 3, name: 'Tan Sri Lim', ic: '610718-08-6113', phone: '019-221 9999', vehicle: 'BND 9', type: 'Car', unit: 'Block A, Penthouse 2', checkIn: '16-05-2026 09:00 AM', checkOut: '-- : --', status: 'ON-SITE', color: '#f59e0b', pureDate: '2026-05-16', categoryLabel: 'Visitor' }
    ],
    contractor: [
      { id: 1, name: 'Ah Seng Renovation', ic: 'Reg: AS-99412-M', phone: '016-445 8811', vehicle: 'VGV 7761', type: 'Lorry/Van', unit: 'Block B, B-18-02', checkIn: '15-05-2026 09:00 AM', checkOut: '15-05-2026 05:00 PM', status: 'DEPARTED', color: '#10b981', pureDate: '2026-05-15', categoryLabel: 'Contractor' },
      { id: 2, name: 'KL Lift Tech Support', ic: 'Reg: KLL-2231', phone: '03-6156 4432', vehicle: 'WQA 1152', type: 'Van', unit: 'Passenger Lift Car 2', checkIn: '15-05-2026 11:15 AM', checkOut: '15-05-2026 01:30 PM', status: 'DEPARTED', color: '#10b981', pureDate: '2026-05-15', categoryLabel: 'Contractor' },
      { id: 3, name: 'Syabas Plumbing Team', ic: 'Reg: SYB-901', phone: '013-887 2255', vehicle: 'BND 4421', type: 'Pickup Truck', unit: 'Main Water Tank Room', checkIn: '16-05-2026 08:15 AM', checkOut: '-- : --', status: 'ON-SITE', color: '#f59e0b', pureDate: '2026-05-16', categoryLabel: 'Contractor' }
    ],
    delivery: [
      { id: 1, name: 'Mani (GrabFood)', ic: 'Order: #GRB-9982', phone: '011-2345 9911', vehicle: 'AFQ 9921', type: 'Motorcycle', unit: 'Block A, A-08-02', checkIn: '15-05-2026 12:15 PM', checkOut: '15-05-2026 12:28 PM', status: 'DEPARTED', color: '#10b981', pureDate: '2026-05-15', categoryLabel: 'Delivery Rider' },
      { id: 2, name: 'Asraf (Foodpanda)', ic: 'Order: #PND-1102', phone: '014-998 3344', vehicle: 'BLK 442', type: 'Motorcycle', unit: 'Block B, B-22-14', checkIn: '15-05-2026 01:05 PM', checkOut: '15-05-2026 01:18 PM', status: 'DEPARTED', color: '#10b981', pureDate: '2026-05-15', categoryLabel: 'Delivery Rider' },
      { id: 3, name: 'Shopee Express Courier', ic: 'Logistics Trunk', phone: '012-774 6633', vehicle: 'VCH 8812', type: 'Van', unit: 'Guard House Drop-off', checkIn: '16-05-2026 10:10 AM', checkOut: '-- : --', status: 'ON-SITE', color: '#f59e0b', pureDate: '2026-05-16', categoryLabel: 'Delivery Rider' }
    ]
  }

  // Calculate total active ON-SITE personnel dynamically per category tab
  const getOnSiteCount = (category: 'visitor' | 'contractor' | 'delivery') => {
    return vmsLogs[category].filter(item => {
      const matchDate = item.pureDate >= startDate && item.pureDate <= endDate
      return matchDate && item.status === 'ON-SITE'
    }).length
  }

  // Dynamic counter aggregating ALL categories combined who are ON-SITE within the filter timeline
  const getTotalOnSiteCount = () => {
    const v = vmsLogs.visitor.filter(i => i.pureDate >= startDate && i.pureDate <= endDate && i.status === 'ON-SITE').length
    const c = vmsLogs.contractor.filter(i => i.pureDate >= startDate && i.pureDate <= endDate && i.status === 'ON-SITE').length
    const d = vmsLogs.delivery.filter(i => i.pureDate >= startDate && i.pureDate <= endDate && i.status === 'ON-SITE').length
    return v + c + d
  }

  // Master Data Grid Filter Engine Configuration
  let filteredData = []
  if (activeTab === 'all-onsite') {
    const combined = [...vmsLogs.visitor, ...vmsLogs.contractor, ...vmsLogs.delivery]
    filteredData = combined.filter(item => {
      return item.pureDate >= startDate && item.pureDate <= endDate && item.status === 'ON-SITE'
    })
  } else {
    filteredData = vmsLogs[activeTab].filter(item => {
      return item.pureDate >= startDate && item.pureDate <= endDate
    })
  }

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  const handleDownloadExcel = () => {
    alert(`Exporting Sorted VMS Access Spreadsheet...\nCategory View: ${activeTab.toUpperCase()}`);
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100%', width: '100%', boxSizing: 'border-box' }}>
      
      {/* HEADER SECTION */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        marginBottom: '35px', 
        maxWidth: '1200px',
        width: '100%' 
      }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
            VISITOR MANAGEMENT SYSTEM (VMS)
          </h1>
          <p style={{ color: '#64748b', marginTop: '5px', margin: 0 }}>Monitor vehicle check-ins, contractor access passes, and delivery rider metrics.</p>
        </div>

        {/* CONTROLS AREA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ 
            backgroundColor: 'white', padding: '10px 20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px', height: '56px', boxSizing: 'border-box'
          }}>
            <div onClick={() => (document.getElementById('vms-start-picker') as HTMLInputElement)?.showPicker()} style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', cursor: 'pointer' }}>
              <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px' }}>START DATE</label>
              <span style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '13px' }}>{formatDisplayDate(startDate)}</span>
              <input id="vms-start-picker" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            </div>
            <div style={{ color: '#cbd5e1', fontWeight: 'bold' }}>➔</div>
            <div onClick={() => (document.getElementById('vms-end-picker') as HTMLInputElement)?.showPicker()} style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', cursor: 'pointer' }}>
              <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px' }}>END DATE</label>
              <span style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '13px' }}>{formatDisplayDate(endDate)}</span>
              <input id="vms-end-picker" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            </div>
          </div>

          <button onClick={handleDownloadExcel} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', height: '56px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>
            Export Access Log
          </button>
        </div>
      </div>

      {/* CLEANED NAVIGATION TABS CONTROL MATRIX WITH RAW COUNT BUBBLES */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '25px', maxWidth: '1200px', flexWrap: 'wrap' }}>
        {[
          { id: 'visitor', label: '👤 General Visitors', count: getOnSiteCount('visitor'), type: 'standard' },
          { id: 'contractor', label: '🛠️ Contractors', count: getOnSiteCount('contractor'), type: 'standard' }, // Changed to "Contractors"
          { id: 'delivery', label: '🛵 Delivery Riders / Grab', count: getOnSiteCount('delivery'), type: 'standard' },
          { id: 'all-onsite', label: '📍 All On-Site', count: getTotalOnSiteCount(), type: 'emergency' } // Changed to "All On-Site"
        ].map((tab) => {
          const isSelected = activeTab === tab.id
          const badgeBg = tab.type === 'emergency' ? '#dc2626' : (isSelected ? '#ef4444' : '#fee2e2')
          const badgeText = tab.type === 'emergency' ? 'white' : (isSelected ? 'white' : '#dc2626')
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                backgroundColor: isSelected ? (tab.type === 'emergency' ? '#dc2626' : '#1e3a8a') : 'white',
                color: isSelected ? 'white' : '#475569',
                border: isSelected ? 'none' : '1px solid #cbd5e1',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.15)' : 'none'
              }}
            >
              <span>{tab.label}</span>
              {/* Clean Number Badge only */}
              <span style={{
                backgroundColor: badgeBg,
                color: badgeText,
                fontSize: '12px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '20px',
                display: 'inline-block'
              }}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* MASTER DATA TABLE CARD */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', 
        border: '1px solid #e2e8f0', 
        maxWidth: '1200px', 
        width: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '15px 25px', backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0', fontWeight: 'bold', color: '#1e3a8a', fontSize: '14px' }}>
          {activeTab === 'all-onsite' ? '🔴 EMERGENCY DIRECTORY: UNIFIED LIVE PRESENCE LISTING' : 'REAL-TIME ACCESS AUDIT LEDGER'}
        </div>

        <div style={{ padding: '10px 20px 20px 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '5%' }}>#</th>
                <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '32%' }}>LOGGED ACCOUNT CREDENTIALS</th>
                <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '18%' }}>VEHICLE (TYPE)</th>
                <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '15%' }}>DESTINATION UNIT</th>
                <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '20%' }}>CHECK-IN / OUT TIME</th>
                <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '10%', textAlign: 'center' }}>LIVE STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((log, idx) => (
                  <tr key={`${activeTab}-${log.id}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 10px', fontSize: '14px', color: '#64748b' }}>{idx + 1}</td>
                    
                    {/* Column 1: Clean, Distinct Separate Rows for Name, Phone Number, and Identification Code */}
                    <td style={{ padding: '14px 10px' }}>
                      <span style={{ fontSize: '14.5px', color: '#1e293b', fontWeight: '700', display: 'block' }}>{log.name}</span>
                      <span style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: 'bold', display: 'block', marginTop: '3px' }}>📞 {log.phone}</span>
                      <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', display: 'block', marginTop: '3px' }}>
                        ID: {log.ic} {activeTab === 'all-onsite' && `• [${(log as any).categoryLabel}]`}
                      </span>
                    </td>
                    
                    <td style={{ padding: '14px 10px' }}>
                      <span style={{ fontSize: '14px', color: '#1e3a8a', fontWeight: 'bold', display: 'block' }}>{log.vehicle}</span>
                      <span style={{ fontSize: '12px', color: '#475569', fontWeight: '500', display: 'block', marginTop: '2px' }}>🚘 {log.type}</span>
                    </td>

                    <td style={{ padding: '14px 10px', fontSize: '14px', color: '#334155', fontWeight: '500' }}>{log.unit}</td>
                    <td style={{ padding: '14px 10px', fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                      🟢 {log.checkIn}<br/>
                      🔴 {log.checkOut}
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <span style={{ 
                        backgroundColor: log.color + '15', 
                        color: log.color, 
                        fontSize: '11px', 
                        fontWeight: 'bold', 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        border: `1px solid ${log.color}30`,
                        display: 'inline-block'
                      }}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
                    No active on-site listings found matching the specified range filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}