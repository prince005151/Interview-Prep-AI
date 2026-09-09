const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldRespectRobots, withRetry, getRobotsRules } = require('../services/researchService');

test('robots rule should block disallowed paths', () => {
  const robots = `User-agent: *\nDisallow: /careers\nAllow: /company\n`;
  const rules = getRobotsRules(robots);

  assert.equal(shouldRespectRobots('https://example.com/careers', rules), true);
  assert.equal(shouldRespectRobots('https://example.com/company', rules), false);
});

test('withRetry retries transient failures and eventually succeeds', async () => {
  let attempts = 0;

  const result = await withRetry(async () => {
    attempts += 1;
    if (attempts < 3) {
      throw new Error('temporary');
    }
    return 'ok';
  }, { retries: 3, baseDelayMs: 1 });

  assert.equal(result, 'ok');
  assert.equal(attempts, 3);
});
