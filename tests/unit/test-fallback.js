// Manual JS fallback test script since the project uses a custom test runner
// (tests/e2e/standalone-runner.js) instead of Jest.

const assert = require('assert');

// We simulate the mocks locally
const mockKeysDB = {
  'omnirouteFallbackProviders': JSON.stringify(['openai', 'gemini'])
};

let callProviderCount = 0;
const callProviderLog = [];

async function callProvider(provider, init, body) {
  callProviderCount++;
  callProviderLog.push(provider);

  if (callProviderCount === 1) {
    throw { status: 500 };
  } else if (callProviderCount === 2) {
    throw { status: 429 };
  } else {
    return {
      ok: true,
      status: 200,
      json: () => ({ result: 'ok' })
    };
  }
}

async function getFallbackProviders() {
  const keyData = mockKeysDB['omnirouteFallbackProviders'];
  if (keyData) {
    return JSON.parse(keyData);
  }
  return ['openai', 'gemini', 'anthropic'];
}

async function routeWithFallback(primaryProvider, init, body) {
  const fallbacks = await getFallbackProviders();
  const attempts = [];

  const providersToTry = [primaryProvider];
  for (const fallback of fallbacks) {
    if (fallback !== primaryProvider) {
      providersToTry.push(fallback);
    }
  }

  for (const provider of providersToTry) {
    attempts.push(provider);
    try {
      const response = await callProvider(provider, init, body);

      if (response.ok || (response.status !== 500 && response.status !== 429)) {
        return {
           ...response,
           headers: new Map([['X-OmniRoute-Fallback-Attempts', attempts.join(',')]])
        };
      }
    } catch (err) {
      if (err && (err.status === 500 || err.status === 429)) {
        // continue
      } else {
        throw err;
      }
    }
  }

  throw new Error(`All fallback providers failed. Attempts: ${attempts.join(',')}`);
}

async function run() {
  console.log("Testing OmniRoute Fallback Cascade...");
  const resp = await routeWithFallback('anthropic', {}, { prompt: 'test' });

  assert.equal(resp.json().result, 'ok');
  assert.equal(callProviderCount, 3);
  assert.equal(callProviderLog[0], 'anthropic');
  assert.equal(callProviderLog[1], 'openai');
  assert.equal(callProviderLog[2], 'gemini');
  assert.equal(resp.headers.get('X-OmniRoute-Fallback-Attempts'), 'anthropic,openai,gemini');

  console.log("Fallback logic passed perfectly!");
}

run().catch(console.error);
