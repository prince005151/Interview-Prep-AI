const test = require('node:test');
const assert = require('node:assert/strict');

const { parseJsonContent, requestCompletion } = require('../services/llmService');

test('Gemini client sends the API key in a header and parses structured JSON', async () => {
  let request;
  const result = await requestCompletion({
    system: 'Return JSON.',
    user: 'Create a test response.',
    config: {
      apiKey: 'test-secret',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-test',
      timeoutMs: 5000,
    },
    fetchFn: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
        }),
      };
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(request.url.includes('test-secret'), false);
  assert.equal(request.options.headers['x-goog-api-key'], 'test-secret');
});

test('Gemini client rejects malformed JSON responses', () => {
  assert.throws(() => parseJsonContent('not json'), /invalid JSON/i);
});
