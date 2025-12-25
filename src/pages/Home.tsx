import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import VideoCard from '../components/VideoCard';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Video } from '../types';

export default function Home() {
  const [videos] = useLocalStorage<Video[]>('travelr-videos', []);

  const handleCreateVideo = () => {
    // Placeholder - will be implemented later
    console.log('Create video clicked');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Document your travel
            </h1>
            <p className="text-lg text-muted max-w-2xl mx-auto mb-8">
              Create interactive map animations that document your year in travel. Free and open source.
            </p>

            {/* Create Video Button */}
            <button
              onClick={handleCreateVideo}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Video
            </button>
          </div>
        </section>

        {/* Videos Section */}
        <section className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6 text-center">Your Videos</h2>

            {videos.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

