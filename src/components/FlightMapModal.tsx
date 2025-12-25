import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Flight } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  formatAltitude,
  formatSpeed,
  formatHeading,
  formatVerticalRate,
  formatDistance,
} from '../services/flightService';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = MAPBOX_TOKEN;

interface FlightMapModalProps {
  flight: Flight;
  isOpen: boolean;
  onClose: () => void;
}

export default function FlightMapModal({ flight, isOpen, onClose }: FlightMapModalProps) {
  const { resolvedTheme } = useTheme();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map when modal opens
  useEffect(() => {
    if (!isOpen || !mapContainer.current) return;

    const mapStyle = resolvedTheme === 'dark' 
      ? 'mapbox://styles/mapbox/dark-v11' 
      : 'mapbox://styles/mapbox/light-v11';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [flight.longitude, flight.latitude],
      zoom: 7, // Good zoom for seeing regional context
      pitch: 0,
      bearing: 0,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Add plane marker
    const el = document.createElement('div');
    el.className = 'plane-marker';
    el.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style="transform: rotate(${flight.heading}deg); color: #cb4639; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
    `;

    markerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([flight.longitude, flight.latitude])
      .addTo(map.current);

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapLoaded(false);
    };
  }, [isOpen, flight.longitude, flight.latitude, flight.heading, resolvedTheme, onClose]);

  // Update map style when theme changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapStyle = resolvedTheme === 'dark' 
      ? 'mapbox://styles/mapbox/dark-v11' 
      : 'mapbox://styles/mapbox/light-v11';

    map.current.setStyle(mapStyle);
  }, [resolvedTheme, mapLoaded]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Top Overlay */}
      <div className="relative z-10 bg-gradient-to-b from-black/80 via-black/60 to-transparent px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
                {flight.callsign}
              </h2>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                  flight.onGround
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {flight.onGround ? 'On Ground' : 'In Flight'}
              </span>
            </div>
            <p className="text-white/70 text-sm mt-1">
              {flight.originCountry}
              {flight.aircraftType !== 'N/A' && (
                <span className="ml-2 text-white/50">•</span>
              )}
              {flight.aircraftType !== 'N/A' && (
                <span className="ml-2">{flight.aircraftType}</span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-lg font-semibold text-white">
                {flight.departureAirport !== 'N/A' ? flight.departureAirport : '???'}
              </span>
              <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <span className="text-lg font-semibold text-white">
                {flight.arrivalAirport !== 'N/A' ? flight.arrivalAirport : '???'}
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close map"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative z-0 flex items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-4xl h-full relative">
          <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />
          
          {/* Loading indicator */}
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Overlay */}
      <div className="relative z-10 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              label="Altitude"
              value={formatAltitude(flight.altitude)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              }
            />
            <StatCard
              label="Speed"
              value={formatSpeed(flight.groundSpeed)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <StatCard
              label="Heading"
              value={formatHeading(flight.heading)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              }
            />
            <StatCard
              label="Vertical"
              value={formatVerticalRate(flight.verticalRate)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              }
              highlight={flight.verticalRate !== 0}
              positive={flight.verticalRate > 0}
            />
          </div>
          
          {/* Additional info row */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4 pt-4 border-t border-white/10 flex-wrap">
            <div className="text-center">
              <p className="text-xs text-white/50 uppercase tracking-wider">Distance</p>
              <p className="text-sm font-medium text-white">{formatDistance(flight.distanceFromCenter)}</p>
            </div>
            <div className="w-px h-6 bg-white/20 hidden sm:block" />
            <div className="text-center">
              <p className="text-xs text-white/50 uppercase tracking-wider">Aircraft</p>
              <p className="text-sm font-medium text-white max-w-[150px] truncate" title={flight.aircraftType}>
                {flight.aircraftType}
              </p>
            </div>
            <div className="w-px h-6 bg-white/20 hidden sm:block" />
            <div className="text-center">
              <p className="text-xs text-white/50 uppercase tracking-wider">ICAO</p>
              <p className="text-sm font-mono font-medium text-white">{flight.icao24.toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight = false,
  positive = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-lg px-3 py-2 sm:px-4 sm:py-3 border border-white/10">
      <div className="flex items-center gap-2 text-white/60 mb-1">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p
        className={`text-lg sm:text-xl font-bold ${
          highlight ? (positive ? 'text-emerald-400' : 'text-red-400') : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

