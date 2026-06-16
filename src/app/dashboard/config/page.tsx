'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useSearchParams } from 'next/navigation'
import { useBrand } from '@/context/BrandContext'
import { buildFeatureAccess, DEFAULT_FEATURE_ACCESS, FEATURE_DEFINITIONS, FeatureKey } from '@/lib/featureSettings'

interface ProjectRow {
  id: string
  name: string
  slug: string
}

function SystemConfigContent() {
  const { themeColor } = useBrand()
  const searchParams = useSearchParams()
  const activeProjectSlug = searchParams.get('project')
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [selectedFeatureProjectId, setSelectedFeatureProjectId] = useState('')
  const [featureAccess, setFeatureAccess] = useState(DEFAULT_FEATURE_ACCESS)
  const [isFeatureLoading, setIsFeatureLoading] = useState(true)
  const [savingFeatureKey, setSavingFeatureKey] = useState<FeatureKey | null>(null)
  const [featureMessage, setFeatureMessage] = useState('')

  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  )

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

  useEffect(() => {
    async function loadProjects() {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, slug')
        .order('name', { ascending: true })

      if (error) {
        console.error('Failed to load projects for feature controls:', error)
        setIsFeatureLoading(false)
        return
      }

      const rows = data || []
      setProjects(rows)
      const projectFromUrl = rows.find((project) => project.slug === activeProjectSlug)
      const defaultProject = projectFromUrl || rows[0]
      if (defaultProject) setSelectedFeatureProjectId(defaultProject.id)
      else setIsFeatureLoading(false)
    }

    loadProjects()
  }, [activeProjectSlug, supabase])

  useEffect(() => {
    async function loadFeatureSettings() {
      if (!selectedFeatureProjectId) return
      setIsFeatureLoading(true)

      const { data, error } = await supabase
        .from('project_feature_settings')
        .select('feature_key, is_enabled')
        .eq('project_id', selectedFeatureProjectId)

      if (error) {
        console.error('Failed to load feature settings:', error)
        setFeatureAccess(DEFAULT_FEATURE_ACCESS)
      } else {
        setFeatureAccess(buildFeatureAccess(data))
      }

      setIsFeatureLoading(false)
    }

    loadFeatureSettings()
  }, [selectedFeatureProjectId, supabase])

  const toggleFeatureAccess = async (featureKey: FeatureKey, nextValue: boolean) => {
    if (!selectedFeatureProjectId) return

    setSavingFeatureKey(featureKey)
    setFeatureAccess((current) => ({ ...current, [featureKey]: nextValue }))

    const feature = FEATURE_DEFINITIONS.find((item) => item.key === featureKey)
    const { error } = await supabase
      .from('project_feature_settings')
      .upsert({
        project_id: selectedFeatureProjectId,
        feature_key: featureKey,
        feature_label: feature?.label || featureKey,
        is_enabled: nextValue
      }, { onConflict: 'project_id,feature_key' })

    if (error) {
      console.error('Failed to save feature setting:', error)
      setFeatureAccess((current) => ({ ...current, [featureKey]: !nextValue }))
      setFeatureMessage('Feature setting could not be saved. Please try again.')
    } else {
      setFeatureMessage(`${feature?.label || featureKey} ${nextValue ? 'enabled' : 'disabled'} for this project.`)
    }

    setSavingFeatureKey(null)
  }

  useEffect(() => {
    if (!featureMessage) return
    const timer = setTimeout(() => setFeatureMessage(''), 3500)
    return () => clearTimeout(timer)
  }, [featureMessage])

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
        {/* SECTION: PROJECT FEATURE ACCESS CONTROL */}
        <div style={containerStyle}>
          <h2 style={mainHeaderStyle}>Feature Access Control</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>
            <div>
              <label style={labelStyle}>Monitoring Site</label>
              <select
                value={selectedFeatureProjectId}
                onChange={(e) => setSelectedFeatureProjectId(e.target.value)}
                style={selectStyle}
                disabled={projects.length === 0}
              >
                {projects.length === 0 ? (
                  <option>No projects found</option>
                ) : projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <p style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.5, margin: '12px 0 0 0' }}>
                Turn features on or off for each project. Disabled features are hidden from the guard mobile app and blocked in the manager menu.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {FEATURE_DEFINITIONS.map((feature) => {
                const isEnabled = featureAccess[feature.key]
                const isSaving = savingFeatureKey === feature.key
                const isDisabled = isFeatureLoading || isSaving || !selectedFeatureProjectId

                return (
                  <div
                    key={feature.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '18px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      opacity: isFeatureLoading ? 0.65 : 1
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', display: 'block' }}>{feature.label}</span>
                      <span style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', display: 'block', lineHeight: 1.4 }}>{feature.description}</span>
                    </div>

                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => toggleFeatureAccess(feature.key, !isEnabled)}
                      aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${feature.label}`}
                      style={{
                        width: '54px',
                        height: '30px',
                        border: 'none',
                        borderRadius: '999px',
                        padding: '3px',
                        backgroundColor: isEnabled ? themeColor : '#cbd5e1',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s ease',
                        flexShrink: 0
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          transform: isEnabled ? 'translateX(24px)' : 'translateX(0)',
                          transition: 'transform 0.2s ease',
                          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.18)'
                        }}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {featureMessage && (
            <div style={{ marginTop: '14px', color: featureMessage.includes('could not') ? '#dc2626' : '#0f766e', fontSize: '12px', fontWeight: '700' }}>
              {featureMessage}
            </div>
          )}
        </div>
        
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

export default function SystemConfigPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: '#64748b', fontWeight: 700 }}>Loading system configuration...</div>}>
      <SystemConfigContent />
    </Suspense>
  )
}
