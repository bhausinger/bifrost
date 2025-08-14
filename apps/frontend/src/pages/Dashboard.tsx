export function Dashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          Welcome to your campaign management dashboard
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900">Active Campaigns</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">0</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900">Total Artists</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">0</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900">Outreach Sent</h3>
          <p className="mt-2 text-3xl font-bold text-purple-600">0</p>
        </div>
      </div>
    </div>
  );
}