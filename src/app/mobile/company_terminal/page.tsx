'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'

function CompanyTerminalContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const terminalId = searchParams.get('terminal') || 'SHARED-ASSET'
  const activeProjectSlug = searchParams.get('project') || 'unknown-site'

  const [activeGuard, setActiveGuard] = useState('')
  const [isRoundStarted, setIsRoundStarted] = useState(false)
  const [lastScannedPoint, setLastScannedPoint] = useState<string | null>(null)

  const formatSiteTitle = (slug: string) => {
    return slug
      .split('-')
      .map(word => word.toUpperCase())
      .join(' ')
  }

  const handleStartPatrolRound = () => {
    if (!activeGuard.trim()) {
      alert('Operational Requirement:\nPlease input your Guard Name / ID before initializing a patrol round.')
      return
    }
    setIsRoundStarted(true)
  }

  const handleSimulateQRScan = () => {
    // This action button will handle the native camera hook in the next stage
    setLastScannedPoint('PARKING BLOK B')
    alert(`Stealth Snapshot Triggered!\nFront Camera silently captured facial log verification token while parsing QR point barcode.`)
  }

  return (
    <div style={{ backgroundColor: '#020617', minHeight: '100vh', width: '100vw', padding: '24px', boxSizing: 'border-box', fontFamily: 'sans-serif', color: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      
      {/* LOCKED TOP STATUS BANNER */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '9px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '20px', letterSpacing: '0.5px' }}>LOCKED DEVICE TERMINAL</span>
          <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '6px 0 0 0', color: '#f8fafc' }}>{formatSiteTitle(activeProjectSlug)}</h2>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Asset ID: {terminalId}</span>
        </div>
        <button 
          onClick={() => router.push('/mobile')}
          style={{ backgroundColor: 'transparent', color: '#475569', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Disconnect Asset
        </button>
      </div>

      {/* CORE WORKFLOW INTERACTION FRAME */}
      {!isRoundStarted ? (
        // STAGE A: FORCE GUARD ASSIGNMENT FOR THE TOUR
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '30px 20px', textAlign: 'center', margin: 'auto 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '48px', margin: '0' }}>📋</div>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 'bold' }}>Guard Shift Handover</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' }}>Input your security identity below to authorize tracking metrics for this upcoming patrol round tour.</p>
          </div>

          <input 
            type="text"
            placeholder="Enter Your Full Name (e.g. Pratap)"
            value={activeGuard}
            onChange={(e) => setActiveGuard(e.target.value)}
            style={{ width: '100%', padding: '16px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#020617', color: 'white', fontSize: '15px', textAlign: 'center', boxSizing: 'border-box', outline: 'none', fontWeight: '600' }}
          />

          <button
            onClick={handleStartPatrolRound}
            style={{ width: '100%', backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '16px 0', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.3)' }}
          >
            🚀 START PATROL ROUND
          </button>
        </div>
      ) : (
        // STAGE B: ACTIVE TOUR STEALTH CAMERA MONITOR
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          
          {/* TOUR HEADER STATS */}
          <div style={{ backgroundColor: '#14532d', border: '1px solid #16a34a', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 'bold', letterSpacing: '0.5px' }}>ACTIVE PATROL PATROLLER</span>
              <h4 style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: 'bold' }}>Officer: {activeGuard}</h4>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 'bold', letterSpacing: '0.5px' }}>STATUS</span>
              <h4 style={{ margin: '2px 0 0 0', fontSize: '14px', fontWeight: 'bold', color: '#22c55e' }}>🟢 TRACKING LIVE</h4>
            </div>
          </div>

          {/* THE PRIMARY ACTION SCAN TRIGGER CONTAINER */}
          <div style={{ textAlign: 'center', margin: 'auto 0' }}>
            <button
              onClick={handleSimulateQRScan}
              style={{ width: '180px', height: '180px', backgroundColor: '#2563eb', border: '4px solid #3b82f6', borderRadius: '50%', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.5)' }}
            >
              <span style={{ fontSize: '40px' }}>📷</span>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.5px', padding: '0 10px', lineHeight: '1.3' }}>TAP TO SCAN TAG STICKER</span>
            </button>

            {lastScannedPoint && (
              <div style={{ marginTop: '24px', animation: 'fadeIn 0.3s ease' }}>
                <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>✓ VERIFIED SUCCESS</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: '600', color: '#94a3b8' }}>Logged: <strong style={{ color: '#ffffff' }}>{lastScannedPoint}</strong></p>
              </div>
            )}
          </div>

          {/* END PATROL SHIFT CONTROL TERMINATION BUTTON */}
          <button
            onClick={() => {
              if(confirm("Confirm action:\nAre you sure you want to finalize this round log tour?")) {
                setIsRoundStarted(false);
                setLastScannedPoint(null);
              }
            }}
            style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#ef4444', padding: '14px 0', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.5px' }}
          >
            🔒 FINALIZE & CLOSE TOUR LAP
          </button>
        </div>
      )}

      <div style={{ textAlign: 'center', color: '#1e293b', fontSize: '10px', fontWeight: 'bold', marginTop: '20px' }}>
        RASMSB SHAREDFIXED PLATFORM ENGINE CONTAINER v1.0.0
      </div>
    </div>
  )
}

export default function CompanyTerminalPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#020617', minHeight: '100vh', color: 'white', padding: '40px', fontWeight: 'bold' }}>Hooking fixed structural hardware...</div>}>
      <CompanyTerminalContent />
    </Suspense>
  )
}