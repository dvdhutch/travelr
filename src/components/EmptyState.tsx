export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-6xl mb-4" role="img" aria-label="world map">
        🗺️
      </div>
      <h3 className="text-xl font-semibold mb-2">No videos yet</h3>
      <p className="text-muted max-w-md">
        Create your first travel video! Document your adventures and watch your journeys come to life on an interactive map.
      </p>
    </div>
  );
}

