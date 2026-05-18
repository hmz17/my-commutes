exports.handler = async (event) => {
  const { origin, destination, mode } = event.queryStringParameters || {};
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Google Maps API key not configured' })
    };
  }

  const travelMode = mode || 'driving';
  let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${travelMode}&key=${apiKey}`;

  if (travelMode === 'driving') {
    url += '&departure_time=now&traffic_model=best_guess';
  } else if (travelMode === 'transit') {
    url += '&departure_time=now';
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch directions', details: err.message })
    };
  }
};
