const fetch = global.fetch;

const DEFAULT_HEADERS = {
  'User-Agent': 'AIInterviewPrepKitGenerator/1.0 (+https://example.com)',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

const CONTENT_HINTS = ['about', 'company', 'careers', 'jobs', 'culture', 'team', 'values', 'leadership'];

const sanitizeUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch (error) {
    return null;
  }
};

const getRobotsRules = (robotsTxt = '') => {
  const rules = { allow: [], disallow: [] };
  const lines = robotsTxt.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  let currentAgent = null;

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    const keyName = key.trim().toLowerCase();
    const value = valueParts.join(':').trim();

    if (!keyName || !value) continue;

    if (keyName === 'user-agent') {
      currentAgent = value.toLowerCase();
      if (currentAgent === '*' || currentAgent.includes('aiinterviewprepgenerator')) {
        rules.allow = [];
        rules.disallow = [];
      }
      continue;
    }

    if (keyName === 'allow' && currentAgent === '*' && value) {
      rules.allow.push(value);
      continue;
    }

    if (keyName === 'disallow' && currentAgent === '*' && value) {
      rules.disallow.push(value);
    }
  }

  return rules;
};

const shouldRespectRobots = (url, rules) => {
  if (!url || !rules) return false;

  const parsedUrl = new URL(url);
  const path = parsedUrl.pathname || '/';

  const disallowed = rules.disallow.some((rule) => rule && rule !== '/' && path.startsWith(rule));
  if (disallowed) {
    return true;
  }

  const allowed = rules.allow.some((rule) => rule && path.startsWith(rule));
  if (rules.allow.length && rules.disallow.length && !allowed) {
    return false;
  }

  return false;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, { retries = 3, baseDelayMs = 300, maxDelayMs = 2000, onRetry } = {}) => {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      const shouldRetry = attempt < retries;
      if (!shouldRetry) throw error;

      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      if (onRetry) onRetry({ attempt: attempt + 1, delay, error });
      await sleep(delay);
      attempt += 1;
    }
  }

  throw new Error('Retry loop exited unexpectedly');
};

const fetchText = async (url, options = {}) => {
  const targetUrl = sanitizeUrl(url);
  if (!targetUrl) {
    throw new Error(`Invalid URL: ${url}`);
  }

  const response = await withRetry(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) },
        signal: controller.signal,
        redirect: 'follow',
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${targetUrl}`);
      }

      return await res.text();
    } finally {
      clearTimeout(timeout);
    }
  }, {
    retries: options.retries ?? 2,
    baseDelayMs: options.baseDelayMs ?? 400,
    maxDelayMs: options.maxDelayMs ?? 2000,
  });

  return response;
};

const fetchRobotsTxt = async (siteUrl) => {
  const baseUrl = sanitizeUrl(siteUrl);
  if (!baseUrl) {
    return '';
  }

  try {
    const origin = new URL(baseUrl).origin;
    return await fetchText(`${origin}/robots.txt`, {
      timeoutMs: 10000,
      retries: 1,
    }).catch(() => '');
  } catch (error) {
    return '';
  }
};

const scoreCandidateUrl = (href, root) => {
  const candidate = sanitizeUrl(href);
  if (!candidate || !candidate.startsWith(root)) return -Infinity;

  const lower = candidate.toLowerCase();
  const matches = CONTENT_HINTS.filter((hint) => lower.includes(hint));
  return matches.length * 10 + (candidate.includes('/careers') || candidate.includes('/jobs') ? 30 : 0);
};

const discoverCompanyUrls = async (siteUrl, { fetchFn = fetchText, robotsTxt = '', maxDepth = 3 } = {}) => {
  const root = sanitizeUrl(siteUrl);
  if (!root) {
    throw new Error(`Invalid site URL: ${siteUrl}`);
  }

  const queue = [{ url: root, depth: 0 }];
  const crawled = new Set();
  const results = new Set();
  const robotsRules = getRobotsRules(robotsTxt);

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;

    const currentUrl = current.url;
    if (crawled.has(currentUrl)) continue;

    crawled.add(currentUrl);
    if (current.depth > maxDepth) continue;
    if (shouldRespectRobots(currentUrl, robotsRules)) continue;

    try {
      const html = await fetchFn(currentUrl, { timeoutMs: 12000, retries: 1 });
      if (!html || typeof html !== 'string') continue;

      results.add(currentUrl);

      const matches = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]);
      const candidates = matches
        .map((href) => ({ href, value: scoreCandidateUrl(href, root) }))
        .filter((entry) => Number.isFinite(entry.value) && entry.value > -Infinity)
        .sort((a, b) => b.value - a.value)
        .slice(0, 30);

      for (const candidate of candidates) {
        try {
          const nextUrl = new URL(candidate.href, currentUrl).toString();
          if (!crawled.has(nextUrl) && !queue.some((item) => item.url === nextUrl)) {
            queue.push({ url: nextUrl, depth: current.depth + 1 });
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      continue;
    }
  }

  return [...results].slice(0, 50);
};

module.exports = {
  sanitizeUrl,
  getRobotsRules,
  shouldRespectRobots,
  withRetry,
  fetchText,
  fetchRobotsTxt,
  discoverCompanyUrls,
};
