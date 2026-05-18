const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
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

// Proxy directions requests to keep API key server-side
app.get('/api/directions', async (req, res) => {
  const { origin, destination, mode } = req.query;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }

  const travelMode = mode || 'driving';
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
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch directions', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Travel dashboard running at http://localhost:${PORT}`);
});
