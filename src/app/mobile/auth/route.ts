import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  const formData = await request.formData()
  const rawLoginId = String(formData.get('login_id') || '').trim()
  const accessPin = String(formData.get('access_pin') || '').trim()
  const host = request.headers.get('host') || new URL(request.url).host
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const origin = `${protocol}://${host}`

  if (!rawLoginId || !accessPin) {
    return NextResponse.redirect(`${origin}/mobile?error=missing_credentials`, 303)
  }

  const loginIdUpper = rawLoginId.toUpperCase()
  const loginIdLower = rawLoginId.toLowerCase()

  try {
    if (loginIdUpper.startsWith('TERM-')) {
      const { data: terminalDevice, error: terminalError } = await supabase
        .from('device_terminals')
        .select('terminal_id, project_slug, access_pin')
        .eq('access_pin', accessPin)
        .or(`terminal_id.eq.${loginIdUpper},terminal_id.eq.${loginIdLower}`)
        .maybeSingle()

      if (terminalError) throw terminalError

      if (terminalDevice) {
        return NextResponse.redirect(
          `${origin}/mobile/company_terminal?project=${encodeURIComponent(terminalDevice.project_slug)}&terminal=${encodeURIComponent(terminalDevice.terminal_id)}`,
          303
        )
      }
    }

    const { data: guardProfile, error: guardError } = await supabase
      .from('guards')
      .select('id, name, app_password_hash, staff_id, project_id')
      .eq('app_password_hash', accessPin)
      .or(`name.eq.${rawLoginId},staff_id.eq.${rawLoginId}`)
      .maybeSingle()

    if (guardError) throw guardError

    if (guardProfile) {
      let projectName = ''
      if (guardProfile.project_id) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('name')
          .eq('id', guardProfile.project_id)
          .maybeSingle()

        projectName = projectData?.name || ''
      }

      const params = new URLSearchParams({
        guard_id: guardProfile.id,
        guard_name: guardProfile.name || 'Security Officer'
      })

      if (guardProfile.project_id) {
        params.set('project_id', guardProfile.project_id)
      }
      if (projectName) {
        params.set('project_name', projectName)
      }

      return NextResponse.redirect(
        `${origin}/mobile/personal_dashboard?${params.toString()}`,
        303
      )
    }

    return NextResponse.redirect(`${origin}/mobile?error=invalid_credentials`, 303)
  } catch (err: any) {
    return NextResponse.redirect(`${origin}/mobile?error=${encodeURIComponent(err.message || 'network_error')}`, 303)
  }
}
