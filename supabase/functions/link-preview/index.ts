// Fetches a URL server-side (browsers block cross-origin HTML reads) and
// pulls out title/description/image from OpenGraph tags or plain <title>/
// <meta name="description">, so the create-activity form can offer a
// prefilled description from a link someone pastes in.

import { corsHeaders, handleCors } from '../_shared/cors.ts'

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i'),
  ]
  for (const re of patterns) {
    const match = html.match(re)
    if (match) return match[1]
  }
  return null
}

function extractName(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i'),
  ]
  for (const re of patterns) {
    const match = html.match(re)
    if (match) return match[1]
  }
  return null
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

Deno.serve(async (req) => {
  const preflight = handleCors(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: corsHeaders,
    })
  }

  const { url } = await req.json()
  if (!url || !/^https?:\/\//.test(url)) {
    return new Response(JSON.stringify({ error: 'A valid http(s) URL is required' }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TripPlannerLinkPreview/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    const html = (await res.text()).slice(0, 200_000)

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = extractMeta(html, 'og:title') ?? (titleMatch ? titleMatch[1] : null)
    const description = extractMeta(html, 'og:description') ?? extractName(html, 'description')
    const image = extractMeta(html, 'og:image')

    return new Response(
      JSON.stringify({
        title: title ? decodeEntities(title.trim()) : null,
        description: description ? decodeEntities(description.trim()) : null,
        image: image ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: `Could not fetch that link: ${err.message}` }), {
      status: 502,
      headers: corsHeaders,
    })
  }
})
