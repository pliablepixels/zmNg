import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3001;

// Enable CORS for all requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Target-Host');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Image proxy that routes based on URL query parameter
// This is used for images to avoid CORS issues in dev mode
app.get('/image-proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  console.log(`[Image Proxy] Fetching ${targetUrl}`);

  try {
    // Use built-in fetch (Node 18+) or fall back to node-fetch
    const fetchFn = globalThis.fetch || (await import('node-fetch')).default;
    const response = await fetchFn(targetUrl);

    if (!response.ok) {
      console.error(`[Image Proxy Error] ${response.status} ${response.statusText}`);
      return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
    }

    // Forward the content type
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Stream the image data
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('[Image Proxy Error]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Dynamic proxy that routes based on X-Target-Host header
app.use('/proxy', (req, res, next) => {
  const targetHost = req.headers['x-target-host'];

  if (!targetHost) {
    return res.status(400).json({ error: 'Missing X-Target-Host header' });
  }

  console.log(`[Proxy] Routing ${req.method} ${req.url} -> ${targetHost}`);

  const proxy = createProxyMiddleware({
    target: targetHost,
    changeOrigin: true,
    pathRewrite: {
      '^/proxy': '', // Remove /proxy prefix
    },
    onProxyReq: (proxyReq) => {
      // Remove our custom header before forwarding
      proxyReq.removeHeader('x-target-host');
      // Disable compression to avoid issues
      proxyReq.removeHeader('accept-encoding');
      proxyReq.setHeader('accept-encoding', 'identity');
    },
    onError: (err, req, res) => {
      console.error('[Proxy Error]', err.message);
      res.status(500).json({ error: err.message });
    },
  });

  proxy(req, res, next);
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
