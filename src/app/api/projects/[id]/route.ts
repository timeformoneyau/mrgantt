import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// DELETE /api/projects/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabase.from('gantt_plans').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH /api/projects/[id] — rename
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rawName = (body as Record<string, unknown>)?.name
  if (typeof rawName !== 'string' || !rawName.trim()) {
    return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
  }
  const name = rawName.trim()

  const { error } = await supabase.from('gantt_plans').update({ name }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
