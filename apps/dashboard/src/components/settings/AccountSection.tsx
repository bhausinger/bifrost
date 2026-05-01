type AccountSectionProps = {
  userEmail: string | undefined
  userId: string | undefined
}

export function AccountSection({ userEmail, userId }: AccountSectionProps): JSX.Element {
  return (
    <div className="card p-6">
      <h2 className="text-sm font-display font-semibold text-gray-900 mb-4">Account</h2>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Email</span>
          <span className="font-medium text-gray-900">{userEmail ?? '-'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">User ID</span>
          <span className="font-mono text-xs text-gray-400">{userId ?? '-'}</span>
        </div>
      </div>
    </div>
  )
}
