import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Home from './pages/Home'
import About from './pages/About'
import Flights from './pages/Flights'
import FlightResults from './pages/FlightResults'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/flights" element={<Flights />} />
          <Route path="/flights/results" element={<FlightResults />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

