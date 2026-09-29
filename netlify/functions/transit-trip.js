exports.handler = async (event) => {
  const apiKey = process.env.TRANSIT_APP_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Transit App API key not configured' }) };
  }

  const params = event.queryStringParameters || {};
  const tripSearchKey = params.trip_search_key;
  if (!tripSearchKey) {
    return { statusCode: 400, body: JSON.stringify({ error: 'trip_search_key required' }) };
  }

  const url = `https://external.transitapp.com/v4/public/trip_details?trip_search_key=${encodeURIComponent(tripSearchKey)}`;

  try {
    const response = await fetch(url, { headers: { apiKey } });
    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Transit API failed', details: err.message }) };
  }
};
