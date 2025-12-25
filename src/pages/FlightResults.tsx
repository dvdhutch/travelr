import { useSearchParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FlightCard from '../components/FlightCard';
import { Flight } from '../types';
import { fetchFlights } from '../services/flightService';

export default function FlightResults() {
  const [searchParams] = useSearchParams();
  const address = searchParams.get('address') || '';
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lon = parseFloat(searchParams.get('lon') || '0');
  const radius = searchParams.get('radius') || '50';

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    async function loadFlights() {
      if (!lat || !lon) {
        setError('Invalid coordinates');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchFlights(lat, lon, parseFloat(radius));
        setFlights(data.flights);
        setLastUpdated(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch flight data');
      } finally {
        setLoading(false);
      }
    }

    loadFlights();

    // Refresh every 30 seconds
    const interval = setInterval(loadFlights, 30000);
    return () => clearInterval(interval);
  }, [lat, lon, radius]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Flight Results
            </h1>
            <p className="text-lg text-muted">
              Tracking flights within <span className="font-semibold">{radius} mi</span> of:
            </p>
            <p className="text-lg font-medium mt-1">{address}</p>
            {lastUpdated && (
              <p className="text-sm text-muted mt-2">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Back button */}
          <div className="mb-6">
            <Link
              to="/flights"
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to search
            </Link>
          </div>

          {/* Loading state */}
          {loading && flights.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
              <p className="mt-4 text-muted">Searching for aircraft...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* No flights found */}
          {!loading && !error && flights.length === 0 && (
            <div className="text-center py-12 bg-card rounded-xl border border-theme">
              <svg className="w-16 h-16 mx-auto text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <p className="text-xl font-medium">No aircraft found</p>
              <p className="text-muted mt-2">Try increasing the search radius or searching a different location.</p>
            </div>
          )}

          {/* Flight cards */}
          {flights.length > 0 && (
            <>
              <p className="text-muted mb-4">
                Found <span className="font-semibold text-inherit">{flights.length}</span> aircraft
                {loading && <span className="ml-2 text-sm">(refreshing...)</span>}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {flights.map((flight) => (
                  <FlightCard key={flight.icao24} flight={flight} />
                ))}
              </div>
            </>
          )}

          {/* Attribution */}
          <div className="mt-12 text-center text-sm text-muted border-t border-theme pt-6">
            <p>
              Data provided by{' '}
              <span className="relative inline-block">
                <a
                  href="https://opensky-network.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 underline transition-colors"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  The OpenSky Network
                </a>
                {showTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 max-w-[calc(100vw-2rem)] z-50">
                    <div className="relative bg-card border border-theme rounded-lg shadow-lg p-4 text-left text-xs">
                      <p className="text-inherit leading-relaxed">
                        Matthias Schäfer, Martin Strohmeier, Vincent Lenders, Ivan Martinovic and Matthias Wilhelm.
                        <br />
                        "Bringing Up OpenSky: A Large-scale ADS-B Sensor Network for Research".
                        <br />
                        In Proceedings of the 13th IEEE/ACM International Symposium on Information Processing in Sensor Networks (IPSN), pages 83-94, April 2014.
                      </p>
                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                        <div 
                          className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent"
                          style={{ borderTopColor: 'var(--color-border)' }}
                        ></div>
                        <div 
                          className="absolute top-0 left-1/2 -translate-x-1/2 -mt-[5px] w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent"
                          style={{ borderTopColor: 'var(--color-card)' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </span>
              {' '}and{' '}
              <a
                href="https://www.adsbdb.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline transition-colors"
              >
                adsbdb.com
              </a>
              .
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
