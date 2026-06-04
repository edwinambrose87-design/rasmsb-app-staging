'use client'
import { useState, useEffect } from 'react'
import { useProject } from '@/context/ProjectContext'
import { supabase } from '@/lib/supabase'

export default function IncidentReportPage() {
  const { projectId } = useProject()
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // UI States
  const [activeMainTab, setActiveMainTab] = useState<'LIVE' | 'VAULT'>('LIVE')
  const [activeSubTab, setActiveSubTab] = useState<'ACTIVE' | 'RESOLVED_HIST'>('ACTIVE')

  useEffect(() => {
    if (!projectId) return

    const fetchIncidents = async () => {
      setLoading(true)
      console.log("Fetching incidents for Project ID:", projectId)
      
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase Error:', error)
      } else {
        console.log("Data received:", data)
        setIncidents(data || [])
      }
      setLoading(false)
    }

    fetchIncidents()
  }, [projectId])

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', fontSize: '18px' }}>
          Loading incident data...
        </div>
      ) : (
        <div>
          <h1 style={{ marginBottom: '20px' }}>Incident Reports</h1>
          {incidents.length === 0 ? (
            <p>No incidents found for this project.</p>
          ) : (
            incidents.map((incident) => (
              <div 
                key={incident.id} 
                style={{ 
                  padding: '15px', 
                  border: '1px solid #ddd', 
                  marginBottom: '10px', 
                  borderRadius: '8px',
                  backgroundColor: 'white'
                }}
              >
                <strong>Ticket: {incident.ticket_no || 'N/A'}</strong> - Status: {incident.status}
                <p>Description: {incident.description}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}