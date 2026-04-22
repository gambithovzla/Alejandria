import { type NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SERVER_API_BASE_URL = process.env.NOVEL_ENGINE_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

function buildUpstreamUrl(pathSegments: string[], request: NextRequest) {
  if (!SERVER_API_BASE_URL) {
    throw new Error('Missing NOVEL_ENGINE_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL')
  }

  const upstreamUrl = new URL(`${SERVER_API_BASE_URL}/${pathSegments.join('/')}`)
  upstreamUrl.search = request.nextUrl.search
  return upstreamUrl
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const upstreamUrl = buildUpstreamUrl(path, request)
  const headers = new Headers(request.headers)

  headers.delete('host')
  headers.delete('connection')
  headers.delete('content-length')

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
    cache: 'no-store',
    redirect: 'manual',
  })

  const responseHeaders = new Headers(upstreamResponse.headers)
  responseHeaders.delete('content-encoding')
  responseHeaders.delete('content-length')

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context)
}
