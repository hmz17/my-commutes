const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Live Reload ---
const publicDir = path.join(__dirname, 'public');
let lastChangeTs = Date.now();

// Watch public/ for file changes; update timestamp so clients know to reload
fs.watch(publicDir, { recursive: true }, () => { lastChangeTs = Date.now(); });

app.get('/api/livereload', (req, res) => {
  res.json({ ts: lastChangeTs });
});

app.use(express.static(publicDir));
app.use(express.json());

// API endpoint that returns config (keeps the API key server-side for the directions call)
app.get('/api/config', (req, res) => {
  const destinations = (process.env.DESTINATIONS || '').split(';').map(d => {
    const parts = d.split('|');
    if (parts.length < 2) return null;
    return {
      label: parts[0].trim(),
      address: parts[1].trim(),
      mode: (parts[2] || 'driving').trim()
    };
  }).filter(Boolean);

  res.json({
    homeAddress: process.env.HOME_ADDRESS,
    destinations,
    apiKey: process.env.GOOGLE_MAPS_API_KEY
  });
});

// Cache: stores responses for 3 minutes to avoid redundant API calls
const cache = {};
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

function getCached(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.time < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache[key] = { data, time: Date.now() };
}

// Proxy directions requests to keep API key server-side
app.get('/api/directions', async (req, res) => {
  const { origin, destination, mode } = req.query;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }

  const travelMode = mode || 'driving';
  const cacheKey = `${origin}|${destination}|${travelMode}`;

  // Return cached response if fresh
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${travelMode}&key=${apiKey}`;

  // Only add departure_time and traffic_model for driving mode
  if (travelMode === 'driving') {
    url += '&departure_time=now&traffic_model=best_guess';
  } else if (travelMode === 'transit') {
    url += '&departure_time=now';
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK') {
      setCache(cacheKey, data);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch directions', details: err.message });
  }
});

// --- Transit App API proxy (keeps API key server-side) ---
const TRANSIT_API_BASE = 'https://external.transitapp.com';
const TRANSIT_CACHE_TTL = 30 * 1000; // 30s cache for real-time data

app.get('/api/transit/departures', async (req, res) => {
  const apiKey = process.env.TRANSIT_APP_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Transit App API key not configured' });

  const { stop_ids, max_departures } = req.query;
  if (!stop_ids) return res.status(400).json({ error: 'stop_ids required' });

  const cacheKey = `transit_dep_${stop_ids}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const url = `${TRANSIT_API_BASE}/v4/public/stop_departures?global_stop_ids=${encodeURIComponent(stop_ids)}&should_update_realtime=true&max_num_departures=${max_departures || 5}`;
    const response = await fetch(url, { headers: { apiKey } });
    const data = await response.json();
    // Use shorter cache for real-time data
    cache[cacheKey] = { data, time: Date.now() };
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Transit API failed', details: err.message });
  }
});

app.get('/api/transit/trip', async (req, res) => {
  const apiKey = process.env.TRANSIT_APP_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Transit App API key not configured' });

  const { trip_search_key } = req.query;
  if (!trip_search_key) return res.status(400).json({ error: 'trip_search_key required' });

  const cacheKey = `transit_trip_${trip_search_key}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const url = `${TRANSIT_API_BASE}/v4/public/trip_details?trip_search_key=${encodeURIComponent(trip_search_key)}`;
    const response = await fetch(url, { headers: { apiKey } });
    const data = await response.json();
    cache[cacheKey] = { data, time: Date.now() };
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Transit API failed', details: err.message });
  }
});

// --- Weather API (Open-Meteo, free, no key) ---
const WEATHER_CACHE_TTL = 15 * 60 * 1000; // 15 min cache
app.get('/api/weather', async (req, res) => {
  const cacheKey = 'weather_teaneck';
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.time < WEATHER_CACHE_TTL) return res.json(cached.data);

  try {
    // Teaneck, NJ coordinates
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=40.8746&longitude=-74.0123&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset&hourly=temperature_2m,weather_code,precipitation_probability&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=2';
    const response = await fetch(url);
    const data = await response.json();
    cache[cacheKey] = { data, time: Date.now() };
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Weather API failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Travel dashboard running at http://localhost:${PORT}`);
});
