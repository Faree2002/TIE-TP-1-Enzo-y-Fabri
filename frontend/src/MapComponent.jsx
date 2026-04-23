import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const highlightedIcon = new L.Icon({
  ...L.Icon.Default.prototype.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
});

const MapComponent = () => {
  const [trendingData, setTrendingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrendingSongs = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/trending');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setTrendingData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch trending data from the server. Is the Python backend running?');
        setLoading(false);
      }
    };

    fetchTrendingSongs();
  }, []);

  const center = [20, -40];

  return (
    <>
      {loading && (
        <div className="loading-overlay">
          <span>Fetching global charts from YouTube Music...</span>
        </div>
      )}
      
      {error && (
        <div className="loading-overlay" style={{ background: 'rgba(239, 68, 68, 0.9)' }}>
          <span>{error}</span>
        </div>
      )}

      {!error && (
        <MapContainer center={center} zoom={3} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Map tiles by CartoDB'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {trendingData.map((item) => (
            <Marker key={item.id} position={[item.lat, item.lng]} icon={highlightedIcon}>
              <Popup>
                <div className="song-popup">
                  <div style={{fontWeight: 800, fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase'}}>{item.region} #1</div>
                  {item.song.thumbnail && (
                    <img src={item.song.thumbnail} alt={item.song.title} className="song-thumbnail" />
                  )}
                  <div className="song-info">
                    <h3>{item.song.title}</h3>
                    <p>{item.song.artist}</p>
                  </div>
                  {item.song.videoId && (
                    <a href={`https://music.youtube.com/watch?v=${item.song.videoId}`} target="_blank" rel="noopener noreferrer" className="yt-link">
                      Listen on YT Music
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </>
  );
};

export default MapComponent;
