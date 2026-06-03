'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import AttendanceTile from './components/AttendanceTile'

// Initialize a client-side Supabase connection portal for mobile lookups
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function PersonalDashboardContent() {
  const router = useRouter()
  
  // Dynamic State Hook Management
  const [guardId, setGuardId] = useState<string | null>(null)
  const [guardName, setGuardName] = useState('Loading Officer...')
  const [siteTitle, setSiteTitle] = useState('LOADING ASSIGNED POST...')
  const [projectId, setProjectId] = useState<string | null>(null)
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    async function syncGuardDatabaseProfile() {
      // 1. Verify user session state via Client Auth Layer
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error("Auth session expired or missing:", authError)
        router.replace('/mobile')
        return
      }

      try {
        // 2. Fetch the LIVE row inside the 'guards' directory linked to this auth user ID
        const { data: guardData, error: guardError } = await supabase
          .from('guards')
          .select('id, name, project_id')
          .eq('id', user.id) // Assuming guard id matches authenticated user uuid
          .single()

        if (guardError || !guardData) {
          // Fallback check: look up by matching email metadata if id structure varies
          const { data: profileFallback } = await supabase
            .from('profiles')
            .select('full_name, project_name')
            .eq('id', user.id)
            .single()
            
          if (profileFallback) {
            setGuardName(profileFallback.full_name || 'Officer')
            setSiteTitle((profileFallback.project_name || 'Main Post Office').toUpperCase())
          } else {
            setGuardName(user.email || 'Officer')
            setSiteTitle('UNASSIGNED POST DUTY')
          }
          return
        }

        // Save target references into react lifecycle states
        setGuardId(guardData.id)
        setGuardName(guardData.name)
        setProjectId(guardData.project_id)

        // 3. RELATIONAL JOIN LOOKUP: Fetch live project name directly from the projects table
        if (guardData.project_id) {
          const { data: projectData } = await supabase
            .from('projects')
            .select('name')
            .eq('id', guardData.project_id)
            .single()

          if (projectData?.name) {
            setSiteTitle(projectData.name.toUpperCase())
          }
        } else {
          setSiteTitle('UNASSIGNED POST DUTY')
        }

      } catch (err) {
        console.error("Database connection failure:", err)
      }
    }

    syncGuardDatabaseProfile()
  }, [router])

  const handleTileNavigation = (routeTarget: string) => {
    // Navigation payload safely updated to forward critical primary keys
    router.push(`/mobile/${routeTarget}?project_id=${projectId || ''}&guard_id=${guardId || ''}`)
  }

  const handleSecureLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.clear()
    router.replace('/mobile')
  }

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh', width: '100vw', padding: '0 20px 30px 20px', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', position: 'relative', overflowX: 'hidden' }}>
      
      {/* 📱 TOP NAVIGATION HEADER FRAME */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 4px 15px 4px', width: '100%', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '22px', fontWeight: '900', color: '#1e3a8a', letterSpacing: '-0.5px' }}>RASMSB</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div onClick={() => alert('No active corporate broadcast dispatches found.')} style={{ position: 'relative', cursor: 'pointer' }}>
            <span style={{ fontSize: '22px', color: '#1e3a8a' }}>🔔</span>
            <div style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }}></div>
          </div>
          <div onClick={() => setIsDrawerOpen(true)} style={{ display: 'flex', flexDirection: 'column', gap: '5px', cursor: 'pointer', padding: '4px' }}>
            <div style={{ width: '22px', height: '3px', backgroundColor: '#1e3a8a', borderRadius: '2px' }}></div>
            <div style={{ width: '22px', height: '3px', backgroundColor: '#1e3a8a', borderRadius: '2px' }}></div>
            <div style={{ width: '22px', height: '3px', backgroundColor: '#1e3a8a', borderRadius: '2px' }}></div>
          </div>
        </div>
      </div>

      {/* 🏢 BRANDING ASSIGNED LIVE POST CARD */}
      <div style={{ backgroundColor: '#25479a', borderRadius: '24px', padding: '24px', marginBottom: '20px', boxShadow: '0 10px 20px -5px rgba(37, 71, 154, 0.25)' }}>
        <span style={{ color: '#93c5fd', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Assigned Post Duty</span>
        <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '4px 0 0 0', color: '#ffffff', letterSpacing: '-0.2px' }}>{siteTitle}</h2>
        <div style={{ width: '30px', height: '3px', backgroundColor: '#38bdf8', marginTop: '14px', borderRadius: '2px' }}></div>
        <p style={{ margin: '14px 0 0 0', color: '#e0f2fe', fontSize: '14px', fontWeight: '500' }}>Officer: <strong style={{ color: '#ffffff', fontWeight: '700' }}>{guardName}</strong></p>
      </div>

      {/* POLICY RULES PROTOCOL INFORMATIONAL BANNER */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1px solid #eef2f6', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
        <span style={{ fontSize: '26px' }}>🛡️</span>
        <div>
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#1e3a8a' }}>Personal Device Policy Protocol</h4>
          <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.4', fontWeight: '500' }}>All activities are securely signed and tracked under your official staff profile logs.</p>
        </div>
      </div>

      {/* 📱 UPGRADED HIGH-VIBRANCY GRID SYSTEM */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '480px', margin: '0 auto' }}>
        
        {/* Pass downstream references cleanly so attendance row writes execute correctly */}
        <AttendanceTile guardId={guardId} projectId={projectId} />

        {/* TILE 2: START CLOCKING */}
        <div 
          onClick={() => handleTileNavigation('clocking_rounds')}
          style={{ backgroundColor: '#ffffff', border: '1px solid #eef2f6', borderRadius: '20px', padding: '24px 12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}
        >
          <img src="https://img.icons8.com/fluent/96/alarm-clock.png" alt="Clocking" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e3a8a' }}>Start Clocking</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '500', lineHeight: '1.3' }}>Perform Site QR Patrol Lap</p>
          </div>
        </div>

        {/* TILE 3: SITE SOPS */}
        <div 
          onClick={() => handleTileNavigation('sop_handbook')}
          style={{ backgroundColor: '#ffffff', border: '1px solid #eef2f6', borderRadius: '20px', padding: '24px 12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}
        >
          <img src="https://img.icons8.com/fluent/96/scroll.png" alt="SOP Handbook" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e3a8a' }}>Site SOPs</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '500', lineHeight: '1.3' }}>Read Post Standing Orders</p>
          </div>
        </div>

        {/* TILE 4: EMERGENCY HELPLINES */}
        <div 
          onClick={() => handleTileNavigation('helplines')}
          style={{ backgroundColor: '#ffffff', border: '1px solid #eef2f6', borderRadius: '20px', padding: '24px 12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}
        >
          <img src="https://img.icons8.com/fluent/96/phone.png" alt="Emergency" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e3a8a' }}>Emergency</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '500', lineHeight: '1.3' }}>Direct Dial Post Helplines</p>
          </div>
        </div>

      </div>

      {/* FOOTER CORPORATE BRAND SIGNATURE */}
      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', marginTop: '40px', fontWeight: '700', letterSpacing: '0.8px' }}>
        Rashid Azlan Security (M) Sdn Bhd
      </div>

      {/* 🍔 RIGHT SIDEBAR BURGER SLIDE OUT MENU PANEL */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(3px)',
        zIndex: 999999,
        transition: 'opacity 0.3s ease-in-out, visibility 0.3s',
        opacity: isDrawerOpen ? 1 : 0,
        visibility: isDrawerOpen ? 'visible' : 'hidden'
      }} onClick={() => setIsDrawerOpen(false)}>
        
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '80%',
          maxWidth: '310px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-10px 0 25px -5px rgba(15, 23, 42, 0.15)',
          padding: '30px 24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'transform 0.3s ease-in-out',
          transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)'
        }} onClick={(e) => e.stopPropagation()}>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#1e3a8a', letterSpacing: '-0.3px' }}>Terminal Account</span>
              <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer', padding: '4px', fontWeight: 'bold' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '25px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Guard Identity</label>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>{guardName}</div>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Operational Post Command</label>
                <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#475569', marginTop: '2px', lineHeight: '1.3' }}>{siteTitle}</div>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Terminal Sync Mode</label>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span> PERSONAL DEVICE HUB
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSecureLogout}
            style={{ width: '100%', height: '48px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#ef4444', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
          >
            🚪 Sign Out Terminal
          </button>

        </div>
      </div>

    </div>
  )
}

export default function PersonalDashboardPage() {
  return (
    <Suspense fallback={<div>Loading layout parameters safely...</div>}>
      <PersonalDashboardContent />
    </Suspense>
  )
}