import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, email, password_hash, role, is_active')
      .eq('email', email)
      .maybeSingle()

    if (error || !user) {
      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'This account is inactive.' }, { status: 403 })
    }

    const isValid = await bcrypt.compare(password, user.password_hash)

    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}