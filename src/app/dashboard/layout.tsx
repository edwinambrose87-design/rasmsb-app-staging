'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { BrandProvider, useBrand } from '@/context/BrandContext'
import { ProjectProvider, useProject } from '@/context/ProjectContext'

interface ProjectRow {
  id: string
  name: string
  slug: string
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  
  const { brandName, themeColor, logoUrl, setBrandName, setThemeColor, setLogoUrl } = useBrand()
  const { setProjectId } = useProject() // Added context hook
  
  const [selectedProject, setSelectedProject] = useState('')
  const [projectsList, setProjectsList] = useState<ProjectRow[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  
  const [currentUserName, setCurrentUserName] = useState('Loading...')
  const [currentUserEmail, setCurrentUserEmail] = useState('Loading...')
  const [userInitials, setUserInitials] = useState('..')

  const [isBrandingLoaded, setIsBrandingLoaded] = useState(false)
  const [isProjectsLoading, setIsProjectsLoading] = useState(true)

  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  )
  
  const syncGlobalSystemConfiguration = useCallback(async () => {
      try {
        let assignedProjectName: string | null = null
        let detectedRole: string | null = null

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserEmail(user.email || '')
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, project_name, full_name, email')
            .eq('id', user.id)
            .maybeSingle()
          
          if (profile) {
            detectedRole = profile.role
            assignedProjectName = profile.project_name
            setUserRole(profile.role)
            
            const displayName = profile.full_name || 'Operational User'
            setCurrentUserName(displayName)
            if (profile.email) setCurrentUserEmail(profile.email)
            
            const initials = displayName
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()
            setUserInitials(initials || 'US')
          }
        }

        const { data: brandData, error: brandErr } = await supabase
          .from('global_branding')
          .select('*')
          .limit(1)
          
        if (!brandErr && brandData && brandData.length > 0) {
          const config = brandData[0]
          if (setBrandName) setBrandName(config.organization_name)
          if (setThemeColor) setThemeColor(config.theme_color)
          if (setLogoUrl) setLogoUrl(config.logo_url)
        }
        setIsBrandingLoaded(true)

        let projectQuery = supabase
          .from('projects')
          .select('id, name, slug')
          
        if (detectedRole === 'building_manager' && assignedProjectName) {
          projectQuery = projectQuery.eq('name', assignedProjectName)
        } else {
          projectQuery = projectQuery.order('name', { ascending: true })
        }

        const { data: projData, error: projErr } = await projectQuery

        if (projErr) throw projErr
        if (projData) {
          setProjectsList(projData)
          if (projData.length > 0) {
            const urlParams = new URLSearchParams(window.location.search)
            const currentUrlSlug = urlParams.get('project')
            
            if (currentUrlSlug) {
              setSelectedProject(currentUrlSlug)
              setProjectId(currentUrlSlug) // Sync on load
            } else {
              const defaultSlug = projData[0].slug
              setSelectedProject(defaultSlug)
              setProjectId(defaultSlug) // Sync on load
              if (window.location.pathname.startsWith('/dashboard')) {
                router.push(`${window.location.pathname}?project=${defaultSlug}`)
              }
            }
          }
        }
      } catch (err) {
        console.error('Error synchronizing core workspace matrices:', err)
        setIsBrandingLoaded(true)
      } finally {
        setIsProjectsLoading(false)
      }
  }, [router, setBrandName, setLogoUrl, setProjectId, setThemeColor, supabase])

  useEffect(() => {
    syncGlobalSystemConfiguration()

    const realTimeChannel = supabase
      .channel('projects-global-layout-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        syncGlobalSystemConfiguration()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(realTimeChannel)
    }
  }, [supabase, syncGlobalSystemConfiguration])

  const handleProjectDropdownChange = (newSlug: string) => {
    setSelectedProject(newSlug)
    setProjectId(newSlug) // Sync on change
    if (pathname.startsWith('/dashboard')) {
      router.push(`${pathname}?project=${newSlug}`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login?logout=true')
  }

  if (!isBrandingLoaded) {
    return <div style={{ width: '100vw', height: '100vh', backgroundColor: '#f8fafc' }} />
  }

  const siteSpecificItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM5 20a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2z' },
    { name: 'Clocking Report', path: '/dashboard/Clocking_Report', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Incident Report', path: '/dashboard/incident', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { name: 'Attendance Report', path: '/dashboard/attendance', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { name: 'Emergency Contact', path: '/dashboard/emergency', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
    { name: 'SOP', path: '/dashboard/sop', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4 1.253' },
    { name: 'VMS', path: '/dashboard/vms', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m22-2v2m-2-7a3 3 0 11-6 0 3 3 0 016 0zM11 7a4 4 0 11-8 0 4 4 0 018 0z' }
  ]

  const directoryItems = [
    { name: 'Guards Directory', path: '/dashboard/guards', icon: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Project Directory', path: '/dashboard/project-directory', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' }
  ]

  const appSettingsItems = [
    { name: 'Global Branding', path: '/dashboard/global-branding', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { name: 'System Logs', path: '/dashboard/system-logs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'System Config', path: '/dashboard/config', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM12 15a3 3 0 100-6 3 3 0 000 6z' }
  ]

  const renderNavLinks = (itemsList: any[]) => {
    return itemsList.map((item) => {
      const isActive = pathname === item.path
      const pathWithQuery = selectedProject ? `${item.path}?project=${selectedProject}` : item.path

      return (
        <Link key={item.path} href={pathWithQuery} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '11px 16px', 
              borderRadius: '8px', 
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: 'white',
              opacity: isActive ? 1 : 0.75,
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '3px',
              fontWeight: isActive ? '700' : '500',
              transition: 'all 0.15s ease-in-out',
              userSelect: 'none'
            }}
            onMouseOver={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'
                e.currentTarget.style.opacity = '1'
              }
            }}
            onMouseOut={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.opacity = '0.75'
              }
            }}
          >
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            <span style={{ whiteSpace: 'nowrap' }}>{item.name}</span>
          </div>
        </Link>
      )
    })
  }

  const sectionHeaderStyle = { fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '700', padding: '12px 16px 6px 16px', letterSpacing: '0.06em', textTransform: 'uppercase' as const, margin: 0 }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
      
      <div style={{ 
        width: '280px', 
        minWidth: '280px',
        backgroundColor: themeColor, 
        color: 'white', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        height: '100%',
        overflow: 'hidden',
        borderRight: '1px solid rgba(0,0,0,0.05)'
      }}>
        
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '35px 24px 25px 24px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: '38px', height: '38px', backgroundColor: 'white', borderRadius: '8px', color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', overflow: 'hidden', flexShrink: 0 }}>
              {logoUrl ? <img src={logoUrl} alt={`${brandName} logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : brandName?.substring(0,1)}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '0.5px', color: 'white' }}>{brandName}</div>
          </div>
          
          <div style={{ padding: '20px 14px' }}>
            <nav style={{ marginBottom: '22px' }}>
              <p style={sectionHeaderStyle}>Site Specific Operations</p>
              {renderNavLinks(siteSpecificItems)}
            </nav>

            {userRole === 'admin' && (
              <>
                <nav style={{ marginBottom: '22px' }}>
                  <p style={sectionHeaderStyle}>Master Repositories</p>
                  {renderNavLinks(directoryItems)}
                </nav>

                <nav style={{ marginBottom: '10px' }}>
                  <p style={sectionHeaderStyle}>System Architecture</p>
                  {renderNavLinks(appSettingsItems)}
                </nav>
              </>
            )}
          </div>
        </div>

        <div style={{ 
          padding: '20px 20px', 
          borderTop: '1px solid rgba(255,255,255,0.08)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          backgroundColor: 'rgba(0,0,0,0.12)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13.5px', fontWeight: 'bold', flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)' }}>
              {userInitials}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <strong style={{ fontSize: '13.5px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '135px' }}>
                {currentUserName}
              </strong>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '135px' }}>
                {currentUserEmail}
              </span>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={handleLogout} 
            style={{ background: 'none', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg style={{ width: '18px', height: '18px', stroke: '#fca5a5', strokeWidth: '2.5', fill: 'none' }} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        <div style={{ height: '75px', minHeight: '75px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', borderBottom: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px' }}>🏢 MONITORING SITE:</span>
            
            <select 
              value={selectedProject} 
              onChange={(e) => handleProjectDropdownChange(e.target.value)} 
              disabled={isProjectsLoading}
              style={{ 
                padding: '8px 36px 8px 16px', 
                borderRadius: '8px', 
                backgroundColor: isProjectsLoading ? '#e2e8f0' : '#f1f5f9', 
                color: '#1e293b', 
                border: '1px solid #cbd5e1', 
                outline: 'none', 
                cursor: isProjectsLoading ? 'not-allowed' : 'pointer', 
                fontSize: '15px', 
                fontWeight: 'bold',
                height: '42px',
                width: '280px'
              }}
            >
              {isProjectsLoading ? (
                <option>Loading deployment areas...</option>
              ) : (
                projectsList.map((project) => (
                  <option key={project.id} value={project.slug}>
                    {project.name}
                  </option>
                ))
              )}
            </select>
          </div>
          
          <button style={{ backgroundColor: themeColor, color: 'white', padding: '10px 22px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', height: '42px', transition: 'background-color 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            + New Action
          </button>
        </div>
        
        <div key={selectedProject} style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>

    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <BrandProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </BrandProvider>
    </ProjectProvider>
  )
}
