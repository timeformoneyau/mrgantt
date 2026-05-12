import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/gantt?id=123
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('gantt_plans')
    .select('data, name')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data?.data ?? null, name: data?.name ?? null })
}

// POST /api/gantt?id=123
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    typeof body !== 'object' || body === null ||
    !Array.isArray((body as Record<string, unknown>).tasks) ||
    !Array.isArray((body as Record<string, unknown>).rows) ||
    !Array.isArray((body as Record<string, unknown>).dividers) ||
    !Array.isArray((body as Record<string, unknown>).dependencies)
  ) {
    return NextResponse.json({ error: 'Body must be a snapshot with tasks, rows, dividers, and dependencies arrays' }, { status: 400 })
  }

  const { error } = await supabase
    .from('gantt_plans')
    .update({ data: body })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
