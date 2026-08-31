/**
 * Worker M6B Verification Test Suite
 * Validates YouTube, Instagram, TikTok, Rate Limiter, and Unified SocialPublisherManager
 */

const {
  YouTubePublisher,
  youtubePublisher,
  InstagramPublisher,
  instagramPublisher,
  TikTokPublisher,
  tiktokPublisher,
  getPublisher,
  socialPublisherManager,
  calculateBackoffWithJitter,
  extractRetryAfterMs,
  isDefaultRetryableError,
  withRetry,
  TokenBucketLimiter,
  ValidationError,
  RateLimitError,
  TokenExpiredError,
  YouTubePublishError,
  YouTubeQuotaExceededError,
  InstagramPublishError,
  InstagramRateLimitError,
  TikTokPublishError,
} = require('../../lib/publishing/index.ts');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('Starting M6B Social Publishing Verification Tests...\n');

  // Test 1: YouTube Auth URL
  const ytAuthUrl = youtubePublisher.getAuthUrl({
    clientId: 'test-yt-client-id',
    redirectUri: 'https://example.com/oauth/youtube/callback',
    state: 'csrf-123',
  });
  assert(ytAuthUrl.includes('accounts.google.com'), 'YouTube Auth URL should target Google OAuth endpoint');
  assert(ytAuthUrl.includes('youtube.upload'), 'YouTube Auth URL should include youtube.upload scope');
  assert(ytAuthUrl.includes('access_type=offline'), 'YouTube Auth URL should have access_type=offline');
  console.log('✓ T1: YouTube Auth URL generated correctly');

  // Test 2: YouTube Dry-Run Publish
  const ytDryRunRes = await youtubePublisher.publishVideo({
    platform: 'youtube',
    title: 'Mind-blowing Tech Facts #shorts',
    description: 'Check out these top tech facts.',
    tags: ['shorts', 'tech', 'facts'],
    privacy: 'public',
  });
  assert(ytDryRunRes.success === true, 'YouTube dry-run publish should succeed');
  assert(ytDryRunRes.isDryRun === true, 'isDryRun should be true by default');
  assert(ytDryRunRes.platform === 'youtube', 'Platform should be youtube');
  assert(ytDryRunRes.publishedUrl.startsWith('https://www.youtube.com/watch?v='), 'Published URL should be valid YouTube Watch URL');
  assert(ytDryRunRes.metadata.quotaUnitsUsed === 1600, 'YouTube upload cost should be 1600 units');
  console.log('✓ T2: YouTube Dry-Run Publish successful');

  // Test 3: YouTube Validation - Title > 100 chars
  let ytTitleThrew = false;
  try {
    await youtubePublisher.publishVideo({
      platform: 'youtube',
      title: 'A'.repeat(101),
    });
  } catch (err) {
    ytTitleThrew = true;
    assert(err instanceof ValidationError, 'Should throw ValidationError for title > 100 chars');
    assert(err.message.includes('100 characters'), 'Error message should mention 100 characters');
  }
  assert(ytTitleThrew, 'Title length check must throw');
  console.log('✓ T3: YouTube Title validation > 100 chars caught');

  // Test 4: Instagram Auth URL
  const igAuthUrl = instagramPublisher.getAuthUrl({
    clientId: 'test-fb-app-id',
    redirectUri: 'https://example.com/oauth/instagram/callback',
    state: 'ig-csrf',
  });
  assert(igAuthUrl.includes('facebook.com'), 'Instagram Auth URL should target Facebook OAuth');
  assert(igAuthUrl.includes('instagram_content_publish'), 'Instagram Auth URL should include content_publish scope');
  console.log('✓ T4: Instagram Auth URL generated correctly');

  // Test 5: Instagram Dry-Run Publish
  const igDryRunRes = await instagramPublisher.publishVideo({
    platform: 'instagram',
    title: 'Daily Reel Story',
    caption: 'Discover amazing AI innovations! #reels #ai #trending',
  });
  assert(igDryRunRes.success === true, 'Instagram dry-run publish should succeed');
  assert(igDryRunRes.isDryRun === true, 'isDryRun should be true');
  assert(igDryRunRes.platform === 'instagram', 'Platform should be instagram');
  assert(igDryRunRes.publishedUrl.startsWith('https://www.instagram.com/reel/'), 'Published URL should be valid Instagram Reel URL');
  console.log('✓ T5: Instagram Dry-Run Publish successful');

  // Test 6: Instagram Validation - > 30 Hashtags
  let igHashtagsThrew = false;
  try {
    const tooManyTags = Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(' ');
    await instagramPublisher.publishVideo({
      platform: 'instagram',
      caption: `Caption with too many tags: ${tooManyTags}`,
    });
  } catch (err) {
    igHashtagsThrew = true;
    assert(err instanceof ValidationError, 'Should throw ValidationError for > 30 hashtags');
    assert(err.message.includes('30 hashtags'), 'Error message should mention 30 hashtags limit');
  }
  assert(igHashtagsThrew, 'Hashtags check must throw');
  console.log('✓ T6: Instagram Hashtag validation (>30) caught');

  // Test 7: TikTok Auth URL
  const ttAuthUrl = tiktokPublisher.getAuthUrl({
    clientId: 'test-tt-client-key',
    redirectUri: 'https://example.com/oauth/tiktok/callback',
    state: 'tt-state-1',
  });
  assert(ttAuthUrl.includes('tiktok.com'), 'TikTok Auth URL should target TikTok OAuth');
  assert(ttAuthUrl.includes('client_key=test-tt-client-key'), 'TikTok Auth URL should include client_key');
  console.log('✓ T7: TikTok Auth URL generated correctly');

  // Test 8: TikTok Dry-Run Publish
  const ttDryRunRes = await tiktokPublisher.publishVideo({
    platform: 'tiktok',
    title: 'Viral TikTok AI Video',
    privacy: 'public',
  });
  assert(ttDryRunRes.success === true, 'TikTok dry-run publish should succeed');
  assert(ttDryRunRes.isDryRun === true, 'isDryRun should be true');
  assert(ttDryRunRes.platform === 'tiktok', 'Platform should be tiktok');
  assert(ttDryRunRes.publishedUrl.startsWith('https://www.tiktok.com/@creator/video/'), 'Published URL should be valid TikTok video URL');
  console.log('✓ T8: TikTok Dry-Run Publish successful');

  // Test 9: TikTok Validation - Empty Title
  let ttEmptyTitleThrew = false;
  try {
    await tiktokPublisher.publishVideo({
      platform: 'tiktok',
      title: '   ',
    });
  } catch (err) {
    ttEmptyTitleThrew = true;
    assert(err instanceof ValidationError, 'Should throw ValidationError on empty title');
  }
  assert(ttEmptyTitleThrew, 'TikTok empty title check must throw');
  console.log('✓ T9: TikTok Empty title validation caught');

  // Test 10: Rate Limiter Exponential Backoff & Retry
  let attempts = 0;
  const retryResult = await withRetry(async () => {
    attempts++;
    if (attempts < 3) {
      const err = new Error('Transient server error 503');
      err.statusCode = 503;
      throw err;
    }
    return 'recovered';
  }, { maxAttempts: 4, baseDelayMs: 10, maxDelayMs: 50 });
  assert(retryResult === 'recovered', 'withRetry should recover on transient errors');
  assert(attempts === 3, 'withRetry should have retried 3 times');
  console.log('✓ T10: Rate Limiter Exponential Backoff with Retry tested');

  // Test 11: Retry-After Header Parsing
  const headerError = {
    statusCode: 429,
    headers: { 'Retry-After': '5' },
  };
  const retryAfterMs = extractRetryAfterMs(headerError);
  assert(retryAfterMs === 5000, 'Retry-After: 5 should parse to 5000ms');
  console.log('✓ T11: Retry-After Header parsing tested');

  // Test 12: TokenBucketLimiter
  const limiter = new TokenBucketLimiter(5, 10);
  assert(limiter.tryAcquire(3) === true, 'Should acquire 3 tokens from capacity 5');
  assert(limiter.getAvailableTokens() === 2, 'Should have 2 tokens remaining');
  console.log('✓ T12: TokenBucketLimiter tested');

  // Test 13: Factory getPublisher
  assert(getPublisher('youtube') === youtubePublisher, 'getPublisher("youtube") should return youtubePublisher');
  assert(getPublisher('instagram') === instagramPublisher, 'getPublisher("instagram") should return instagramPublisher');
  assert(getPublisher('tiktok') === tiktokPublisher, 'getPublisher("tiktok") should return tiktokPublisher');
  console.log('✓ T13: Factory getPublisher tested');

  // Test 14: SocialPublisherManager Multi-Publish (All 3 platforms)
  const multiRes = await socialPublisherManager.publishToMultiple({
    title: 'Cross-Platform AI Short',
    description: 'Broadcast across YouTube, Instagram, and TikTok',
    platforms: ['youtube', 'instagram', 'tiktok'],
    isDryRun: true,
  });
  assert(multiRes.success === true, 'Multi-platform broadcast should succeed');
  assert(multiRes.totalPlatforms === 3, 'Total platforms should be 3');
  assert(multiRes.successfulPlatforms === 3, 'Successful platforms should be 3');
  assert(multiRes.results.youtube.success === true, 'YouTube result should succeed');
  assert(multiRes.results.instagram.success === true, 'Instagram result should succeed');
  assert(multiRes.results.tiktok.success === true, 'TikTok result should succeed');
  console.log('✓ T14: SocialPublisherManager multi-platform broadcast tested');

  // Test 15: SocialPublisherManager Partial Failure Handling
  const partialRes = await socialPublisherManager.publishToMultiple([
    { platform: 'youtube', title: 'Valid YouTube Title', isDryRun: true },
    { platform: 'instagram', title: 'A'.repeat(3000), isDryRun: true }, // Invalid caption > 2200
    { platform: 'tiktok', title: 'Valid TikTok Title', isDryRun: true },
  ]);
  assert(partialRes.success === false, 'Partial failure should mark success as false');
  assert(partialRes.successfulPlatforms === 2, '2 out of 3 should succeed');
  assert(partialRes.totalPlatforms === 3, 'Total platforms should be 3');
  assert(partialRes.results.instagram.success === false, 'Instagram should be marked failed');
  assert(partialRes.errors.instagram.includes('2200 characters'), 'Error should describe character limit');
  console.log('✓ T15: Partial failure resilience tested');

  console.log('\n========================================');
  console.log('All 15 M6B Verification Tests PASSED!');
  console.log('========================================');
}

module.exports = { runTests };
