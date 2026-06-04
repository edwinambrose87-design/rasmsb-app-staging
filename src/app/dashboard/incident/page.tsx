'use client'
import { useState, useEffect } from 'react'
import { useProject } from '@/context/ProjectContext'
import { supabase } from '@/lib/supabase' // Your existing path

export default function IncidentReportPage() {
  const { projectId } = useProject()
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Existing UI States
  const [startDate, setStartDate] = useState('2026-05-14')
  const [endDate, setEndDate] = useState('2026-05-16')
  const [expandedCardIds, setExpandedCardIds] = useState<number[]>([1])
  const [activeMainTab, setActiveMainTab] = useState<'LIVE' | 'VAULT'>('LIVE')
  const [activeSubTab, setActiveSubTab] = useState<'ACTIVE' | 'RESOLVED_HIST'>('ACTIVE')
  const [vaultSearch, setVaultSearch] = useState('')
  const [vaultSiteFilter, setVaultSiteFilter] = useState('ALL')

  // Live Data Fetching
  useEffect(() => {
    if (!projectId) return

    const fetchIncidents = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) console.error('Error fetching incidents:', error)
      else setIncidents(data || [])
      setLoading(false)
    }

    fetchIncidents()
  }, [projectId])

  // Workflow Helper
  const advanceTicketWorkflow = async (id: string, currentStatus: string) => {
    let nextStatus = currentStatus === 'NEW' ? 'PENDING' : 'RESOLVED'
    
    const { error } = await supabase
      .from('incident_reports')
      .update({ status: nextStatus })
      .eq('id', id)
      
    if (!error) {
      setIncidents(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t))
    }
  }

  // NOTE: Your existing JSX (UI code) from the previous snippet goes here. 
  // Just ensure you map over {incidents} instead of your old hardcoded array.

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%' }}>
        {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>Loading incident data...</div>
        ) : (
            /* Paste your entire original return (JSX) here. 
               Map 'incidents' to display the data dynamically! */
            <div>
               {/* Example of how you would now access live data: */}
               {incidents.map((incident) => (
                  <div key={incident.id}>{incident.ticket_no} - {incident.status}</div>
               ))}
            </div>
        )}
    </div>
  )
}