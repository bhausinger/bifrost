import { describe, it, expect } from 'vitest'
import { getOwnerName } from '@/hooks/useTeamUsers'

type TeamUser = {
  id: string
  email: string
  displayName: string
}

const TEAM_USERS: TeamUser[] = [
  { id: 'user-abc-123', email: 'ben@example.com', displayName: 'ben' },
  { id: 'user-def-456', email: 'partner@example.com', displayName: 'partner' },
]

describe('getOwnerName', () => {
  it('returns display name when user found', () => {
    const result = getOwnerName('user-abc-123', TEAM_USERS)
    expect(result).toBe('ben')
  })

  it('returns empty string when user not found', () => {
    const result = getOwnerName('user-unknown-99', TEAM_USERS)
    expect(result).toBe('')
  })

  it('returns empty string for null userId', () => {
    const result = getOwnerName(null, TEAM_USERS)
    expect(result).toBe('')
  })

  it('returns empty string for undefined teamUsers', () => {
    const result = getOwnerName('user-abc-123', undefined)
    expect(result).toBe('')
  })
})
