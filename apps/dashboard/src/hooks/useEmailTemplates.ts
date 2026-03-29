import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: string
  created_at: string
  updated_at: string
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name')
      if (error) throw error
      return data as EmailTemplate[]
    },
  })
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (template: {
      name: string
      subject: string
      body: string
      category: string
    }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert(template)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
    },
  })
}

/**
 * Renders template variables into a string.
 * Supported: {{artistName}}, {{mostRecentTrack}}, {{deckLink}}, {{senderName}}
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] ?? match
  })
}

/**
 * Strips emojis from text for clean email content.
 */
export function stripEmojis(text: string): string {
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
      ''
    )
    .replace(/\s{2,}/g, ' ')
    .trim()
}
