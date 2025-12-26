import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Agent, setGlobalDispatcher } from 'undici';

// Configure undici with longer connection timeout for slow APIs
const agent = new Agent({
  connect: {
    timeout: 25000, // 25 second connection timeout
  },
});
setGlobalDispatcher(agent);

// OpenSky API base URL
const OPENSKY_API_BASE = 'https://opensky-network.org/api';

// adsbdb API for flight route data (free, no API key required)
// Reference: https://www.adsbdb.com/
const ADSBDB_API_BASE = 'https://api.adsbdb.com/v0';

// Aircraft category mapping
const AIRCRAFT_CATEGORIES: Record<number, string> = {
  0: 'No info',
  1: 'No ADS-B info',
  2: 'Light (< 15,500 lbs)',
  3: 'Small (15,500-75,000 lbs)',
  4: 'Large (75,000-300,000 lbs)',
  5: 'High Vortex Large (B-757)',
  6: 'Heavy (> 300,000 lbs)',
  7: 'High Performance',
  8: 'Rotorcraft',
  9: 'Glider/Sailplane',
  10: 'Lighter-than-air',
  11: 'Parachutist/Skydiver',
  12: 'Ultralight/Paraglider',
  13: 'Reserved',
  14: 'UAV',
  15: 'Space Vehicle',
  16: 'Emergency Vehicle',
  17: 'Service Vehicle',
  18: 'Point Obstacle',
  19: 'Cluster Obstacle',
  20: 'Line Obstacle',
};

interface OpenSkyState {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  time_position: number | null;
  last_contact: number;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  on_ground: boolean;
  velocity: number | null;
  true_track: number | null;
  vertical_rate: number | null;
  sensors: number[] | null;
  geo_altitude: number | null;
  squawk: string | null;
  spi: boolean;
  position_source: number;
  category: number;
}

interface FlightData {
  icao24: string;
  callsign: string;
  originCountry: string;
  latitude: number;
  longitude: number;
  altitude: number; // in feet
  groundSpeed: number; // in knots
  heading: number;
  verticalRate: number; // in ft/min
  onGround: boolean;
  category: string;
  distanceFromCenter: number; // in miles
  departureAirport: string; // IATA code from adsbdb (e.g., "LAX") - "N/A" if unavailable
  arrivalAirport: string; // IATA code from adsbdb (e.g., "JFK") - "N/A" if unavailable
  aircraftType: string; // Aircraft type/model from adsbdb (e.g., "Boeing 737-800") - "N/A" if unavailable
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate bounding box from center point and radius
function getBoundingBox(lat: number, lon: number, radiusMiles: number): { lamin: number; lamax: number; lomin: number; lomax: number } {
  const latDelta = radiusMiles / 69; // Approximate miles per degree of latitude
  const lonDelta = radiusMiles / (69 * Math.cos(lat * Math.PI / 180)); // Adjust for latitude
  
  return {
    lamin: lat - latDelta,
    lamax: lat + latDelta,
    lomin: lon - lonDelta,
    lomax: lon + lonDelta,
  };
}

// Get Basic Auth header for OpenSky API
// OpenSky uses Basic Authentication (username:password), not OAuth2
function getAuthHeader(): string | null {
  const username = process.env.OPENSKY_USERNAME;
  const password = process.env.OPENSKY_PASSWORD;
  
  if (!username || !password) {
    // Silently fall back to anonymous access (with lower rate limits)
    return null;
  }
  
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${credentials}`;
}

// Parse OpenSky state array into structured object
function parseStateVector(state: any[]): OpenSkyState {
  return {
    icao24: state[0],
    callsign: state[1]?.trim() || null,
    origin_country: state[2],
    time_position: state[3],
    last_contact: state[4],
    longitude: state[5],
    latitude: state[6],
    baro_altitude: state[7],
    on_ground: state[8],
    velocity: state[9],
    true_track: state[10],
    vertical_rate: state[11],
    sensors: state[12],
    geo_altitude: state[13],
    squawk: state[14],
    spi: state[15],
    position_source: state[16],
    category: state[17] || 0,
  };
}

// Fetch route information from adsbdb.com API
// This provides real-time flight route data by callsign (free, no API key required)
// Reference: https://www.adsbdb.com/
async function fetchAircraftRoute(callsign: string): Promise<{ departure?: string; arrival?: string }> {
  // Skip if no valid callsign
  if (!callsign || callsign.trim().length === 0) {
    return {};
  }
  
  try {
    const url = `${ADSBDB_API_BASE}/callsign/${encodeURIComponent(callsign.trim())}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      
      // adsbdb returns { response: { flightroute: { origin: {...}, destination: {...} } } }
      if (data?.response?.flightroute) {
        const route = data.response.flightroute;
        const departure = route.origin?.iata_code || route.origin?.icao_code;
        const arrival = route.destination?.iata_code || route.destination?.icao_code;
        
        if (departure && arrival) {
          return { departure, arrival };
        }
      }
    }
    // 404 or empty response = route not found in database
  } catch (error) {
    // Silently fail - route data is optional
  }
  
  return {};
}

