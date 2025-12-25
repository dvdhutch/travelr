import { useState } from 'react';
import { Flight } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  formatAltitude,
  formatSpeed,
  formatHeading,
  formatVerticalRate,
  formatDistance,
} from '../services/flightService';
import FlightMapModal from './FlightMapModal';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface FlightCardProps {
  flight: Flight;
}

export default function FlightCard({ flight }: FlightCardProps) {
  const { resolvedTheme } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Generate static map URL for background
  // Zoom level 6 gives approximately 400km view
  const mapStyle = resolvedTheme === 'dark' ? 'dark-v11' : 'light-v11';
  const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/static/${flight.longitude},${flight.latitude},6,0/400x350@2x?access_token=${MAPBOX_TOKEN}`;

  return (
    <>
      <div
        className="relative bg-card rounded-xl border border-theme overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
        onClick={() => setIsModalOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsModalOpen(true);
          }
        }}
      >
        {/* Top section with map background */}
        <div className="relative">
          {/* Static Map Background */}
          <div
            className={`absolute inset-0 bg-cover bg-center transition-opacity ${
              resolvedTheme === 'dark'
                ? 'opacity-20 group-hover:opacity-30'
                : 'opacity-40 group-hover:opacity-50'
            }`}
            style={{ backgroundImage: `url(${staticMapUrl})` }}
          />

          {/* Plane Icon Overlay on Map */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg
              className="w-8 h-8 text-primary-600 opacity-40 group-hover:opacity-60 transition-opacity drop-shadow-lg"
              style={{ transform: `rotate(${flight.heading}deg)` }}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>

          {/* Card Content */}
          <div className="relative z-10 p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold tracking-wide">{flight.callsign}</h3>
                <p className="text-sm text-muted">{flight.originCountry}</p>
                <p
                  className={`text-sm font-semibold mt-1 ${
                    flight.departureAirport !== 'N/A' && flight.arrivalAirport !== 'N/A'
                      ? 'text-primary-600'
                      : 'text-muted'
                  }`}
                >
                  {flight.departureAirport} → {flight.arrivalAirport}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    flight.onGround
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  }`}
                >
                  {flight.onGround ? 'On Ground' : 'In Flight'}
                </span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatItem
                label="Distance"
                value={formatDistance(flight.distanceFromCenter)}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                }
              />
              <StatItem
                label="Altitude"
                value={formatAltitude(flight.altitude)}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                }
              />
              <StatItem
                label="Speed"
                value={formatSpeed(flight.groundSpeed)}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                }
              />
              <StatItem
                label="Heading"
                value={formatHeading(flight.heading)}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                }
              />
            </div>
          </div>
        </div>

        {/* Additional info - outside map background */}
        <div className="px-5 pb-5 border-t border-theme">
          <div className="flex items-center justify-between text-sm pt-4">
            <span className="text-muted">Vertical</span>
            <span
              className={
                flight.verticalRate > 0
                  ? 'text-green-600'
                  : flight.verticalRate < 0
                  ? 'text-red-500'
                  : 'text-muted'
              }
            >
              {formatVerticalRate(flight.verticalRate)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted">Aircraft</span>
            <span className="text-right truncate max-w-[180px]" title={flight.aircraftType}>
              {flight.aircraftType}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted">ICAO</span>
            <span className="font-mono text-xs">{flight.icao24.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Full-screen Map Modal */}
      <FlightMapModal
        flight={flight}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

function StatItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted">{icon}</div>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

