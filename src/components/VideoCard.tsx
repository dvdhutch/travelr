import { Video } from '../types';

interface VideoCardProps {
  video: Video;
}

export default function VideoCard({ video }: VideoCardProps) {
  const formattedDate = new Date(video.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="group bg-card border border-theme rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer">
      {/* Thumbnail */}
      <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl opacity-50">🎬</span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold truncate group-hover:text-primary-600 transition-colors">
          {video.title}
        </h3>
        <p className="text-sm text-muted mt-1">{formattedDate}</p>
      </div>
    </div>
  );
}

