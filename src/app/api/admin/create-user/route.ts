import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

const VALID_ROLES = ['admin', 'staff', 'lender', 'superadmin']

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, password, role, organization_id } = await req.json()

    if (!full_name || !email || !password || !role || !organization_id) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
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
        organization_id,
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