import { FlightResponse } from '../types';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

export async function fetchFlights(
  lat: number,
  lon: number,
  radius: number
): Promise<FlightResponse> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius: radius.toString(),
  });

  const response = await fetch(`${API_BASE}/api/flights?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Helper to format altitude
export function formatAltitude(feet: number): string {
  if (feet === 0) return 'Ground';
  if (feet < 1000) return `${feet} ft`;
  return `${(feet / 1000).toFixed(1)}k ft`;
}

// Helper to format speed
export function formatSpeed(knots: number): string {
  return `${knots} kts`;
}

// Helper to format heading
export function formatHeading(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return `${degrees}° ${directions[index]}`;
}

// Helper to format vertical rate
export function formatVerticalRate(ftPerMin: number): string {
  if (ftPerMin === 0) return 'Level';
  if (ftPerMin > 0) return `↑ ${ftPerMin} ft/min`;
  return `↓ ${Math.abs(ftPerMin)} ft/min`;
}

// Helper to format distance
export function formatDistance(miles: number): string {
  if (miles < 1) return `${(miles * 5280).toFixed(0)} ft`;
  return `${miles.toFixed(1)} mi`;
}

