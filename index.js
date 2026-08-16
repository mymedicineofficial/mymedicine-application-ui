const express = require('express');
const cors = require('cors');
const compression = require('compression');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Config (set these in Render's "Environment" tab) ----------------------
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER || 'mymedicineofficial';
const REPO_NAME = process.env.REPO_NAME || 'mymedicine-application-ui';
const FILE_PATH = process.env.FILE_PATH || 'homepage.json';
const BRANCH = process.env.BRANCH || 'main';

// How long we trust our copy of GitHub's file before checking again (seconds).
// Keeps requests fast (no GitHub round-trip most of the time) and keeps us
// well under GitHub's API rate limit.
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_SECONDS || 60) * 1000;

app.use(cors());
app.use(compression());

// --- In-memory cache ---------------------------------------------------
let cache = {
    json: null,       // parsed layout (last known-good)
    etag: null,       // hash of the raw content, used for If-None-Match / 304s
    fetchedAt: 0
};

function computeEtag(rawString) {
    return '"' + crypto.createHash('md5').update(rawString).digest('hex') + '"';
}

async function fetchFromGitHub() {
    if (!GITHUB_TOKEN) {
        throw new Error('GITHUB_TOKEN is not set in environment variables');
    }
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const response = await axios.get(url, {
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3.raw'
        },
        timeout: 10000
    });
    // Because of the "raw" Accept header, response.data is already the file's
    // raw text content (the JSON string as it sits in the repo).
    return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
}

/**
 * Returns { json, etag, fetchedAt }. Serves from cache when fresh.
 * If GitHub fails and we DO have an old cached copy, we serve that instead
 * of failing the whole Home screen - a flaky GitHub call should never mean
 * a blank/broken app for users.
 */
async function getLayout({ forceRefresh = false } = {}) {
    const isStale = Date.now() - cache.fetchedAt > CACHE_TTL_MS;
    if (!forceRefresh && cache.json && !isStale) {
        return cache;
    }

    try {
        const raw = await fetchFromGitHub();
        const parsed = JSON.parse(raw); // throws if the repo file isn't valid JSON

        cache = { json: parsed, etag: computeEtag(raw), fetchedAt: Date.now() };
        return cache;
    } catch (error) {
        console.error('[home-layout] GitHub fetch failed:', error.message);
        if (cache.json) {
            console.warn('[home-layout] Serving last known-good cached layout instead.');
            return cache;
        }
        throw error;
    }
}

app.get('/api/home-layout', async (req, res) => {
    try {
        const forceRefresh = req.query.refresh === '1';
        const layout = await getLayout({ forceRefresh });

        // App-style caching: if the client already has this exact version
        // (matching ETag), tell it to keep using its local copy - saves data
        // and makes the "refreshIntervalSeconds" polling essentially free.
        if (req.headers['if-none-match'] === layout.etag) {
            return res.status(304).end();
        }

        res.set('ETag', layout.etag);
        res.set('Cache-Control', `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`);
        res.json(layout.json);
    } catch (error) {
        res.status(502).json({
            error: 'home_layout_unavailable',
            message: 'Could not load Home layout right now. Please try again shortly.'
        });
    }
});

// Lightweight endpoint for uptime monitors / to keep a free Render instance warm.
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', cachedAt: cache.fetchedAt || null });
});

app.get('/', (req, res) => {
    res.send('mymed-bridge-api is running.');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
