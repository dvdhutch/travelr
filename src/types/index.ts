export type ThemeMode = 'light' | 'dark' | 'auto';

export interface Video {
  id: string;
  title: string;
  createdAt: string;
  thumbnail?: string;
}

export interface Flight {
  icao24: string;
  callsign: string;
  originCountry: string;
  latitude: number;
  longitude: number;
  altitude: number; // in feet
  groundSpeed: number; // in knots
  heading: number; // in degrees
  verticalRate: number; // in ft/min
  onGround: boolean;
  category: string;
  distanceFromCenter: number; // in miles
  departureAirport: string; // IATA code from adsbdb (e.g., "LAX") - "N/A" if unavailable
  arrivalAirport: string; // IATA code from adsbdb (e.g., "JFK") - "N/A" if unavailable
  aircraftType: string; // Aircraft type/model from adsbdb (e.g., "Boeing 737-800") - "N/A" if unavailable
}

export interface FlightResponse {
  timestamp: number;
  count: number;
  flights: Flight[];
}

