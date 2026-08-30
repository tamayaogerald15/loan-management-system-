import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', user_id)

    if (error) {
      // If the user has related records (loans, assessments, etc.),
      // deactivate the account instead of blocking the action entirely.
      if (error.code === '23503') {
        const { error: deactivateError } = await supabase
          .from('users')
          .update({ is_active: false })
          .eq('id', user_id)

        if (deactivateError) {
          return NextResponse.json({ error: deactivateError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, softDeleted: true })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}