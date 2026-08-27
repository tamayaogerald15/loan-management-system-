import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, password } = await req.json()

    // Ang role ay palaging 'staff' sa self-signup, kahit ano pa
    // ang ipadala sa request body — proteksyon laban sa mga
    // sumusubok mag-bypass sa form at direktang tumawag sa API.
    const role = 'staff'

    if (!full_name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const { data, error } = await supabase
      .from('users')
      .insert({
        organization_id: ORG_ID,
        full_name,
        email,
        password_hash,
        role,
        is_active: true,
      })
      .select('id, full_name, email, role')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user: data })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}