export const config = { runtime: 'edge' };

// Use the archive.org item server directly — different infrastructure from the CDN nginx
// that blocks cloud provider IPs. Redirect: follow handles the 301 within the same domain.
// Primary: ia801606 redirects 301 → ia601606/25/items/...
const PRIMARY_URL = 'https://ia801606.us.archive.org/0/items/gta-vicecity-wasm-assets/game.tar.gz';
const FALLBACK_URL = 'https://ia601606.us.archive.org/25/items/gta-vicecity-wasm-assets/game.tar.gz';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/octet-stream, */*',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

async function fetchUpstream(url, method) {
  const resp = await fetch(url, {
    method,
    headers: FETCH_HEADERS,
    redirect: 'follow',
  });
  return resp;
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const method = request.method === 'HEAD' ? 'HEAD' : 'GET';

  try {
    let upstream = await fetchUpstream(PRIMARY_URL, method);

    // If primary fails or returns HTML, try fallback
    const contentType = upstream.headers.get('content-type') || '';
    if (!upstream.ok || contentType.includes('text/html')) {
      upstream = await fetchUpstream(FALLBACK_URL, method);
    }

    if (!upstream.ok) {
      return new Response(`Upstream error ${upstream.status}`, {
        status: 502,
        headers: CORS_HEADERS,
      });
    }

    const upstreamType = upstream.headers.get('content-type') || '';
    if (upstreamType.includes('text/html')) {
      return new Response('Upstream returned HTML — all CDN servers appear blocked', {
        status: 502,
        headers: CORS_HEADERS,
      });
    }

    const respHeaders = new Headers(CORS_HEADERS);
    respHeaders.set('Content-Type', 'application/octet-stream');
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) respHeaders.set('Content-Length', contentLength);

    if (method === 'HEAD') {
      return new Response(null, { status: 200, headers: respHeaders });
    }

    return new Response(upstream.body, { status: 200, headers: respHeaders });
  } catch (err) {
    return new Response(`Proxy error: ${err.message}`, {
      status: 502,
      headers: CORS_HEADERS,
    });
  }
}
