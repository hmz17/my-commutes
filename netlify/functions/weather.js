exports.handler = async () => {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=40.8746&longitude=-74.0123&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset&hourly=temperature_2m,weather_code,precipitation_probability&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=2';

  try {
    const response = await fetch(url);
    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Weather API failed', details: err.message }) };
  }
};
