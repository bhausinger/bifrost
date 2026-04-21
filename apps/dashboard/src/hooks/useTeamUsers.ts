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
      // Fetch all users who have pipeline entries (the team)
      const { data, error } = await supabase
        .from('pipeline_entries')
        .select('assigned_to, created_by')

      if (error) throw error

      // Collect unique user IDs
      const ids = new Set<string>()
      for (const row of data ?? []) {
        if (row.assigned_to) ids.add(row.assigned_to)
        if (row.created_by) ids.add(row.created_by)
      }

      if (ids.size === 0) return []

      // Fetch user profiles from auth (via Supabase admin, but since we're
      // client-side we'll use the current user's info + any cached mapping)
      // For a 2-person team, we just use the current user's session
      const { data: { user } } = await supabase.auth.getUser()

      // Build the map — for now, include the current user
      const users: TeamUser[] = []
      if (user) {
        users.push({
          id: user.id,
          email: user.email ?? '',
          displayName: user.email?.split('@')[0] ?? 'You',
        })
      }

      return users
    },
    staleTime: 5 * 60 * 1000, // cache for 5 min
  })
}

export function getOwnerName(
  userId: string | null,
  teamUsers: TeamUser[] | undefined,
): string {
  if (!userId || !teamUsers) return ''
  const user = teamUsers.find((u) => u.id === userId)
  return user?.displayName ?? userId.slice(0, 6)
}
