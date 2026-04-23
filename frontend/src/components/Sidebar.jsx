import React from 'react';
import SongCard from './SongCard';

const Sidebar = ({ songs, selectedSong, onSelectSong, isOpen, selectedRegion }) => {
  const groupedSongs = selectedRegion === 'ALL'
    ? songs.reduce((groups, song) => {
        const region = song.region;
        if (!groups[region]) groups[region] = [];
        groups[region].push(song);
        return groups;
      }, {})
    : { ['']: songs };

  const isEmpty = songs.length === 0;

  return (
    <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`} id="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <span className="live-dot" />
          Now Trending
        </div>
        <div className="sidebar-subtitle">
          {songs.length} {songs.length === 1 ? 'region' : 'regions'} · YouTube Music Charts
        </div>
      </div>

      <div className="sidebar-songs" id="song-list">
        {isEmpty && (
          <div className="sidebar-empty">
            <div className="sidebar-empty-icon">🔇</div>
            <div>No data available</div>
          </div>
        )}

        {Object.entries(groupedSongs).map(([region, regionSongs]) => (
          <div key={region || 'single'}>
            {region && selectedRegion === 'ALL' && (
              <div className="region-group-label">{region}</div>
            )}
            {regionSongs.map((song, index) => (
              <SongCard
                key={song.id}
                song={song}
                selected={selectedSong === song.id}
                onClick={() => onSelectSong(song.id)}
                delay={index * 60 + 150}
              />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
