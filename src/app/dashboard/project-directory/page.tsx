'use client'
import { useState, useEffect, useRef } from 'react'
import { useBrand } from '@/context/BrandContext'
import { GoogleMap, useJsApiLoader, MarkerF, CircleF, Autocomplete } from '@react-google-maps/api'
import { createBrowserClient } from '@supabase/ssr'

const MAP_LIBRARIES: ("places")[] = ["places"]

export default function ProjectDirectoryPage() {
  const { themeColor } = useBrand()
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyAZfc06Mf68_2pi4jXWZiJzHpg6RuaWlyE",
    libraries: MAP_LIBRARIES
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([])
  const [projectsPool, setProjectsPool] = useState<any[]>([])
  const [isSyncing, setIsSyncing] = useState(true)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const autocompleteRefs = useRef<Record<string, google.maps.places.Autocomplete | null>>({})

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchLiveProjects = async () => {
    try {
      setIsSyncing(true)
      
      const { data: projectData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true })

      if (projError) throw projError

      const { data: guardData, error: guardError } = await supabase
        .from('guards')
        .select('id, name, staff_id, project_id, post_zone, shift_type, avatar_src')

      if (guardError) throw guardError

      if (projectData) {
        const mappedData = projectData.map(row => {
          const liveAssignedPersonnel = guardData 
            ? guardData.filter(g => g.project_id === row.id).map(g => ({
                id: g.id,
                name: g.name,
                staffId: g.staff_id,
                assignedPost: g.post_zone || 'Main Gate House',
                shift: g.shift_type === 'Night' ? 'NIGHT' : 'DAY',
                avatarSrc: g.avatar_src || ''
              }))
            : []

          return {
            id: row.id,
            projectName: row.name,
            slug: row.slug,
            address: row.address || 'Enter Address...',
            avatarText: row.name.substring(0,2).toUpperCase(),
            imageSrc: row.image_url || '',
            bmTitle: row.bm_title || 'Building Manager',
            bmName: row.bm_name || '',
            bmPhone: row.bm_phone || '',
            bmEmail: row.bm_email || '',
            bmUsername: row.portal_username || '',
            bmPassword: row.portal_password_hash || '',
            lat: row.latitude?.toString() || '3.1944',
            lng: row.longitude?.toString() || '101.6210',
            radius: row.geofence_radius || 50,
            shiftStart: row.shift_start || '08:00',
            shiftEnd: row.shift_end || '20:00',
            contactsList: row.contacts_list || [],
            activeGuardsOnSite: liveAssignedPersonnel
          }
        })
        setProjectsPool(mappedData)
      }
    } catch (err) {
      console.error('Error querying database metrics:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    fetchLiveProjects()
  }, [])

  const toggleProjectExpand = (id: string) => {
    setExpandedProjectIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id])
  }

  const updateProjectSettings = (id: string, field: string, value: any) => {
    setProjectsPool(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        updateProjectSettings(id, 'imageSrc', reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddProject = () => {
    const tempId = 'temp-' + Date.now()
    const newProject = {
      id: tempId,
      projectName: 'New Project Name',
      address: 'Enter Address...',
      avatarText: 'NEW',
      imageSrc: '',
      bmName: '',
      bmTitle: 'Building Manager',
      bmPhone: '',
      bmEmail: '',
      bmUsername: 'user_' + Date.now(),
      bmPassword: 'password123',
      contactsList: [],
      lat: '3.1944',
      lng: '101.6210',
      radius: 50,
      shiftStart: '08:00',
      shiftEnd: '20:00',
      activeGuardsOnSite: []
    }
    setProjectsPool([newProject, ...projectsPool])
    setExpandedProjectIds([tempId, ...expandedProjectIds])
    showToast('Draft project container initialized!', 'info')
  }

  const handleSaveProjectToSupabase = async (site: any) => {
  try {
    const isNewProject = site.id.toString().includes('temp-')
    const computedSlug = site.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    // 1. SECURE BUILDING MANAGER ACCOUNT AUTOMATION
    if (isNewProject && site.bmEmail) {
      showToast('Registering operational supervisor credentials...', 'info')
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: site.bmEmail,
        password: site.bmPassword,
        options: {
          data: {
            full_name: site.bmName,
          }
        }
      })

      if (authError) throw new Error(`Auth Registry Failed: ${authError.message}`)

      // Link credentials into permissions mapping matrix
      if (authData?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: site.bmEmail,
            full_name: site.bmName,
            role: 'building_manager',
            project_name: site.projectName
          })

        if (profileError) throw new Error(`Permissions Mapping Failed: ${profileError.message}`)
      }
    }

    // 2. DATA PAYLOAD ARCHITECTURE (Preserves all your current snake_case DB mappings)
    const databasePayload = {
      name: site.projectName,
      slug: computedSlug,
      address: site.address,
      image_url: site.imageSrc,
      bm_title: site.bmTitle,
      bm_name: site.bmName,
      bm_phone: site.bmPhone,
      bm_email: site.bmEmail,
      portal_username: site.bmUsername,
      portal_password_hash: site.bmPassword, // Maintained exact match to your DB row name
      latitude: parseFloat(site.lat) || 3.1444,
      longitude: parseFloat(site.lng) || 101.6210,
      geofence_radius: parseInt(site.radius) || 50,
      shift_start: site.shiftStart,
      shift_end: site.shiftEnd,
      contacts_list: site.contactsList || [] // Maintained exact match to your array item list
    }

    // 3. DATABASE EXECUTION PIPELINE
    if (isNewProject) {
      const { error } = await supabase.from('projects').insert([databasePayload])
      if (error) throw error
      showToast(`🚀 "${site.projectName}" created successfully!`, 'success')
    } else {
      const { error } = await supabase
        .from('projects')
        .update(databasePayload)
        .eq('id', site.id)
      if (error) throw error
      showToast(`💾 Changes for "${site.projectName}" saved successfully!`, 'success')
    }

     // 4. STATE SYNCHRONIZATION REBOOTS
     await fetchLiveProjects()
     setExpandedProjectIds(prev => prev.filter(pid => pid !== site.id))

   } catch (err: any) {
     console.error('Master data pipeline sync error:', err)
     showToast(`❌ Synchronization Error: ${err.message || err}`, 'error')
   }
  }

  const triggerDeleteConfirmModal = (id: string, name: string) => {
    setDeleteTarget({ id, name })
  }

  const executeConfirmedDelete = async () => {
    if (!deleteTarget) return
    const { id, name } = deleteTarget
    
    try {
      if (!id.toString().includes('temp-')) {
        const { error } = await supabase.from('projects').delete().eq('id', id)
        if (error) throw error
      }
      setProjectsPool(prev => prev.filter(p => p.id !== id))
      showToast(`🗑️ Project "${name}" deleted successfully!`, 'success')
    } catch (err: any) {
      showToast(`❌ Error deleting project: ${err.message}`, 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleAddContact = (projectId: string) => {
    setProjectsPool(prev => prev.map(p => {
      if (p.id !== projectId) return p
      return { ...p, contactsList: [...p.contactsList, { name: '', role: '', phone: '', email: '' }] }
    }))
  }

  const updateContact = (projectId: string, contactIdx: number, field: string, value: string) => {
    setProjectsPool(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updatedContacts = [...p.contactsList]
      updatedContacts[contactIdx] = { ...updatedContacts[contactIdx], [field]: value }
      return { ...p, contactsList: updatedContacts }
    }))
  }

  const removeContact = (projectId: string, contactIdx: number) => {
    setProjectsPool(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updatedContacts = p.contactsList.filter((_: any, idx: any) => idx !== contactIdx)
      return { ...p, contactsList: updatedContacts }
    }))
  }

  const handleTriggerGpsCapture = (id: string) => {
    if (!navigator.geolocation) return showToast("⚠️ Geolocation not supported by your current browser.", "error")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateProjectSettings(id, 'lat', position.coords.latitude.toFixed(6))
        updateProjectSettings(id, 'lng', position.coords.longitude.toFixed(6))
        showToast("📍 Real-Time GPS Satellite Lock Established!", "success")
      },
      (error) => showToast(`❌ Location Error: ${error.message}`, "error"),
      { enableHighAccuracy: true }
    )
  }

  const handlePlaceChanged = (id: string) => {
    const autocompleteInstance = autocompleteRefs.current[id]
    if (autocompleteInstance) {
      const place = autocompleteInstance.getPlace()
      if (place && place.geometry && place.geometry.location) {
        const selectedLatitude = place.geometry.location.lat().toFixed(6)
        const selectedLongitude = place.geometry.location.lng().toFixed(6)
        
        updateProjectSettings(id, 'lat', selectedLatitude)
        updateProjectSettings(id, 'lng', selectedLongitude)
        
        if (place.formatted_address) {
          updateProjectSettings(id, 'address', place.formatted_address)
        }
        showToast("🗺️ Map position shifted to targeted location!", "info")
      } else {
        showToast("⚠️ No detailed GPS coordinates found for this location choice.", "error")
      }
    }
  }

  const filteredProjects = projectsPool.filter(p => p.projectName.toLowerCase().includes(searchQuery.toLowerCase()))
  
  const inputStyle = { padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '100%', fontSize: '13.5px', color: '#1e293b', backgroundColor: '#fff', outline: 'none', transition: 'border-color 0.2s' }
  const labelStyle = { fontSize: '10.5px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px', letterSpacing: '0.3px', textTransform: 'uppercase' as const }
  const sectionHeaderStyle = { fontSize: '13px', color: themeColor, fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' as const, borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', margin: '0 0 20px 0' }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%', boxSizing: 'border-box', position: 'relative' }}>
      
      {/* RE-CENTERED CUSTOM POP-UP CONTAINER */}
      {toast && (
        <div style={{ position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999, backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6', color: 'white', padding: '14px 32px', borderRadius: '30px', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* IN-APP SCREEN-CENTERED DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ backgroundColor: 'white', padding: '30px 35px', borderRadius: '16px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
              <svg style={{ width: '28px', height: '28px', stroke: '#dc2626' }} fill="none" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>Confirm Permanent Deletion</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete the project <strong style={{ color: '#0f172a' }}>"{deleteTarget.name}"</strong>? This action cannot be undone.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: 'white', color: '#334155', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={executeConfirmedDelete} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#dc2626', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ marginBottom: '25px', maxWidth: '1200px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: themeColor, margin: 0 }}>PROJECT DIRECTORY</h1>
        <p style={{ color: '#64748b', marginTop: '5px', margin: 0 }}>Configure location properties, coordinate coordinates, manage portal accounts, and deploy geofences.</p>
      </div>

      {/* SEARCH AND CONTROL PANEL BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', maxWidth: '1200px', gap: '20px' }}>
        <input type="text" placeholder="Search by project name keyword..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, maxWidth: '550px', padding: '12px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
        <button onClick={handleAddProject} style={{ backgroundColor: themeColor, color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          + Add New Project
        </button>
      </div>

      {/* ACCORDION PROJECT PIPELINE STACK */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '1200px', width: '100%' }}>
        {filteredProjects.map((site) => {
          const isExpanded = expandedProjectIds.includes(site.id)
          const activeGuardsOnSite = site.activeGuardsOnSite || []
          const centerLat = parseFloat(site.lat) || 3.1944
          const centerLng = parseFloat(site.lng) || 101.6210

          return (
            <div key={site.id} style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              
              {/* ACCORDION BAR HEADER */}
              <div onClick={() => toggleProjectExpand(site.id)} style={{ padding: '22px 25px', display: 'flex', gap: '25px', alignItems: 'center', backgroundColor: '#fff', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ width: '70px', height: '70px', background: site.imageSrc ? 'transparent' : `linear-gradient(135deg, ${themeColor} 0%, #64748b 100%)`, color: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '900', overflow: 'hidden', border: site.imageSrc ? '1px solid #cbd5e1' : 'none' }}>
                  {site.imageSrc ? <img src={site.imageSrc} alt="Project" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : site.avatarText}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b', fontWeight: 'bold' }}>{site.projectName}</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#64748b' }}>📍 {site.address}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '30px', borderLeft: '2px solid #f1f5f9', paddingLeft: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '110px', textAlign: 'center' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', display: 'block' }}>{activeGuardsOnSite.length}</span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', marginTop: '2px', letterSpacing: '0.2px' }}>GUARDS ASSIGNED</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px', textAlign: 'center', borderLeft: '1px solid #f1f5f9', paddingLeft: '20px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: themeColor, display: 'block' }}>{site.radius}m</span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', marginTop: '2px', letterSpacing: '0.2px' }}>GEOFENCE SET</span>
                  </div>
                  <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginLeft: '10px' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* ACCORDION DROPDOWN MAIN BODY SHELL */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '30px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  
                  {/* SECTION 1: GENERAL PROJECT DETAILS */}
                  <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                     <h4 style={sectionHeaderStyle}>General Project Details</h4>
                     
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                           <div>
                             <label style={labelStyle}>Project Name</label>
                             <input type="text" value={site.projectName} onChange={(e) => updateProjectSettings(site.id, 'projectName', e.target.value)} style={inputStyle} />
                           </div>
                           <div>
                             <label style={labelStyle}>Full Address</label>
                             <textarea value={site.address} onChange={(e) => updateProjectSettings(site.id, 'address', e.target.value)} style={{ ...inputStyle, height: '80px', resize: 'none' }} />
                           </div>
                           
                           <div>
                             <label style={labelStyle}>Project Display Image</label>
                             <input 
                               type="file" 
                               ref={(el) => { fileInputRefs.current[site.id] = el }}
                               accept="image/*" 
                               onChange={(e) => handleImageUpload(site.id, e)} 
                               style={{ display: 'none' }} 
                             />
                             <button 
                               type="button"
                               onClick={() => fileInputRefs.current[site.id]?.click()}
                               style={{ 
                                 width: '100%', padding: '10px 14px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'background 0.2s'
                               }}
                               onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                               onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                             >
                               {site.imageSrc ? '🔄 Change Project Image' : '📁 Upload Project Image'}
                             </button>
                           </div>
                        </div>

                        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                           <h5 style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#475569', fontWeight: 'bold' }}>PORTAL ACCESS & MANAGER PROFILE</h5>
                           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                             <div><label style={labelStyle}>Designation</label><input type="text" value={site.bmTitle} onChange={(e) => updateProjectSettings(site.id, 'bmTitle', e.target.value)} style={inputStyle} /></div>
                             <div><label style={labelStyle}>Full Name</label><input type="text" value={site.bmName} onChange={(e) => updateProjectSettings(site.id, 'bmName', e.target.value)} style={inputStyle} /></div>
                             <div><label style={labelStyle}>Contact Phone</label><input type="text" value={site.bmPhone} onChange={(e) => updateProjectSettings(site.id, 'bmPhone', e.target.value)} style={inputStyle} /></div>
                             <div><label style={labelStyle}>Email Address</label><input type="text" value={site.bmEmail} onChange={(e) => updateProjectSettings(site.id, 'bmEmail', e.target.value)} style={inputStyle} /></div>
                             <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px', marginTop: '10px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1' }}>
                                <div style={{ flex: 1 }}><label style={labelStyle}>Portal Username</label><input type="text" value={site.bmUsername} onChange={(e) => updateProjectSettings(site.id, 'bmUsername', e.target.value)} style={inputStyle} /></div>
                                <div style={{ flex: 1 }}><label style={labelStyle}>Portal Password</label><input type="text" value={site.bmPassword} onChange={(e) => updateProjectSettings(site.id, 'bmPassword', e.target.value)} style={inputStyle} /></div>
                             </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* SECTION 2: ADDITIONAL STAKEHOLDERS */}
                  <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '20px' }}>
                      <h4 style={{ margin: 0, fontSize: '13px', color: themeColor, fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Additional Stakeholders</h4>
                      <button type="button" onClick={() => handleAddContact(site.id)} style={{ backgroundColor: 'white', color: themeColor, border: `1px solid ${themeColor}`, padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Contact</button>
                    </div>
                    
                    {site.contactsList.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {site.contactsList.map((contact: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <input type="text" placeholder="Name" value={contact.name} onChange={(e) => updateContact(site.id, idx, 'name', e.target.value)} style={{ ...inputStyle, flex: 2 }} />
                            <input type="text" placeholder="Role/Title" value={contact.role} onChange={(e) => updateContact(site.id, idx, 'role', e.target.value)} style={{ ...inputStyle, flex: 1.5 }} />
                            <input type="text" placeholder="Phone" value={contact.phone} onChange={(e) => updateContact(site.id, idx, 'phone', e.target.value)} style={{ ...inputStyle, flex: 1.5 }} />
                            <input type="text" placeholder="Email" value={contact.email} onChange={(e) => updateContact(site.id, idx, 'email', e.target.value)} style={{ ...inputStyle, flex: 2 }} />
                            <button type="button" onClick={() => removeContact(site.id, idx)} style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', width: '35px', height: '35px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', display: 'block' }}>No secondary contacts added yet.</span>
                    )}
                  </div>

                  {/* FIXED SECTION 3: RE-CONFIGURED SPLIT-PANE ASYMMETRIC CONTROLS LAYER */}
                  <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h4 style={sectionHeaderStyle}>GPS Geofencing Parameters</h4>
                    
                    <div style={{ display: 'flex', width: '100%', gap: '35px', alignItems: 'stretch' }}>
                      
                      {/* LEFT ALIGNED OPERATION PARAMETER STACK (50% WIDTH) */}
                      <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '22px', justifyContent: 'space-between' }}>
                        
                        {/* Row 1: Places Search Box */}
                        {isLoaded && (
                          <div style={{ width: '100%' }}>
                            <label style={labelStyle}>🔍 Search Property Location Name</label>
                            <Autocomplete
                              onLoad={(instance) => { autocompleteRefs.current[site.id] = instance }}
                              onPlaceChanged={() => handlePlaceChanged(site.id)}
                            >
                              <input 
                                type="text" 
                                placeholder="Type condominium name or street address..." 
                                style={{ ...inputStyle, padding: '11px 14px', borderColor: themeColor }} 
                                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                              />
                            </Autocomplete>
                          </div>
                        )}

                        {/* Row 2: Lat/Lng Coordinates Grid + Grab Trigger Button */}
                        <div style={{ display: 'flex', gap: '15px', width: '100%', alignItems: 'flex-end' }}>
                          <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Latitude Target</label>
                            <input type="text" value={site.lat} onChange={(e) => updateProjectSettings(site.id, 'lat', e.target.value)} style={inputStyle} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Longitude Target</label>
                            <input type="text" value={site.lng} onChange={(e) => updateProjectSettings(site.id, 'lng', e.target.value)} style={inputStyle} />
                          </div>
                          <button type="button" onClick={() => handleTriggerGpsCapture(site.id)} style={{ height: '39px', padding: '0 16px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Auto Grab
                          </button>
                        </div>

                        {/* Row 3: Enforced Range Radius Slider Controls */}
                        <div style={{ width: '100%', marginTop: '5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={labelStyle}>Enforced Radius Boundary</label>
                            <strong style={{ fontSize: '14px', color: themeColor }}>{site.radius} Meters</strong>
                          </div>
                          <input type="range" min="15" max="250" value={site.radius} onChange={(e) => updateProjectSettings(site.id, 'radius', Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                        </div>

                      </div>

                      {/* RIGHT ALIGNED TALL MAPS VIEWPORT (50% WIDTH) */}
                      <div style={{ width: '50%', minHeight: '260px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #cbd5e1', position: 'relative' }}>
                        {isLoaded ? (
                          <GoogleMap mapContainerStyle={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} center={{ lat: centerLat, lng: centerLng }} zoom={17} options={{ disableDefaultUI: true, zoomControl: true }}>
                            <MarkerF position={{ lat: centerLat, lng: centerLng }} draggable={true} onDragEnd={(e) => { if (e.latLng) { updateProjectSettings(site.id, 'lat', e.latLng.lat().toFixed(6)); updateProjectSettings(site.id, 'lng', e.latLng.lng().toFixed(6)) } }} />
                            <CircleF key={`radius-${centerLat}-${centerLng}-${site.radius}`} center={{ lat: centerLat, lng: centerLng }} radius={site.radius} options={{ fillColor: themeColor, fillOpacity: 0.2, strokeColor: themeColor, strokeOpacity: 0.8, strokeWeight: 2 }} />
                          </GoogleMap>
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>Loading Map...</div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* SECTION 4: SHIFT SCHEDULING & LIVE PERSONNEL */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h4 style={sectionHeaderStyle}>Shift Timings</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                          <label style={labelStyle}>Day Shift Start</label>
                          <input type="time" value={site.shiftStart} onChange={(e) => updateProjectSettings(site.id, 'shiftStart', e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Day Shift End</label>
                          <input type="time" value={site.shiftEnd} onChange={(e) => updateProjectSettings(site.id, 'shiftEnd', e.target.value)} style={inputStyle} />
                        </div>
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h4 style={sectionHeaderStyle}>Deployed Guard Profiles</h4>
                      {activeGuardsOnSite.length > 0 ? (
                        <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '5px' }}>
                          {activeGuardsOnSite.map((g: any) => (
                            <div key={g.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', minWidth: '110px' }}>
                              
                              <div style={{ width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '10px' }}>
                                {g.avatarSrc ? (
                                  <img src={g.avatarSrc} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
                                    {g.name.substring(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '700', whiteSpace: 'nowrap' }}>{g.name}</span>
                              <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', marginTop: '4px' }}>{g.staffId}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', display: 'block', marginTop: '10px' }}>No active personnel deployed to this location.</span>
                      )}
                    </div>
                  </div>

                  {/* SECTION 5: FOOTER OPERATION ACTIONS */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
                    <button type="button" onClick={() => triggerDeleteConfirmModal(site.id, site.projectName)} style={{ backgroundColor: 'transparent', color: '#dc2626', border: 'none', padding: '10px 15px', fontSize: '13.5px', fontWeight: 'bold', cursor: 'pointer' }}>
                      Delete Project
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleSaveProjectToSupabase(site)} 
                      style={{ backgroundColor: themeColor, color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    >
                      Save Project
                    </button>
                  </div>

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}