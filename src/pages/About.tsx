import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-8">
            About
          </h1>
          
          <div className="text-lg text-muted space-y-4 bg-card rounded-xl border border-theme p-6 sm:p-8">
            <p>
              travelr is a interactive map animator. It visualizes your travels on a map and creates a sharable video. travelr is free and open source. If you'd like to contribute, consider doing so{' '}
              <a 
                href="https://github.com/dvdhutch/travelr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline transition-colors"
              >
                here
              </a>
              !
            </p>
            
            <p>
              Created by{' '}
              <a 
                href="https://www.dhutch.fyi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline transition-colors"
              >
                dvdhutch
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

