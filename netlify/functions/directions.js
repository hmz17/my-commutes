const rateLimit = {};
const MAX_REQUESTS = 60; // max requests per IP per window
const WINDOW_MS = 60 * 1000; // 1 minute window

function isRateLimited(ip) {
  const now = Date.now();
  if (!rateLimit[ip] || now - rateLimit[ip].start > WINDOW_MS) {
    rateLimit[ip] = { start: now, count: 1 };
    return false;
  }
  rateLimit[ip].count++;
  return rateLimit[ip].count > MAX_REQUESTS;
}

exports.handler = async (event) => {
  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';

  if (isRateLimited(ip)) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Too many requests. Try again later.' })
    };
  }

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
