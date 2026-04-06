import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/projects — list all projects (id, name, updated_at only)
export async function GET() {
  const { data, error } = await supabase
    .from('gantt_plans')
    .select('id, name, updated_at')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ projects: data })
}

// POST /api/projects — create a new empty project
export async function POST(req: Request) {
  const { name } = await req.json()

  const { data, error } = await supabase
    .from('gantt_plans')
    .insert({
      name: name || 'Untitled',
      data: { tasks: [], rows: [{ id: 'row-unassigned', name: 'Staging', order: 9999, isSystem: true }], dividers: [], dependencies: [] },
    })
    .select('id, name, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: data })
}
