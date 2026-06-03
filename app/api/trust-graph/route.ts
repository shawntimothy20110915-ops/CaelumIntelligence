import { NextResponse } from 'next/server'
import { getStore, buildTrustGraph } from '@/lib/store'

export async function GET() {
  const store = getStore()
  const graph = buildTrustGraph(store)
  return NextResponse.json({ graph, nodeCount: graph.nodes.length, edgeCount: graph.edges.length })
}
