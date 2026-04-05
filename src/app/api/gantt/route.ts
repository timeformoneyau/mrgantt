import { NextResponse } from 'next/server'
import { supabase, PLAN_ID } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('gantt_plans')
    .select('data')
    .eq('id', PLAN_ID)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data?.data ?? null })
}

export async function POST(req: Request) {
  const body = await req.json()

  const { error } = await supabase
    .from('gantt_plans')
    .upsert({ id: PLAN_ID, data: body }, { onConflict: 'id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
