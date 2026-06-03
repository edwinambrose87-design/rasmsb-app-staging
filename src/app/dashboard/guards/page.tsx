'use client'
import { useState, useEffect } from 'react'
import { useBrand } from '@/context/BrandContext'
import { createBrowserClient } from '@supabase/ssr'

interface ProjectOption {
  id: string
  name: string
}

interface GuardItem {
  id: string
  name: string
  staffId: string
  nationality: string
  phone: string
  assignedPost: string
  shift: 'DAY' | 'NIGHT'
  siteId: string | null
  siteName: string
  status: 'ON DUTY' | 'OFF DUTY' | 'ON LEAVE'
  statusBg: string
  avatarSrc: string
}

export default function GuardsDirectoryPage() {
  const { themeColor } = useBrand() 
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL')
  const [siteFilter, setSiteFilter] = useState<string>('ALL')
  const [zoomedGuardId, setZoomedGuardId] = useState<string | null>(null)
  
  const [pendingSites, setPendingSites] = useState<Record<string, string>>({})
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [guardsPool, setGuardsPool] = useState<GuardItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [editingGuardId, setEditingGuardId] = useState<string | null>(null) 

  const defaultGuardData = { name: '', staffId: '', nationality: 'Malaysian', phone: '', assignedPost: 'Main Gate House', shift: 'DAY' as const, siteId: 'UNASSIGNED', avatarSrc: '' }
  const [newGuardData, setNewGuardData] = useState(defaultGuardData)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchDatabaseResources = async () => {
    try {
      setIsLoading(true)
      
      const { data: dbProjects, error: projErr } = await supabase
        .from('projects')
        .select('id, name')
        .order('name', { ascending: true })
      
      if (projErr) throw projErr
      const mappedProjects = dbProjects || []
      setProjects(mappedProjects.map(p => ({ id: p.id, name: p.name })))

      const { data: dbGuards, error: guardErr } = await supabase
        .from('guards')
        .select('*')

      if (guardErr) throw guardErr

      if (dbGuards) {
        const mappedGuards: GuardItem[] = dbGuards.map(g => {
          const projectMatch = mappedProjects.find(p => p.id === g.project_id)
          return {
            id: g.id,
            name: g.name,
            staffId: g.staff_id,
            nationality: g.nationality,
            phone: g.phone || '',
            assignedPost: g.post_zone || 'Main Gate House',
            shift: (g.shift_type === 'Night' ? 'NIGHT' : 'DAY'),
            siteId: g.project_id,
            siteName: projectMatch ? projectMatch.name : 'Unassigned HQ',
            status: (g.duty_status as any) || 'OFF DUTY',
            statusBg: g.duty_status === 'ON DUTY' ? '#10b981' : g.duty_status === 'ON LEAVE' ? '#ef4444' : '#64748b',
            avatarSrc: g.avatar_src || ''
          }
        })
        setGuardsPool(mappedGuards)
      }
    } catch (err: any) {
      showToast(`❌ Fetch Error: ${err.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDatabaseResources()
  }, [])

  const handleOpenRegister = () => {
    setEditingGuardId(null)
    const nextNumericId = guardsPool.length + 1
    const suggestedStaffId = `RAS-${String(nextNumericId).padStart(3, '0')}`

    setNewGuardData({
      ...defaultGuardData,
      staffId: suggestedStaffId
    })
    setIsRegisterOpen(true)
  }

  const handleOpenEdit = (guard: GuardItem) => {
    setEditingGuardId(guard.id)
    setNewGuardData({
      name: guard.name,
      staffId: guard.staffId,
      nationality: guard.nationality, 
      phone: guard.phone,
      assignedPost: guard.assignedPost,
      shift: (guard as any).shift,
      siteId: guard.siteId || 'UNASSIGNED',
      avatarSrc: guard.avatarSrc || ''
    })
    setIsRegisterOpen(true)
  }

  const handleGuardImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewGuardData(prev => ({ ...prev, avatarSrc: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSiteReassignment = async (guardId: string) => {
    const targetSiteId = pendingSites[guardId]
    if (!targetSiteId) return

    try {
      const updatePayload = {
        project_id: targetSiteId === 'UNASSIGNED' ? null : targetSiteId
      }

      const { error } = await supabase
        .from('guards')
        .update(updatePayload)
        .eq('id', guardId)

      if (error) throw error
      
      showToast('✅ Operational Transfer Complete!', 'success')
      await fetchDatabaseResources()
      
      const newPending = { ...pendingSites }
      delete newPending[guardId]
      setPendingSites(newPending)
    } catch (err: any) {
      showToast(`❌ Reassignment Error: ${err.message}`, 'error')
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const dbPayload = {
        name: newGuardData.name,
        staff_id: newGuardData.staffId,
        nationality: newGuardData.nationality,
        phone: newGuardData.phone,
        post_zone: newGuardData.assignedPost,
        shift_type: (newGuardData as any).shift === 'NIGHT' ? 'Night' : 'Day',
        project_id: newGuardData.siteId === 'UNASSIGNED' ? null : newGuardData.siteId,
        avatar_src: newGuardData.avatarSrc,
        duty_status: editingGuardId ? undefined : 'ON DUTY'
      }

      if (editingGuardId) {
        const { error } = await supabase
          .from('guards')
          .update(dbPayload)
          .eq('id', editingGuardId)
        
        if (error) throw error
        showToast('✅ Profile Updated Successfully!', 'success')
      } else {
        const { error } = await supabase
          .from('guards')
          .insert([dbPayload])
        
        if (error) throw error
        showToast('✅ New Guard Registered Successfully!', 'success')
      }

      setIsRegisterOpen(false)
      await fetchDatabaseResources()
    } catch (err: any) {
      showToast(`❌ Database Write Error: ${err.message}`, 'error')
    }
  }

  const executeConfirmedDelete = async () => {
    if (!deleteTarget) return
    try {
      const { error } = await supabase
        .from('guards')
        .delete()
        .eq('id', deleteTarget.id)

      if (error) throw error
      showToast(`🗑️ Guard "${deleteTarget.name}" removed from registry.`, 'success')
      await fetchDatabaseResources()
    } catch (err: any) {
      showToast(`❌ Error deleting guard: ${err.message}`, 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const filteredGuards = guardsPool.filter(guard => {
    const matchesSearch = guard.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          guard.staffId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesShift = shiftFilter === 'ALL' || guard.shift === shiftFilter
    const matchesSite = siteFilter === 'ALL' || guard.siteId === siteFilter
    return matchesSearch && matchesShift && matchesSite
  })

  const targetZoomedGuard = guardsPool.find(g => g.id === zoomedGuardId)
  
  const inputStyle = { padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', color: '#1e293b', width: '100%', boxSizing: 'border-box' as const, outline: 'none' }
  const labelStyle = { fontSize: '10.5px', fontWeight: 'bold' as const, color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' as const }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%', boxSizing: 'border-box', position: 'relative' }}>
      
      {/* SCREEN-CENTERED TOAST NOTIFICATION CONTAINER */}
      {toast && (
        <div style={{ position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999, backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6', color: 'white', padding: '14px 32px', borderRadius: '30px', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', whiteSpace: 'nowrap' }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* SCREEN-CENTERED DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ backgroundColor: 'white', padding: '30px 35px', borderRadius: '16px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
              <svg style={{ width: '28px', height: '28px', stroke: '#dc2626' }} fill="none" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>Confirm Removal</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              Are you sure you want to completely remove <strong style={{ color: '#0f172a' }}>"{deleteTarget.name}"</strong> from the operational directory?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: 'white', color: '#334155', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={executeConfirmedDelete} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#dc2626', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Yes, Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', maxWidth: '1200px', width: '100%' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: themeColor, margin: 0 }}>GUARDS DIRECTORY</h1>
          <p style={{ color: '#64748b', marginTop: '5px', margin: 0 }}>Manage master security staff listings, multi-site deployments, and project logs.</p>
        </div>
        <button onClick={handleOpenRegister} style={{ backgroundColor: themeColor, color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          + Register New Guard
        </button>
      </div>

      {/* FILTERS PANEL ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', maxWidth: '1200px', width: '100%', gap: '20px' }}>
        <input 
          type="text"
          placeholder="Search by guard name or staff ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: '1', maxWidth: '350px', padding: '12px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', color: '#1e293b' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>FILTER BY SITE:</label>
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            style={{ padding: '11px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: themeColor, fontWeight: 'bold', fontSize: '13.5px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="ALL">All Agency Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
          {(['ALL', 'DAY', 'NIGHT'] as const).map((mode) => {
            const isActive = shiftFilter === mode
            return (
              <button
                key={mode}
                onClick={() => setShiftFilter(mode)}
                style={{ backgroundColor: isActive ? themeColor : 'transparent', color: isActive ? 'white' : '#475569', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {mode === 'ALL' ? 'Show All' : mode === 'DAY' ? '☀️ Day' : '🌙 Night'}
              </button>
            )
          })}
        </div>
      </div>

      {/* CARDS GRID CONTAINER */}
      {isLoading && guardsPool.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', fontStyle: 'italic', color: '#64748b', fontSize: '14px' }}>Syncing guard personnel rosters with live Supabase...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '25px', maxWidth: '1200px', width: '100%' }}>
          {filteredGuards.map((guard) => {
            const pendingSiteValue = pendingSites[guard.id]
            const isDropdownChanged = pendingSiteValue && pendingSiteValue !== guard.siteId
            const avatarInitials = guard.name.substring(0, 2).toUpperCase()

            return (
              <div key={guard.id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div onClick={() => setZoomedGuardId(guard.id)} style={{ width: '85px', height: '85px', backgroundColor: '#f1f5f9', color: themeColor, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 'bold', border: '1px solid #e2e8f0', flexShrink: 0, cursor: 'pointer', overflow: 'hidden' }}>
                    {guard.avatarSrc ? <img src={guard.avatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatarInitials}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ margin: 0, fontSize: '17px', color: '#1e293b', fontWeight: 'bold' }}>{guard.name}</h3>
                      <span style={{ backgroundColor: guard.statusBg, color: 'white', fontSize: '9px', fontWeight: 'bold', padding: '2px 7px', borderRadius: '4px' }}>{guard.status}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: themeColor, fontWeight: 'bold', fontFamily: 'monospace' }}>ID: {guard.staffId}</span>
                    
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#475569' }}>📍 <strong>Current Site:</strong> <span style={{ color: themeColor, fontWeight: 'bold' }}>{guard.siteName}</span></span>
                      <span style={{ fontSize: '13px', color: '#475569' }}>🛡️ <strong>Post:</strong> {guard.assignedPost}</span>
                      <span style={{ fontSize: '13px', color: '#475569' }}>🌍 <strong>Nationality:</strong> {guard.nationality}</span>
                      <span style={{ fontSize: '13px', color: '#475569' }}>📞 <strong>Phone:</strong> {guard.phone}</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', marginTop: 'auto' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Shift: {guard.shift === 'DAY' ? '☀️ Day' : '🌙 Night'}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleOpenEdit(guard)} style={{ backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 'bold', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => setDeleteTarget({ id: guard.id, name: guard.name })} style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>

                <div style={{ padding: '15px 20px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deploy to New Site</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select value={pendingSiteValue || guard.siteId || 'UNASSIGNED'} onChange={(e) => setPendingSites({ ...pendingSites, [guard.id]: e.target.value })} style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#1e293b', outline: 'none', backgroundColor: 'white', cursor: 'pointer' }}>
                      <option value="UNASSIGNED">⚠️ Unassigned HQ (Standby)</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button onClick={() => handleSiteReassignment(guard.id)} disabled={!isDropdownChanged} style={{ backgroundColor: isDropdownChanged ? themeColor : '#e2e8f0', color: isDropdownChanged ? 'white' : '#94a3b8', border: 'none', padding: '0 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: isDropdownChanged ? 'pointer' : 'not-allowed', transition: 'all 0.2s ease' }}>
                      Reassign
                    </button>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* REGISTRATION & EDITING MODAL (FIXED WITH IMAGE UPLOAD TRIPPERS) */}
      {isRegisterOpen && (
        <div onClick={() => setIsRegisterOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '16px', width: '600px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            
            <div style={{ padding: '20px 25px', backgroundColor: themeColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: 'bold' }}>
                {editingGuardId ? 'Edit Personnel Profile' : 'Register New Personnel'}
              </h2>
              <button onClick={() => setIsRegisterOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>✕</button>
            </div>

            <form onSubmit={handleRegisterSubmit} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
                
                {/* FIXED LEFT COLUMN: Profile Image Upload Box with attached visible operational label triger buttons */}
                <div style={{ width: '130px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Profile Photo</label>
                  <div style={{ flex: 1, minHeight: '140px', backgroundColor: '#f1f5f9', border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
                    {newGuardData.avatarSrc ? (
                      <img src={newGuardData.avatarSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '32px' }}>👤</span>
                    )}
                  </div>
                  <input type="file" onChange={handleGuardImageUpload} accept="image/*" style={{ display: 'none' }} id="guard-pic-upload" />
                  
                  {/* FIXED VISUAL COMPONENT: Render the interactive button explicitly linking to input field triggers */}
                  <label 
                    htmlFor="guard-pic-upload" 
                    style={{ 
                      backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', transition: 'background 0.2s', display: 'block' 
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    {newGuardData.avatarSrc ? '🔄 Change Photo' : '📁 Upload Photo'}
                  </label>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input required type="text" placeholder="e.g. Ali Bin Abu" value={newGuardData.name} onChange={(e) => setNewGuardData({...newGuardData, name: e.target.value})} style={inputStyle} />
                  </div>
                  
                  <div>
                    <label style={labelStyle}>Contact Number</label>
                    <input required type="text" placeholder="e.g. 012-345 6789" value={newGuardData.phone} onChange={(e) => setNewGuardData({...newGuardData, phone: e.target.value})} style={inputStyle} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={labelStyle}>Staff ID</label>
                      <input required type="text" placeholder="e.g. RAS-105" value={newGuardData.staffId} onChange={(e) => setNewGuardData({...newGuardData, staffId: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Nationality</label>
                      <select value={newGuardData.nationality} onChange={(e) => setNewGuardData({...newGuardData, nationality: e.target.value})} style={inputStyle}>
                        <option value="Malaysian">Malaysian</option>
                        <option value="Nepali">Nepali</option>
                        <option value="Bangladeshi">Bangladeshi</option>
                        <option value="Indonesian">Indonesian</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={labelStyle}>Initial Site Assignment</label>
                  <select value={newGuardData.siteId} onChange={(e) => setNewGuardData({...newGuardData, siteId: e.target.value})} style={inputStyle}>
                    <option value="UNASSIGNED">⚠️ Unassigned HQ (Standby)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={labelStyle}>Specific Post Location</label>
                    <input type="text" placeholder="e.g. Main Gate House" value={newGuardData.assignedPost} onChange={(e) => setNewGuardData({...newGuardData, assignedPost: e.target.value})} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Default Shift Type</label>
                      <select value={newGuardData.shift} onChange={(e) => setNewGuardData({...newGuardData, shift: e.target.value as any})}>
                      <option value="DAY">☀️ Day Shift</option>
                      <option value="NIGHT">🌙 Night Shift</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setIsRegisterOpen(false)} style={{ padding: '10px 20px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', backgroundColor: themeColor, border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  {editingGuardId ? 'Save Changes' : 'Register Guard'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ZOOMED PROFILE MODAL LIGHTBOX */}
      {zoomedGuardId && targetZoomedGuard && (
        <div onClick={() => setZoomedGuardId(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '16px', width: '420px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', color: themeColor, fontSize: '13px' }}>EXPANDED ACCOUNT VERIFICATION</span>
              <button onClick={() => setZoomedGuardId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>
            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '180px', height: '180px', backgroundColor: '#f1f5f9', color: themeColor, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `1px solid ${themeColor}33` }}>
                {targetZoomedGuard.avatarSrc ? <img src={targetZoomedGuard.avatarSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : targetZoomedGuard.name.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ textAlign: 'center', width: '100%' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#1e293b' }}>{targetZoomedGuard.name}</h2>
                <span style={{ fontSize: '13px', color: themeColor, fontWeight: 'bold' }}>STAFF ID: {targetZoomedGuard.staffId}</span>
                <div style={{ marginTop: '15px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div><span style={{ color: '#64748b' }}>Assigned Project:</span> <strong style={{ color: themeColor }}>{targetZoomedGuard.siteName}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Shift Allocation:</span> <strong>{targetZoomedGuard.shift} SHIFT</strong></div>
                  <div><span style={{ color: '#64748b' }}>Station Guard Post:</span> <strong>{targetZoomedGuard.assignedPost}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}