exports.handler = async (event) => {
  const apiKey = process.env.TRANSIT_APP_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Transit App API key not configured' }) };
  }

  const params = event.queryStringParameters || {};
  const stopIds = params.stop_ids;
  if (!stopIds) {
    return { statusCode: 400, body: JSON.stringify({ error: 'stop_ids required' }) };
  }

  const maxDep = params.max_departures || 5;
  const url = `https://external.transitapp.com/v4/public/stop_departures?global_stop_ids=${encodeURIComponent(stopIds)}&should_update_realtime=true&max_num_departures=${maxDep}`;

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
