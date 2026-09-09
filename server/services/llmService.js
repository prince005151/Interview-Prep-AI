const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-3.6-flash';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getLLMConfig = () => {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Add your Gemini API key to server/.env before generating a kit.');
  }

  return {
    apiKey,
    baseUrl: String(process.env.GEMINI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
    model: String(process.env.GEMINI_MODEL || DEFAULT_MODEL),
    timeoutMs: Math.min(120000, Math.max(5000, Number(process.env.GEMINI_TIMEOUT_MS) || 45000)),
  };
};

const parseJsonContent = (content) => {
  const raw = String(content || '').trim();
  const withoutFence = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(withoutFence);
  } catch (error) {
    throw new Error(`LLM returned invalid JSON: ${error.message}`);
  }
};

const requestCompletion = async ({ system, user, config = getLLMConfig(), fetchFn = fetch }) => {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetchFn(`${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`, {
        method: 'POST',
        headers: {
          'x-goog-api-key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.error?.message || `LLM request failed with HTTP ${response.status}`;
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === 2) throw new Error(message);
        lastError = new Error(message);
        await sleep(500 * 2 ** attempt);
        continue;
      }

      const content = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
      if (!content) throw new Error('LLM response did not contain message content.');
      return parseJsonContent(content);
    } catch (error) {
      lastError = error.name === 'AbortError'
        ? new Error(`LLM request timed out after ${config.timeoutMs}ms.`)
        : error;
      if (attempt === 2) throw lastError;
      await sleep(500 * 2 ** attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error('LLM request failed.');
};

module.exports = { getLLMConfig, parseJsonContent, requestCompletion };