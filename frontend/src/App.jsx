import React, { lazy, Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoadingScreen from './components/LoadingScreen';

const MapView = lazy(() => import('./components/MapView'));

function App() {
  const [trendingData, setTrendingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedSong, setSelectedSong] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapTheme, setMapTheme] = useState('dark');
  const [showTopThree, setShowTopThree] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/trending');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setTrendingData(data.filter(item => !item.error));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch trending data. In local development, make sure the backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const regionFilteredData = useMemo(() => (
    selectedRegion === 'ALL'
      ? trendingData
      : trendingData.filter(item => (item.regionCode || item.id) === selectedRegion)
  ), [selectedRegion, trendingData]);

  const filteredData = useMemo(() => (
    showTopThree
      ? regionFilteredData
      : regionFilteredData.filter(item => !item.rank || item.rank === 1)
  ), [regionFilteredData, showTopThree]);

  useEffect(() => {
    if (selectedSong && !filteredData.some(item => item.id === selectedSong)) {
      setSelectedSong(null);
    }
  }, [filteredData, selectedSong]);

 
  const regions = useMemo(() => (
    Array.from(
      new Map(
        trendingData.map(item => [(item.regionCode || item.id), { id: (item.regionCode || item.id), name: item.region }])
      ).values()
    )
  ), [trendingData]);

  const handleSelectSong = useCallback((songId) => {
    setSelectedSong(prev => prev === songId ? null : songId);
  }, []);

  return (
    <div className="app-shell">
      <Header
        selectedRegion={selectedRegion}
        onRegionChange={setSelectedRegion}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        regions={regions}
        mapTheme={mapTheme}
        onToggleMapTheme={() => setMapTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
        showTopThree={showTopThree}
        onToggleTopThree={() => setShowTopThree(prev => !prev)}
      />

      {error && (
        <div className="error-overlay" id="error-overlay">
          <div className="error-icon">📡</div>
          <div className="error-title">Signal Lost</div>
          <div className="error-message">{error}</div>
          <button className="error-retry" onClick={fetchData} id="btn-retry">
            Retry Connection
          </button>
        </div>
      )}

      <div className="app-body">
        <Sidebar
          songs={filteredData}
          selectedSong={selectedSong}
          onSelectSong={handleSelectSong}
          isOpen={sidebarOpen}
          selectedRegion={selectedRegion}
        />
        <Suspense fallback={<LoadingScreen visible />}>
          <MapView
            songs={filteredData}
            selectedSong={selectedSong}
            onSelectSong={handleSelectSong}
            mapTheme={mapTheme}
          />
        </Suspense>
      </div>

      <LoadingScreen visible={loading} />
    </div>
  );
}

export default App;
