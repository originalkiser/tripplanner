import { supabase } from './supabase'

export interface LinkPreview {
  title: string | null
  description: string | null
  image: string | null
}

export async function fetchLinkPreview(
  url: string,
): Promise<{ preview: LinkPreview | null; error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const { data, error } = await supabase.functions.invoke('link-preview', {
    body: { url },
    headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
  })

  if (error) return { preview: null, error: error.message }
  return { preview: data as LinkPreview, error: null }
}
