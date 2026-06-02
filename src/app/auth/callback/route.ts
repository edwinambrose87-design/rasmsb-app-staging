import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    // 1. Exchange the Google authorization code for an internal session
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!authError && authData?.user) {
      const userEmail = authData.user.email

      // 2. CHECKPOINT: Look up this email inside your freshly modified public.profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', userEmail)
        .maybeSingle()

      // 3. REJECTION RULE: If the email doesn't exist in your directory, kick them out immediately!
      if (profileError || !profile) {
        // Clear out the unverified session cookies from the browser
        await supabase.auth.signOut()
        
        // Bounce them back to the login page with an access warning flag
        return NextResponse.redirect(`${origin}/login?error=unauthorized_identity`)
      }

      // SUCCESS: The user is in your profile list. Allow entry to the dashboard!
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // Fallback fallback on general network failures
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}