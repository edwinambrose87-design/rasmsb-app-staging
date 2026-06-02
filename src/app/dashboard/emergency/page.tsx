'use client'

export default function EmergencyContactPage() {
  const emergencySections = [
    {
      category: 'BOMBA (FIRE DEPARTMENT)',
      contacts: [
        { id: 1, name: 'Bomba Selangor HQ', phone: '03-7846 4444' },
        { id: 2, name: 'Balai Bomba Sungai Buloh', phone: '03-6156 2444' }
      ]
    },
    {
      category: 'POLICE (POLIS DIRAJA MALAYSIA)',
      contacts: [
        { id: 1, name: 'IPD Sungai Buloh', phone: '03-6157 2222' },
        { id: 2, name: 'Pondok Polis Medan Putra', phone: '03-6274 1122' }
      ]
    },
    {
      category: 'HOSPITAL (MEDICAL EMERGENCY)',
      contacts: [
        { id: 1, name: 'Hospital Sungai Buloh (Emergency)', phone: '03-6145 4333' },
        { id: 2, name: 'Klinik Kesihatan Sungai Buloh', phone: '03-6156 1355' }
      ]
    },
    {
      category: 'MANAGEMENT CONTACT DETAILS',
      contacts: [
        { id: 1, name: 'Edwin Ambrose (HQ Operations Manager)', phone: '012-345 6789' },
        { id: 2, name: 'Ahmad Faiz (Resident Building Manager)', phone: '017-987 6543' }
      ]
    }
  ]

  const triggerAddModal = (categoryName: string) => {
    alert(`Opening Entry Popup Form to add a new contact under: ${categoryName}`)
  }

  const triggerEditModal = (contactName: string, currentPhone: string) => {
    alert(`Opening Edit Popup Form for:\n${contactName}\nCurrent Line: ${currentPhone}`)
  }

  const triggerDeleteConfirm = (contactName: string) => {
    confirm(`Are you sure you want to permanently delete:\n"${contactName}"?`)
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100%', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '35px', maxWidth: '1200px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
          EMERGENCY CONTACT CONFIG
        </h1>
        <p style={{ color: '#64748b', marginTop: '5px' }}>
          Manage directory numbers synced directly to the Guard Patrol Mobile App.
        </p>
      </div>

      {/* Main Container Stack capped at 1200px */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '35px', maxWidth: '1200px', width: '100%' }}>
        {emergencySections.map((section, index) => (
          <div 
            key={index}
            style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              width: '100%'
            }}
          >
            {/* CARD HEADER */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              backgroundColor: '#f1f5f9', 
              borderBottom: '2px solid #e2e8f0',
              padding: '15px 25px'
            }}>
              <span style={{ fontSize: '14px', color: '#1e3a8a', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                {section.category}
              </span>
              <button
                onClick={() => triggerAddModal(section.category)}
                style={{
                  backgroundColor: '#1e3a8a',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>➕</span> Add Contact
              </button>
            </div>

            {/* CARD CONTENT */}
            <div style={{ padding: '10px 20px 20px 20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '8%' }}>#</th>
                    <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '47%' }}>STATION / OFFICER NAME</th>
                    <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '30%' }}>CONTACT NUMBER</th>
                    {/* Aligned to right to match the Add Contact boundary line cleanly */}
                    <th style={{ padding: '12px 10px', fontSize: '12px', color: '#64748b', width: '15%', textAlign: 'right', paddingRight: '15px' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {section.contacts.map((contact, idx) => (
                    <tr key={contact.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 10px', fontSize: '14px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '14px 10px', fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>
                        {contact.name}
                      </td>
                      <td style={{ padding: '14px 10px', fontSize: '14px', color: '#334155', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {contact.phone}
                      </td>
                      <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', paddingRight: '5px' }}>
                          {/* Edit Button */}
                          <button 
                            onClick={() => triggerEditModal(contact.name, contact.phone)}
                            style={{ 
                              backgroundColor: '#f1f5f9', 
                              color: '#475569', 
                              border: '1px solid #cbd5e1', 
                              padding: '6px 14px', 
                              borderRadius: '6px', 
                              fontSize: '13px', 
                              fontWeight: '600', 
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>✏️</span> Edit
                          </button>

                          {/* Clean Red Dustbin - Icon Only Layout */}
                          <button 
                            onClick={() => triggerDeleteConfirm(contact.name)}
                            title="Delete Listing"
                            style={{ 
                              backgroundColor: '#fef2f2', 
                              color: '#dc2626', 
                              border: '1px solid #fca5a5', 
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px', 
                              fontSize: '14px', 
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}