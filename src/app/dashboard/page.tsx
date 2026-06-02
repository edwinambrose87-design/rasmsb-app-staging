'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    getProfile()
  }, [supabase])

  return (
    <div style={{ padding: '40px' }}>
      {/* Header Section */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
          WELCOME BACK, {profile?.full_name?.toUpperCase() || 'USER'}
        </h1>
        <p style={{ color: '#666' }}>Here's what's happening today.</p>
      </div>

      {/* Stats Row (Placeholders) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        {[
          { label: 'TOTAL STAFF', value: '1', change: '+0%' },
          { label: 'ACTIVE TASKS', value: '0', change: '0' },
          { label: 'SYSTEM HEALTH', value: '100%', change: 'OK' },
          { label: 'PENDING ALERTS', value: '0', change: '0' }
        ].map((stat, i) => (
          <div key={i} style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 10px 0' }}>{stat.label}</p>
            <h2 style={{ margin: 0 }}>{stat.value}</h2>
          </div>
        ))}
      </div>
    </div>
  )
}