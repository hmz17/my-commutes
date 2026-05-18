exports.handler = async () => {
  const destinations = (process.env.DESTINATIONS || '').split(';').map(d => {
    const parts = d.split('|');
    if (parts.length < 2) return null;
    return {
      label: parts[0].trim(),
      address: parts[1].trim(),
      mode: (parts[2] || 'driving').trim()
    };
  }).filter(Boolean);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      homeAddress: process.env.HOME_ADDRESS,
      destinations,
      apiKey: process.env.GOOGLE_MAPS_API_KEY
    })
  };
};
