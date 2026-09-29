// No-op livereload in production -- returns a fixed timestamp so the client never triggers a reload
exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ts: 0 })
});
