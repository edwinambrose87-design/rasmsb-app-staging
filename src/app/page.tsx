import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // This part looks into your new 'profiles' table for your details
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ padding: '50px', fontFamily: 'Arial' }}>
      <h1>Rashid Azlan Security HQ</h1>
      <p>Welcome back, <strong>{user.email}</strong></p>
      
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #0070f3', borderRadius: '8px' }}>
        <h3>User Profile Details:</h3>
        <p>Name: {profile?.full_name || 'Not set yet'}</p>
        <p>Role: {profile?.role || 'No role assigned'}</p>
        <p>Project: {profile?.project_name || 'Main Office'}</p>
      </div>
    </div>
  )
}