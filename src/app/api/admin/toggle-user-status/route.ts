import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { user_id, is_active } = await req.json()

    if (!user_id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'user_id and is_active are required.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('users')
      .update({ is_active })
      .eq('id', user_id)
      .select('id, full_name, email, role, is_active')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user: data })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}