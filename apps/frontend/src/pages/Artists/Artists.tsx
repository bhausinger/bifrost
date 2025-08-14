export function Artists() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Artists
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          Discover and manage artists for your campaigns
        </p>
      </div>
      
      <div className="card">
        <p className="text-gray-500">No artists found. Use our discovery tools to find new artists.</p>
      </div>
    </div>
  );
}