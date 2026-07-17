/* =================================================================
   Mandarin Oriental — Interactive Playbook System
   Minimal static server (Express). Serves /public on port 3000.
   Works on Replit out of the box: click Run.
   ================================================================= */
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// In development, prevent stale cached files in the preview browser.
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
}

app.use(express.static(path.join(__dirname, 'public')));

// Single-page fallback -> always serve the playbook shell.
// Middleware form works across Express 4 and 5 (no wildcard route string).
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MO Interactive Playbook running on http://0.0.0.0:${PORT}`);
});

// In development, also answer on port 3000 so older preview tabs keep working.
if (process.env.NODE_ENV !== 'production' && String(PORT) !== '3000') {
  app.listen(3000, '0.0.0.0', () => {
    console.log('Dev alias also listening on http://0.0.0.0:3000');
  }).on('error', () => {});
}
