import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AddressAutofill } from '@mapbox/search-js-react';
import { useTheme } from '../context/ThemeContext';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function Flights() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [radius, setRadius] = useState(50);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRetrieve = (res: any) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d970966d-051d-4676-9075-573088c1a8c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Flights.tsx:16',message:'handleRetrieve called',data:{hasRes:!!res,hasFeatures:!!(res?.features),featuresLength:res?.features?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    if (res && res.features && res.features.length > 0) {
      const selectedFeature = res.features[0];
      const props = selectedFeature.properties || {};
      
      // Extract address from multiple possible properties (in order of preference)
      const placeName = 
        props.full_address || 
        props.place_name || 
        selectedFeature.text_en || 
        selectedFeature.text ||
        (props.address_line1 ? [props.address_line1, props.address_line2, props.address_line3].filter(Boolean).join(', ') : '') ||
        props.feature_name ||
        '';
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d970966d-051d-4676-9075-573088c1a8c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Flights.tsx:25',message:'placeName extracted',data:{placeName,fullAddress:props.full_address,placeNameProp:props.place_name,textEn:selectedFeature.text_en},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      // Always update address with the extracted placeName (even if empty, to clear it)
      setAddress(placeName);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d970966d-051d-4676-9075-573088c1a8c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Flights.tsx:30',message:'setAddress called',data:{placeName},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      // Extract coordinates from the feature
      if (selectedFeature.geometry && selectedFeature.geometry.coordinates) {
        const [lon, lat] = selectedFeature.geometry.coordinates;
        setCoordinates({ lat, lon });
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d970966d-051d-4676-9075-573088c1a8c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Flights.tsx:35',message:'coordinates set',data:{lat,lon},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
      }
      
      // Also ensure the input element is updated
      if (inputRef.current) {
        inputRef.current.value = placeName;
      }
    }
  };

  // Also listen for the retrieve event on the input element as a fallback
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleRetrieveEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        handleRetrieve(customEvent.detail);
      } else {
        // Fallback: read from input value after a short delay
        setTimeout(() => {
          if (inputRef.current) {
            const currentValue = inputRef.current.value;
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/d970966d-051d-4676-9075-573088c1a8c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Flights.tsx:46',message:'setTimeout fallback',data:{currentValue,currentValueType:typeof currentValue,hasValue:!!currentValue},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            if (currentValue) {
              setAddress(currentValue);
            }
          }
        }, 100);
      }
    };

    // Listen for the retrieve event
    input.addEventListener('retrieve', handleRetrieveEvent);
    
    return () => {
      input.removeEventListener('retrieve', handleRetrieveEvent);
    };
  }, []);

  const handleSubmit = () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d970966d-051d-4676-9075-573088c1a8c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Flights.tsx:65',message:'handleSubmit called',data:{address,addressType:typeof address,hasCoordinates:!!coordinates},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    if (!address?.trim() || !coordinates) return;
    const params = new URLSearchParams({
      address: address,
      lat: coordinates.lat.toString(),
      lon: coordinates.lon.toString(),
      radius: radius.toString(),
    });
    navigate(`/flights/results?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-8">
            Flights
          </h1>

          <div className="text-lg text-muted space-y-4 bg-card rounded-xl border border-theme p-6 sm:p-8">
            <p>
              Track flights near any location. Enter an address and set a radius to discover aircraft flying overhead in real-time.
            </p>

            {/* Address Input */}
            <div className="space-y-2 text-left">
              <label htmlFor="address" className="block text-sm font-medium pt-[13px] pb-[13px]">
                Location
              </label>
              <AddressAutofill accessToken={MAPBOX_TOKEN} onRetrieve={handleRetrieve}>
                <input
                  ref={inputRef}
                  id="address"
                  type="text"
                  autoComplete="street-address"
                  placeholder="Enter an address..."
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    // Clear coordinates when user types manually
                    setCoordinates(null);
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-theme bg-card text-inherit placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                />
              </AddressAutofill>
              {address && !coordinates && (
                <p className="text-xs text-amber-600">Please select an address from the dropdown to get coordinates</p>
              )}
            </div>

            {/* Radius Slider */}
            <div className="space-y-2 text-left">
              <label htmlFor="radius" className="block text-sm font-medium pt-[13px] pb-[13px]">
                Radius: <span className="font-semibold">{radius} mi</span>
              </label>
              <input
                id="radius"
                type="range"
                min={5}
                max={100}
                step={5}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #cb4639 0%, #cb4639 ${((radius - 5) / 95) * 100}%, ${resolvedTheme === 'dark' ? '#000000' : '#ffffff'} ${((radius - 5) / 95) * 100}%, ${resolvedTheme === 'dark' ? '#000000' : '#ffffff'} 100%)`,
                }}
              />
              <style>{`
                #radius::-webkit-slider-thumb {
                  appearance: none;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #ffffff;
                  cursor: pointer;
                  border: 2px solid #cb4639;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                #radius::-moz-range-thumb {
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #ffffff;
                  cursor: pointer;
                  border: 2px solid #cb4639;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
              `}</style>
              <div className="flex justify-between text-xs text-muted">
                <span>5 mi</span>
                <span>100 mi</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={(() => {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/d970966d-051d-4676-9075-573088c1a8c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Flights.tsx:144',message:'disabled prop evaluation',data:{address,addressType:typeof address,isNull:address===null,isUndefined:address===undefined,hasCoordinates:!!coordinates},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,B,D'})}).catch(()=>{});
                // #endregion
                return !(address || '').trim() || !coordinates;
              })()}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:transform-none"
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Track Flights
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
