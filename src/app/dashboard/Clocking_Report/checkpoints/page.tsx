'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import QRCode from 'qrcode'

interface MasterCheckpointRow {
  id: number
  name: string
  project_slug: string
  created_at: string
}

export default function QRManagementPage() {
  const searchParams = useSearchParams()
  const activeProjectSlug = searchParams.get('project') || 'aia-bhd'

  const [newPointName, setNewPointName] = useState('')
  const [checkpoints, setCheckpoints] = useState<MasterCheckpointRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const checkpointCacheRef = useRef<Record<string, MasterCheckpointRow[]>>({})
  
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null)
  const [fileNameLabel, setFileNameLabel] = useState('No file chosen')
  const [brandingRecordId, setBrandingRecordId] = useState<string | null>(null)

  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  )

  useEffect(() => {
    let isCurrentRequestActive = true

    async function streamMasterCheckpoints() {
      const cachedCheckpoints = checkpointCacheRef.current[activeProjectSlug]
      if (cachedCheckpoints) {
        setCheckpoints(cachedCheckpoints)
        setIsLoading(false)
      } else {
        setCheckpoints([])
        setIsLoading(true)
      }

      try {
        const { data, error } = await supabase
          .from('clocking_master_checkpoints')
          .select('id, name, project_slug, created_at')
          .eq('project_slug', activeProjectSlug)
          .order('created_at', { ascending: false })

        if (error) throw error
        if (!isCurrentRequestActive) return

        const nextCheckpoints = data || []
        setCheckpoints(nextCheckpoints)
        checkpointCacheRef.current[activeProjectSlug] = nextCheckpoints
      } catch (err) {
        console.error('Failed fetching master station links:', err)
      } finally {
        if (isCurrentRequestActive) setIsLoading(false)
      }
    }

    streamMasterCheckpoints()

    return () => {
      isCurrentRequestActive = false
    }
  }, [activeProjectSlug, supabase])

  useEffect(() => {
    async function loadGlobalQrLogo() {
      try {
        const { data, error } = await supabase
          .from('global_branding')
          .select('id, logo_url')
          .limit(1)

        if (error) throw error

        if (data && data.length > 0) {
          setBrandingRecordId(data[0].id)
          if (data[0].logo_url) {
            setCustomLogoUrl(data[0].logo_url)
            setFileNameLabel('Using global branding logo')
          }
        }
      } catch (err) {
        console.error('Failed loading global QR logo:', err)
      }
    }

    loadGlobalQrLogo()
  }, [supabase])

  const handleCreateCheckpt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPointName.trim()) return
    
    const targetPayloadName = newPointName.toUpperCase().trim()

    try {
      const { data, error } = await supabase
        .from('clocking_master_checkpoints')
        .insert([
          { 
            name: targetPayloadName, 
            project_slug: activeProjectSlug 
          }
        ])
        .select()

      if (error) throw error

      if (data) {
        const nextCheckpoints = [data[0], ...checkpoints]
        setCheckpoints(nextCheckpoints)
        checkpointCacheRef.current[activeProjectSlug] = nextCheckpoints
        setNewPointName('')
      }
    } catch (err) {
      console.error('Failed creating master station parameter:', err)
      alert('Database fault: Could not save checkpoint.')
    }
  }

  const triggerDeleteConfirm = async (id: number, name: string) => {
    if (!confirm(`⚠️ Delete physical checkpoint: "${name}"?\nThis removes it from this project's master directory.`)) return

    try {
      const { error } = await supabase
        .from('clocking_master_checkpoints')
        .delete()
        .eq('id', id)

      if (error) throw error
      const nextCheckpoints = checkpoints.filter(cp => cp.id !== id)
      setCheckpoints(nextCheckpoints)
      checkpointCacheRef.current[activeProjectSlug] = nextCheckpoints
    } catch (err) {
      console.error('Failed to clear master checkpoint row:', err)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'image/png') {
      alert('Operational Error: Please upload a file strictly in PNG format to preserve background transparency.')
      return
    }

    setFileNameLabel(file.name)

    const reader = new FileReader()
    reader.onload = async (event) => {
      if (event.target?.result) {
        const logoDataUrl = event.target.result as string
        setCustomLogoUrl(logoDataUrl)

        try {
          if (brandingRecordId) {
            const { error } = await supabase
              .from('global_branding')
              .update({
                logo_url: logoDataUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', brandingRecordId)

            if (error) throw error
          } else {
            const { data, error } = await supabase
              .from('global_branding')
              .insert([{
                organization_name: 'RASMSB',
                theme_color: '#1E3A8A',
                logo_url: logoDataUrl,
                brightness_adjustment: 0
              }])
              .select('id')

            if (error) throw error
            if (data && data.length > 0) setBrandingRecordId(data[0].id)
          }

          localStorage.setItem('global_logo_url', logoDataUrl)
          alert(`Success!\n"${file.name}" has been saved as the global QR center logo.`)
        } catch (err: any) {
          console.error('Failed saving global QR logo:', err)
          alert(`Save failed: ${err.message}`)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  // 🛠️ UPGRADED SCANNABLE GENERATION WORKFLOW
  const triggerRealQRDownload = async (name: string, databaseId: number, sequentialId: string) => {
    // 1. Establish the clean canvas bounds
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 460
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fill white background frame
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 400, 460)

    // 2. THE DATA PAYLOAD: Strict production formatting for mobile hardware recognition
    const scannableDataPayload = buildQrPayload(activeProjectSlug, databaseId)

    try {
      // 3. Create an off-screen temporary canvas for the pure raw QR matrix blocks
      const qrCanvas = document.createElement('canvas')
      
      await QRCode.toCanvas(qrCanvas, scannableDataPayload, {
        width: 320,
        margin: 0,
        errorCorrectionLevel: 'H' // High correction margin allows for logo overlays safely
      })

      // Draw the mathematical QR matrix onto our master layout card
      ctx.drawImage(qrCanvas, 40, 40, 320, 320)

      if (customLogoUrl) {
        const centerX = 200
        const centerY = 200
        const badgeSize = 76
        const logoX = centerX - (badgeSize / 2)
        const logoY = centerY - (badgeSize / 2)
        const img = new Image()
        img.src = customLogoUrl
        img.onload = () => {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(logoX, logoY, badgeSize, badgeSize)
          ctx.drawImage(img, centerX - 32, centerY - 32, 64, 64)
          finalizeAndDownload(canvas, name, sequentialId)
        }
        img.onerror = () => finalizeAndDownload(canvas, name, sequentialId)
      } else {
        finalizeAndDownload(canvas, name, sequentialId)
      }
    } catch (err) {
      console.error('QR Engine Matrix generation fault:', err)
      alert('Drawing Error: Matrix encoder failed to process data properties.')
    }
  }

  const finalizeAndDownload = (canvas: HTMLCanvasElement, name: string, sequentialId: string) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#1e3a8a'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(name, 200, 410)
    
    ctx.fillStyle = '#64748b'
    ctx.font = '600 12px monospace'
    ctx.fillText(`SECURITY SYSTEM ID: CP-${sequentialId}`, 200, 433)

    const imageURI = canvas.toDataURL('image/png')
    const virtualLink = document.createElement('a')
    virtualLink.download = `QR_PRODUCTION_CP-${sequentialId}.png`
    virtualLink.href = imageURI
    
    document.body.appendChild(virtualLink)
    virtualLink.click()
    document.body.removeChild(virtualLink)
  }

  const formatDisplayDate = (timestampStr: string) => {
    if (!timestampStr) return 'Syncing...'
    const cleanDate = new Date(timestampStr)
    const dd = String(cleanDate.getDate()).padStart(2, '0')
    const mm = String(cleanDate.getMonth() + 1).padStart(2, '0')
    const yyyy = cleanDate.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100%', width: '100%', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', maxWidth: '1200px', width: '100%' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
            CHECKPOINT QR MANAGEMENT
          </h1>
          <p style={{ color: '#64748b', marginTop: '5px', margin: 0 }}>Create, export, and manage physical asset location codes for patrol validation.</p>
        </div>

        <Link 
          href={`/dashboard/Clocking_Report?project=${activeProjectSlug}`} 
          style={{ textDecoration: 'none', backgroundColor: '#1e3a8a', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.15)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          ⬅️ Back to Clocking Report
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '30px', maxWidth: '1200px', width: '100%', alignItems: 'start' }}>
        
        {/* FORM MODULE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '25px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#1e3a8a', fontWeight: 'bold' }}>REGISTER NEW CHECKPOINT</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>Generates an encrypted string tied strictly to this building deployment handle.</p>

            <form onSubmit={handleCreateCheckpt} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>LOCATION / STATION NAME</label>
                <input 
                  type="text"
                  placeholder="e.g. GUARD HOUSE MAIN RECEPTION"
                  value={newPointName}
                  onChange={(e) => setNewPointName(e.target.value)}
                  style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', color: '#1e293b', fontWeight: '500', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                style={{ width: '100%', backgroundColor: '#1e3a8a', color: 'white', border: 'none', padding: '12px 0', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.2)' }}
              >
                Generate Checkpoint QR
              </button>
            </form>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '25px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#1e3a8a', fontWeight: 'bold' }}>⚙️ CUSTOM CENTER LOGO CONFIG</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>Upload a transparent corporate .PNG file to display in the middle of all generated codes.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>SELECT LOGO FILE (.PNG ONLY)</label>
              
              <div style={{ position: 'relative', width: '100%', height: '44px', display: 'flex', alignItems: 'center', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '0 10px', boxSizing: 'border-box', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                <span style={{ fontSize: '12px', color: customLogoUrl ? '#10b981' : '#64748b', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '80%' }}>
                  {customLogoUrl ? `✅ ${fileNameLabel}` : fileNameLabel}
                </span>
                <button style={{ position: 'absolute', right: '10px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', pointerEvents: 'none' }}>Browse</button>
                <input 
                  type="file" 
                  accept="image/png" 
                  onChange={handleLogoUpload}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

        </div>

        {/* LEDGER DISPLAY GRID */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 25px', backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0', fontWeight: 'bold', color: '#1e3a8a', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <span>ACTIVE PHYSICAL LOCATION TAGS DIRECTORY ({checkpoints.length}) - SITE KEY: <span style={{color: '#10b981'}}>{activeProjectSlug.toUpperCase()}</span></span>
            {isLoading && checkpoints.length > 0 && (
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '800' }}>SYNCING...</span>
            )}
          </div>

          <div style={{ padding: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '120px', transition: 'opacity 0.2s ease', opacity: isLoading && checkpoints.length > 0 ? 0.72 : 1 }}>
              {isLoading && checkpoints.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontWeight: '600', fontSize: '14px' }}>
                  Loading localized site master directories...
                </div>
              ) : checkpoints.length > 0 ? (
                checkpoints.map((cp, index) => {
                  const localizedDisplayId = String(checkpoints.length - index).padStart(3, '0')

                  return (
                    <div 
                      key={cp.id}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', border: '1px solid #f1f5f9', borderRadius: '10px', backgroundColor: '#f8fafc' }}
                    >
                      <div style={{ flex: 1, paddingRight: '20px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', fontFamily: 'monospace' }}>
                          CP-{localizedDisplayId}
                        </span>
                        <h4 style={{ margin: '6px 0 2px 0', fontSize: '15px', color: '#1e293b', fontWeight: '700' }}>{cp.name}</h4>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Published Setup Date: {formatDisplayDate(cp.created_at)}</span>
                      </div>

                      <QrPreview payload={buildQrPayload(activeProjectSlug, cp.id)} customLogoUrl={customLogoUrl} />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => triggerRealQRDownload(cp.name, cp.id, localizedDisplayId)}
                          style={{ backgroundColor: 'white', color: '#10b981', border: '1px solid #10b981', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; e.currentTarget.style.color = 'white'; }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = '#10b981'; }}
                        >
                          🖨️ Download QR
                        </button>

                        <button 
                          onClick={() => triggerDeleteConfirm(cp.id, cp.name)}
                          title="Delete Checkpoint"
                          style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', width: '34px', height: '34px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          🗑️
                        </button>
                      </div>

                    </div>
                  )
                })
              ) : (
                <div style={{ padding: '40px', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', color: '#64748b', fontWeight: '500', fontSize: '14px', backgroundColor: 'white' }}>
                  No localized master QR station codes registered for this building sector yet.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function buildQrPayload(projectSlug: string, databaseId: number) {
  return `RASMSB|${projectSlug}|${databaseId}`
}

function QrPreview({ payload, customLogoUrl }: { payload: string; customLogoUrl: string | null }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function generatePreview() {
      try {
        const canvas = document.createElement('canvas')
        await QRCode.toCanvas(canvas, payload, {
          width: 76,
          margin: 1,
          errorCorrectionLevel: 'H'
        })

        const ctx = canvas.getContext('2d')
        if (ctx && customLogoUrl) {
          const img = new Image()
          img.src = customLogoUrl
          img.onload = () => {
            if (!isMounted) return
            const centerX = canvas.width / 2
            const centerY = canvas.height / 2
            const badgeSize = 22
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(centerX - badgeSize / 2, centerY - badgeSize / 2, badgeSize, badgeSize)
            ctx.drawImage(img, centerX - 9, centerY - 9, 18, 18)
            setPreviewUrl(canvas.toDataURL('image/png'))
          }
          img.onerror = () => {
            if (isMounted) setPreviewUrl(canvas.toDataURL('image/png'))
          }
          return
        }

        if (isMounted) setPreviewUrl(canvas.toDataURL('image/png'))
      } catch (err) {
        console.error('Failed generating QR preview:', err)
        if (isMounted) setPreviewUrl(null)
      }
    }

    generatePreview()

    return () => {
      isMounted = false
    }
  }, [payload, customLogoUrl])

  return (
    <div style={{ width: '70px', height: '70px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', boxSizing: 'border-box', marginRight: '25px' }}>
      {previewUrl ? (
        <img src={previewUrl} alt="QR preview" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      ) : (
        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>QR</span>
      )}
    </div>
  )
}
