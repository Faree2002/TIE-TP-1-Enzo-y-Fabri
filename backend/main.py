from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic
from threading import Lock, Thread
from time import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

yt = YTMusic()

CACHE_TTL_SECONDS = 300
_cache_lock = Lock()
_trending_cache = {
    "timestamp": 0.0,
    "data": None,
}

REGIONS = {
    "AR": {"name": "Argentina", "lat": -38.4161, "lng": -63.6167},
    "US": {"name": "USA", "lat": 37.0902, "lng": -95.7129},
    "ZZ": {"name": "Global", "lat": 0.0, "lng": -30.0},
    "BR": {"name": "Brasil", "lat": -14.2350, "lng": -51.9253},
    "CA": {"name": "Canada", "lat": 56.1304, "lng": -106.3468},
    "AU": {"name": "Australia", "lat": -25.2744, "lng": 133.7751},
    "ES": {"name": "Espana", "lat": 40.4637, "lng": -3.7492},
    "MX": {"name": "México", "lat": 23.6345, "lng": -102.5528},
    "GB": {"name": "UK", "lat": 55.3781, "lng": -3.4360},
    "JP": {"name": "Japan", "lat": 36.2048, "lng": 138.2529},
    "KR": {"name": "South Korea", "lat": 35.9078, "lng": 127.7669},
    "DE": {"name": "Germany", "lat": 51.1657, "lng": 10.4515},
    "FR": {"name": "France", "lat": 46.6034, "lng": 1.8883},
}


def _normalize_artist(top_song):
    artist_list = [a.get("name", "").strip() for a in top_song.get("artists", []) if a.get("name")]
    non_generic = [
        name for name in artist_list
        if name.lower() not in {"various artists", "varios artistas", "unknown artist"}
    ]

    if non_generic:
        return non_generic[0]
    if artist_list:
        return artist_list[0]

    title = (top_song.get("title") or "").strip()
    if " - " in title:
        return title.split(" - ", 1)[0].strip()

    return "Unknown Artist"


def _extract_top_tracks(charts, region_name):
    top_songs = []

    if "songs" in charts and isinstance(charts["songs"], dict):
        items = charts["songs"].get("items", [])
        if items:
            return items[:3]

    videos = charts.get("videos", []) if isinstance(charts.get("videos"), list) else []
    if not videos:
        return top_songs

    region_tokens = {region_name.lower(), region_name.replace(" ", "").lower()}
    playlist_candidates = []
    for idx, video in enumerate(videos):
        title = (video.get("title") or "").lower()
        score = 0
        if any(token and token in title for token in region_tokens):
            score += 4
        if "trending" in title:
            score += 3
        if "top" in title:
            score += 2
        if "coachella" in title:
            score -= 3
        playlist_candidates.append((score, idx, video.get("playlistId")))

    for _, _, playlist_id in sorted(playlist_candidates, key=lambda item: (-item[0], item[1])):
        if not playlist_id:
            continue
        try:
            playlist = yt.get_playlist(playlist_id)
            tracks = playlist.get("tracks", [])
            if tracks:
                return tracks[:3]
        except Exception:
            continue

    return top_songs


def _build_trending_results():
    results = []

    for code, info in REGIONS.items():
        try:
            country_code = 'ZZ' if code == 'ZZ' else code
            charts = yt.get_charts(country=country_code)

            top_songs = _extract_top_tracks(charts, info["name"])

            if not top_songs and "videos" in charts and len(charts["videos"]) > 0:
                fallback_songs = []
                for vid in charts["videos"][:3]:
                    fallback_songs.append({
                        "title": vid.get("title", "Popular Music"),
                        "artists": vid.get("artists", []) or [{"name": "Unknown Artist"}],
                        "thumbnails": vid.get("thumbnails", []),
                        "videoId": vid.get("videoId", "")
                    })
                top_songs = fallback_songs
            elif not top_songs and "artists" in charts and len(charts["artists"]) > 0:
                art = charts["artists"][0]
                top_songs = [{
                    "title": "Top Artist: " + art.get("title", "Unknown"),
                    "artists": [{"name": art.get("title", "")}],
                    "thumbnails": art.get("thumbnails", []),
                    "videoId": ""
                }]

            for index, top_song in enumerate(top_songs[:3]):
                title = top_song.get("title", 'Unknown Title')
                artists = _normalize_artist(top_song)

                thumbnail = ""
                if top_song.get("thumbnails"):
                    thumbnail = top_song["thumbnails"][-1].get("url", "")

                rank = index + 1
                lng_offset = (index - 1) * 0.6

                results.append({
                    "id": f"{code}-{rank}",
                    "regionCode": code,
                    "region": info["name"],
                    "rank": rank,
                    "lat": info["lat"],
                    "lng": info["lng"] + lng_offset,
                    "song": {
                        "title": title,
                        "artist": artists,
                        "thumbnail": thumbnail,
                        "videoId": top_song.get("videoId", "")
                    }
                })
        except Exception as e:
            results.append({"error": str(e), "code": code})

    return results


def _refresh_trending_cache(force=False):
    now = time()
    with _cache_lock:
        cached_data = _trending_cache["data"]
        cached_timestamp = _trending_cache["timestamp"]
        if not force and cached_data is not None and (now - cached_timestamp) < CACHE_TTL_SECONDS:
            return cached_data

    fresh_results = _build_trending_results()

    with _cache_lock:
        _trending_cache["data"] = fresh_results
        _trending_cache["timestamp"] = time()

    return fresh_results


@app.on_event("startup")
def warm_trending_cache():
    Thread(target=_refresh_trending_cache, kwargs={"force": True}, daemon=True).start()

@app.get("/api/trending")
def get_trending_songs():
    now = time()
    with _cache_lock:
        cached_data = _trending_cache["data"]
        cached_timestamp = _trending_cache["timestamp"]

    if cached_data is not None and (now - cached_timestamp) < CACHE_TTL_SECONDS:
        return cached_data

    return _refresh_trending_cache()

@app.get("/")
def root():
    return {"message": "Welcome to the YT Music Map API! Hit /api/trending to get chart info."}