// Fetch aircraft information from adsbdb.com API by ICAO24 hex code
// This provides aircraft type/model information (free, no API key required)
async function fetchAircraftInfo(icao24: string): Promise<{ aircraftType?: string }> {
  if (!icao24 || icao24.trim().length === 0) {
    return {};
  }
  
  try {
    const url = `${ADSBDB_API_BASE}/aircraft/${encodeURIComponent(icao24.trim().toUpperCase())}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      
      // adsbdb returns { response: { aircraft: { type: "...", manufacturer: "...", ... } } }
      if (data?.response?.aircraft) {
        const aircraft = data.response.aircraft;
        // Combine manufacturer and type for a full description, or just type if no manufacturer
        const manufacturer = aircraft.manufacturer || '';
        const type = aircraft.type || '';
        
        if (manufacturer && type) {
          return { aircraftType: `${manufacturer} ${type}` };
        } else if (type) {
          return { aircraftType: type };
        } else if (aircraft.icao_type) {
          // Fallback to ICAO type code if no full type available
          return { aircraftType: aircraft.icao_type };
        }
      }
    }
  } catch (error) {
    // Silently fail - aircraft data is optional
  }
  
  return {};
}

// Convert OpenSky state to our flight data format
function convertToFlightData(state: OpenSkyState, centerLat: number, centerLon: number): FlightData | null {
  if (state.latitude === null || state.longitude === null) {
    return null;
  }
  
  const distance = calculateDistance(centerLat, centerLon, state.latitude, state.longitude);
  
  return {
    icao24: state.icao24,
    callsign: state.callsign || state.icao24.toUpperCase(),
    originCountry: state.origin_country,
    latitude: state.latitude,
    longitude: state.longitude,
    altitude: state.baro_altitude !== null ? Math.round(state.baro_altitude * 3.28084) : 0, // meters to feet
    groundSpeed: state.velocity !== null ? Math.round(state.velocity * 1.94384) : 0, // m/s to knots
    heading: state.true_track !== null ? Math.round(state.true_track) : 0,
    verticalRate: state.vertical_rate !== null ? Math.round(state.vertical_rate * 196.85) : 0, // m/s to ft/min
    onGround: state.on_ground,
    category: AIRCRAFT_CATEGORIES[state.category] || 'Unknown',
    distanceFromCenter: Math.round(distance * 10) / 10, // Round to 1 decimal
    departureAirport: 'N/A', // Will be updated by route fetching if available
    arrivalAirport: 'N/A', // Will be updated by route fetching if available
    aircraftType: 'N/A', // Will be updated by aircraft info fetching if available
  };
}

// Fetch with timeout helper
async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 20000, ...fetchOptions } = options; // Default to 20s for OpenSky
  
  console.log('[DEBUG] fetchWithTimeout starting', JSON.stringify({location:'flights.ts:fetchWithTimeout',timeoutMs:timeout,timestamp:Date.now()}));
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('[DEBUG] fetchWithTimeout abort triggered', JSON.stringify({location:'flights.ts:fetchWithTimeout_abort',timeoutMs:timeout,timestamp:Date.now()}));
    controller.abort();
  }, timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // #region agent log
  const handlerStartTime = Date.now();
  console.log('[DEBUG] Handler started', JSON.stringify({location:'flights.ts:handler_entry',query:req.query,method:req.method,timestamp:handlerStartTime,hypothesisId:'ALL'}));
  // #endregion
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { lat, lon, radius } = req.query;
  
  if (!lat || !lon || !radius) {
    return res.status(400).json({ error: 'Missing required parameters: lat, lon, radius' });
  }
  
  const centerLat = parseFloat(lat as string);
  const centerLon = parseFloat(lon as string);
  const radiusMiles = parseFloat(radius as string);
  
  if (isNaN(centerLat) || isNaN(centerLon) || isNaN(radiusMiles)) {
    return res.status(400).json({ error: 'Invalid parameter values' });
  }
  
  try {
    // Get Basic Auth header (if credentials are configured)
    const authHeader = getAuthHeader();
    
    // Calculate bounding box
    const bbox = getBoundingBox(centerLat, centerLon, radiusMiles);
    
    // Build OpenSky API URL
    const url = new URL(`${OPENSKY_API_BASE}/states/all`);
    url.searchParams.set('lamin', bbox.lamin.toString());
    url.searchParams.set('lamax', bbox.lamax.toString());
    url.searchParams.set('lomin', bbox.lomin.toString());
    url.searchParams.set('lomax', bbox.lomax.toString());
    url.searchParams.set('extended', '1'); // Include aircraft category
    
    // #region agent log
    console.log('[DEBUG] Before OpenSky fetch', JSON.stringify({location:'flights.ts:before_fetch',url:url.toString(),bbox,hasAuth:!!authHeader,centerLat,centerLon,radiusMiles,timestamp:Date.now(),hypothesisId:'E'}));
    // #endregion
    
    // Make request to OpenSky with Basic Auth and timeout
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    let response;
    let retries = 3;
    let lastError;
    let attemptNumber = 0;
    const maxRetries = 3;
    
    // Retry logic for OpenSky API (can be slow/unreliable)
    while (retries > 0) {
      attemptNumber++;
      const attemptStartTime = Date.now();
      // #region agent log
      console.log('[DEBUG] Retry loop iteration', JSON.stringify({location:'flights.ts:retry_loop',attemptNumber,retriesLeft:retries,elapsedSinceHandlerStart:Date.now()-handlerStartTime,timestamp:Date.now(),hypothesisId:'B'}));
      // #endregion
      
      try {
        response = await fetchWithTimeout(url.toString(), { 
          headers,
          timeout: 20000 // 20 second timeout - OpenSky can be slow from Vercel
        });
        // #region agent log
        const attemptDuration = Date.now() - attemptStartTime;
        console.log('[DEBUG] Fetch succeeded', JSON.stringify({location:'flights.ts:fetch_success',attemptNumber,attemptDuration,status:response.status,timestamp:Date.now(),hypothesisId:'A,C'}));
        // #endregion
        break; // Success, exit retry loop
      } catch (error) {
        const attemptDuration = Date.now() - attemptStartTime;
        lastError = error;
        // #region agent log
        console.log('[DEBUG] Fetch failed', JSON.stringify({location:'flights.ts:fetch_error',attemptNumber,attemptDuration,errorName:(error as any)?.name,errorMessage:(error as any)?.message,errorCode:(error as any)?.code,retriesLeft:retries-1,timestamp:Date.now(),hypothesisId:'A,C,D'}));
        // #endregion
        retries--;
        if (retries > 0) {
          // Exponential backoff: 1s, 2s, 4s between retries
          const backoffDelay = 1000 * Math.pow(2, maxRetries - retries - 1);
          console.log('[DEBUG] Retrying after backoff', JSON.stringify({location:'flights.ts:retry_backoff',backoffMs:backoffDelay,retriesRemaining:retries,timestamp:Date.now()}));
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }
    
    if (!response) {
      // #region agent log
      console.log('[DEBUG] All retries exhausted', JSON.stringify({location:'flights.ts:all_retries_failed',totalAttempts:attemptNumber,totalElapsed:Date.now()-handlerStartTime,lastErrorName:(lastError as any)?.name,lastErrorMessage:(lastError as any)?.message,lastErrorCode:(lastError as any)?.code,timestamp:Date.now(),hypothesisId:'A,D'}));
      // #endregion
      console.error('OpenSky API timeout after retries:', lastError);
      res.setHeader('Retry-After', '30');
      return res.status(503).json({ 
        error: 'Flight data service temporarily unavailable',
        details: 'Unable to connect to OpenSky Network API. This may be due to network issues or API downtime. Please try again in a moment.',
        code: 'OPENSKY_TIMEOUT',
        retryAfter: 30,
        timestamp: new Date().toISOString()
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('OpenSky API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Failed to fetch flight data',
        details: response.status === 401 ? 'Authentication failed' : errorText
      });
    }
    
    const data = await response.json();
    
    // Parse and filter flights
    const flights: FlightData[] = [];
    
    if (data.states && Array.isArray(data.states)) {
      for (const state of data.states) {
        const parsedState = parseStateVector(state);
        const flightData = convertToFlightData(parsedState, centerLat, centerLon);
        
        if (flightData && flightData.distanceFromCenter <= radiusMiles) {
          flights.push(flightData);
        }
      }
    }
    
    // Sort by distance
    flights.sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);
    
    // Fetch route and aircraft information from adsbdb for closest flights only
    // Limit to 30 flights to prevent timeout (2 API calls per flight = 60 max requests)
    // adsbdb rate limit: 60 requests per 60 seconds
    const flightsToEnrich = flights.slice(0, 30);
    const enrichmentTimeout = 5000; // 5 seconds max for enrichment (OpenSky uses 20s, total ~25s)
    
    const enrichmentPromise = Promise.allSettled(
      flightsToEnrich.map(async (flight) => {
        // Fetch route and aircraft info in parallel for each flight
        const [route, aircraftInfo] = await Promise.all([
          fetchAircraftRoute(flight.callsign),
          fetchAircraftInfo(flight.icao24),
        ]);
        
        // Update route fields if data available, otherwise keep "N/A"
        if (route.departure) flight.departureAirport = route.departure;
        if (route.arrival) flight.arrivalAirport = route.arrival;
        if (aircraftInfo.aircraftType) flight.aircraftType = aircraftInfo.aircraftType;
      })
    );
    
    // Race between enrichment and timeout to prevent function timeout
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), enrichmentTimeout);
    });
    
    await Promise.race([enrichmentPromise, timeoutPromise]);
    
    return res.status(200).json({
      timestamp: data.time || Date.now() / 1000,
      count: flights.length,
      flights,
    });
    
  } catch (error) {
    console.error('Error fetching flight data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

