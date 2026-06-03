'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import AttendanceTile from './components/AttendanceTile'

function PersonalDashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [guardName, setGuardName] = useState('Officer')
  const [siteTitle, setSiteTitle] = useState('VILLA AMAN CONDOMINIUM')

  useEffect(() => {
    // 🛡️ BACK-BUTTON SECURITY BLOCKER
    const sessionToken = sessionStorage.getItem('ras_guard_session')
    const urlGuard = searchParams.get('guard')
    const urlProject = searchParams.get('project')

    if (!urlGuard && !sessionToken) {
      router.replace('/mobile')
      return
    }

    if (urlGuard) {
      const decodedName = decodeURIComponent(urlGuard)
      setGuardName(decodedName)
      sessionStorage.setItem('ras_guard_session', decodedName)
    }
    if (urlProject) {
      setSiteTitle(decodeURIComponent(urlProject).toUpperCase())
    }
  }, [searchParams, router])

  const handleTileNavigation = (routeTarget: string) => {
    router.push(`/mobile/${routeTarget}?project=${encodeURIComponent(siteTitle)}&guard=${encodeURIComponent(guardName)}`)
  }

  const handleSecureLogout = () => {
    sessionStorage.removeItem('ras_guard_session')
    window.history.replaceState(null, '', '/mobile')
    router.replace('/mobile')
  }

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', width: '100vw', padding: '20px', boxSizing: 'border-box', fontFamily: 'sans-serif', color: '#1e293b' }}>
      
      {/* 🏢 BRANDING TOP HEADER BAR */}
      <div style={{ backgroundColor: '#1e3a8a', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.2)' }}>
        <div>
          <span style={{ color: '#93c5fd', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Post Duty</span>
          <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '2px 0 0 0', color: '#ffffff' }}>{siteTitle}</h2>
          <p style={{ margin: '6px 0 0 0', color: '#e0f2fe', fontSize: '13px' }}>Officer: <strong style={{ color: '#ffffff' }}>{guardName}</strong></p>
        </div>
        
        <button 
          onClick={handleSecureLogout}
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.25)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      {/* POLICY INFORMATION LOG LAYER */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '22px' }}>🛡️</div>
        <div>
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a' }}>Personal Device Policy Protocol</h4>
          <p style={{ margin: '1px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>All activities are securely signed and tracked under your official staff profile logs.</p>
        </div>
      </div>

      {/* 📱 CORE GRID HUB WITH COMPONENT SEPARATION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '480px', margin: '0 auto' }}>
        
        {/* TILE 1: ATTENDANCE COMPONENT */}
        <AttendanceTile />

        {/* TILE 2: START CLOCKING */}
        <div 
          onClick={() => handleTileNavigation('clocking_rounds')}
          style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px 12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
        >
          <div style={{ width: '52px', height: '52px', backgroundColor: '#f0fdf4', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '1px solid #bbf7d0' }}>
            ⏰
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a' }}>Start Clocking</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.3' }}>Perform Site QR Patrol Lap</p>
          </div>
        </div>

        {/* TILE 3: SITE SOPS */}
        <div 
          onClick={() => handleTileNavigation('sop_handbook')}
          style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px 12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
        >
          <div style={{ width: '52px', height: '52px', backgroundColor: '#fefce8', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '1px solid #fef08a' }}>
            📜
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a' }}>Site SOPs</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.3' }}>Read Post Standing Orders</p>
          </div>
        </div>

        {/* TILE 4: EMERGENCY */}
        <div 
          onClick={() => handleTileNavigation('helplines')}
          style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px 12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
        >
          <div style={{ width: '52px', height: '52px', backgroundColor: '#fef2f2', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '1px solid #fecaca' }}>
            📞
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a' }}>Emergency</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.3' }}>Direct Dial Post Helplines</p>
          </div>
        </div>

      </div>

      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', marginTop: '48px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
        SECURE CONNECTED CLIENT LAYER HUB
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