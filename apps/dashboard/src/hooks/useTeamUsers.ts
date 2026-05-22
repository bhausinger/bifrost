import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

type TeamUser = {
  id: string
  email: string
  displayName: string
}

export function useTeamUsers() {
  return useQuery({
    queryKey: ['team-users'],
    queryFn: async (): Promise<TeamUser[]> => {
      const { data, error } = await supabase.from('profiles').select('id, display_name, email')

      if (error) throw error

      return (data ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        displayName: p.display_name,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function getOwnerName(userId: string | null, teamUsers: TeamUser[] | undefined): string {
  if (!userId || !teamUsers) return ''
  const user = teamUsers.find((u) => u.id === userId)
  return user?.displayName ?? ''
}
