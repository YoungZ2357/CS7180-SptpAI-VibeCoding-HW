import { SmartCache } from './SmartCache';

/**
 * Test Suite for SmartCache
 * Run with: ts-node SmartCache.test.ts
 */

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
};

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
    testsPassed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${message}`);
    testsFailed++;
  }
}

function assertDeepEqual<T>(actual: T, expected: T, message: string): void {
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  assert(isEqual, `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function testSection(title: string): void {
  console.log(`\n${colors.blue}━━━ ${title} ━━━${colors.reset}`);
}

// Clear localStorage before tests
if (typeof localStorage !== 'undefined') {
  localStorage.clear();
}

// ============================================================================
// UNIT TESTS
// ============================================================================

async function runTests(): Promise<void> {
  console.log(`${colors.yellow}Starting SmartCache Test Suite...${colors.reset}\n`);

  // Test 1: Basic Operations
  testSection('Test 1: Basic Operations');
  {
    const cache = new SmartCache<string, number>();
    
    cache.set('key1', 100);
    assert(cache.get('key1') === 100, 'set and get basic value');
    assert(cache.has('key1') === true, 'has() returns true for existing key');
    assert(cache.size() === 1, 'size() returns correct count');
    
    cache.set('key2', 200);
    cache.set('key3', 300);
    assert(cache.size() === 3, 'size() after multiple insertions');
    
    cache.delete('key2');
    assert(cache.get('key2') === undefined, 'delete() removes entry');
    assert(cache.has('key2') === false, 'has() returns false after delete');
    assert(cache.size() === 2, 'size() decreases after delete');
    
    cache.clear();
    assert(cache.size() === 0, 'clear() empties cache');
    assert(cache.get('key1') === undefined, 'get() returns undefined after clear');
  }

  // Test 2: Update Existing Key
  testSection('Test 2: Update Existing Key');
  {
    const cache = new SmartCache<string, string>();
    cache.set('user', 'Alice');
    assert(cache.get('user') === 'Alice', 'initial value set');
    
    cache.set('user', 'Bob');
    assert(cache.get('user') === 'Bob', 'value updated on re-set');
    assert(cache.size() === 1, 'size remains 1 after update');
  }

  // Test 3: TTL - Per-Entry
  testSection('Test 3: TTL - Per-Entry Expiration');
  {
    const cache = new SmartCache<string, string>();
    cache.set('shortLived', 'expires soon', 100); // 100ms TTL
    cache.set('longLived', 'stays longer', 10000); // 10s TTL
    
    assert(cache.get('shortLived') === 'expires soon', 'value exists before expiration');
    assert(cache.has('shortLived') === true, 'has() returns true before expiration');
    
    await sleep(150); // Wait for expiration
    
    assert(cache.get('shortLived') === undefined, 'expired entry returns undefined');
    assert(cache.has('shortLived') === false, 'has() returns false for expired entry');
    assert(cache.get('longLived') === 'stays longer', 'non-expired entry still accessible');
  }

  // Test 4: TTL - Default TTL
  testSection('Test 4: TTL - Default TTL from Constructor');
  {
    const cache = new SmartCache<string, number>({ defaultTTL: 100 });
    cache.set('key1', 42); // Uses default TTL
    cache.set('key2', 99, 5000); // Override with explicit TTL
    
    assert(cache.get('key1') === 42, 'value with default TTL accessible');
    
    await sleep(150);
    
    assert(cache.get('key1') === undefined, 'value expired with default TTL');
    assert(cache.get('key2') === 99, 'value with explicit TTL still valid');
  }

  // Test 5: TTL - No Expiration
  testSection('Test 5: TTL - No Expiration (Infinite TTL)');
  {
    const cache = new SmartCache<string, string>();
    cache.set('permanent', 'never expires'); // No TTL
    
    await sleep(100);
    
    assert(cache.get('permanent') === 'never expires', 'entry without TTL persists');
  }

  // Test 6: LRU Eviction - Basic
  testSection('Test 6: LRU Eviction - Basic');
  {
    const cache = new SmartCache<string, number>({ maxSize: 3 });
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    assert(cache.size() === 3, 'cache at max capacity');
    
    cache.set('d', 4); // Should evict 'a' (LRU)
    assert(cache.has('a') === false, 'LRU entry (a) evicted');
    assert(cache.has('b') === true, 'newer entry (b) retained');
    assert(cache.has('c') === true, 'newer entry (c) retained');
    assert(cache.has('d') === true, 'new entry (d) added');
  }

  // Test 7: LRU Eviction - Access Updates Recency
  testSection('Test 7: LRU Eviction - Access Updates Recency');
  {
    const cache = new SmartCache<string, string>({ maxSize: 3 });
    
    cache.set('a', 'first');
    cache.set('b', 'second');
    cache.set('c', 'third');
    
    cache.get('a'); // Access 'a' - moves to front
    
    cache.set('d', 'fourth'); // Should evict 'b' (now LRU)
    
    assert(cache.has('a') === true, 'accessed entry (a) retained');
    assert(cache.has('b') === false, 'LRU entry (b) evicted');
    assert(cache.has('c') === true, 'recent entry (c) retained');
    assert(cache.has('d') === true, 'new entry (d) added');
  }

  // Test 8: LRU Eviction - Expired Entries Cleaned First
  testSection('Test 8: LRU Eviction - Expired Entries Cleaned First');
  {
    const cache = new SmartCache<string, number>({ maxSize: 3 });
    
    cache.set('a', 1, 50); // Expires in 50ms
    cache.set('b', 2);
    cache.set('c', 3);
    
    await sleep(100); // 'a' expires
    
    cache.set('d', 4); // Should clean 'a', not evict 'b'
    
    assert(cache.has('a') === false, 'expired entry cleaned');
    assert(cache.has('b') === true, 'non-expired entry retained');
    assert(cache.has('c') === true, 'non-expired entry retained');
    assert(cache.has('d') === true, 'new entry added');
  }

  // Test 9: Size Calculation with Expired Entries
  testSection('Test 9: Size Calculation - Excludes Expired Entries');
  {
    const cache = new SmartCache<string, string>({ defaultTTL: 100 });
    
    cache.set('a', 'first');
    cache.set('b', 'second');
    cache.set('c', 'third');
    
    assert(cache.size() === 3, 'size before expiration');
    
    await sleep(150);
    
    assert(cache.size() === 0, 'size after expiration (expired entries cleaned)');
  }

  // Test 10: Numeric Keys
  testSection('Test 10: Numeric Keys');
  {
    const cache = new SmartCache<number, string>();
    
    cache.set(1, 'one');
    cache.set(2, 'two');
    cache.set(42, 'answer');
    
    assert(cache.get(1) === 'one', 'numeric key retrieval');
    assert(cache.has(42) === true, 'has() with numeric key');
    assert(cache.size() === 3, 'size with numeric keys');
  }

  // Test 11: Complex Value Types
  testSection('Test 11: Complex Value Types');
  {
    interface User {
      name: string;
      age: number;
    }
    
    const cache = new SmartCache<string, User>();
    const user = { name: 'Alice', age: 30 };
    
    cache.set('user1', user);
    const retrieved = cache.get('user1');
    
    assertDeepEqual(retrieved, user, 'complex object retrieval');
  }

  // Test 12: Persistence - Basic Save/Load
  testSection('Test 12: Persistence - Basic Save/Load');
  {
    // Clear any existing data
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('test_persist');
    }
    
    // Create cache and add data
    const cache1 = new SmartCache<string, number>({ persist: 'test_persist' });
    cache1.set('x', 100);
    cache1.set('y', 200);
    
    // Create new cache instance - should load from storage
    const cache2 = new SmartCache<string, number>({ persist: 'test_persist' });
    
    assert(cache2.get('x') === 100, 'persisted value (x) restored');
    assert(cache2.get('y') === 200, 'persisted value (y) restored');
    assert(cache2.size() === 2, 'persisted size correct');
  }

  // Test 13: Persistence - Expired Entries Not Restored
  testSection('Test 13: Persistence - Expired Entries Not Restored');
  {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('test_persist_ttl');
    }
    
    const cache1 = new SmartCache<string, string>({ persist: 'test_persist_ttl' });
    cache1.set('ephemeral', 'will expire', 50);
    cache1.set('permanent', 'stays', 10000);
    
    await sleep(100); // Wait for expiration
    
    // Create new instance - expired entry should not be loaded
    const cache2 = new SmartCache<string, string>({ persist: 'test_persist_ttl' });
    
    assert(cache2.get('ephemeral') === undefined, 'expired entry not restored');
    assert(cache2.get('permanent') === 'stays', 'non-expired entry restored');
  }

  // Test 14: Persistence - Updates Synced
  testSection('Test 14: Persistence - Updates Synced to Storage');
  {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('test_persist_sync');
    }
    
    const cache1 = new SmartCache<string, number>({ persist: 'test_persist_sync' });
    cache1.set('key', 111);
    
    const cache2 = new SmartCache<string, number>({ persist: 'test_persist_sync' });
    assert(cache2.get('key') === 111, 'initial value synced');
    
    cache1.set('key', 222);
    
    const cache3 = new SmartCache<string, number>({ persist: 'test_persist_sync' });
    assert(cache3.get('key') === 222, 'updated value synced');
    
    cache1.delete('key');
    
    const cache4 = new SmartCache<string, number>({ persist: 'test_persist_sync' });
    assert(cache4.has('key') === false, 'deletion synced');
  }

  // Test 15: Persistence - Clear Synced
  testSection('Test 15: Persistence - Clear Synced to Storage');
  {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('test_persist_clear');
    }
    
    const cache1 = new SmartCache<string, string>({ persist: 'test_persist_clear' });
    cache1.set('a', 'alpha');
    cache1.set('b', 'beta');
    
    cache1.clear();
    
    const cache2 = new SmartCache<string, string>({ persist: 'test_persist_clear' });
    assert(cache2.size() === 0, 'clear synced to storage');
  }

  // ============================================================================
  // DEMONSTRATION: 200 DUMMY ENTRIES
  // ============================================================================

  testSection('DEMONSTRATION: 200 Dummy Cache Entries');
  {
    console.log('Creating cache with 200 entries (maxSize: 250)...');
    
    const demoCache = new SmartCache<string, string>({ 
      maxSize: 250,
      defaultTTL: 30000, // 30 seconds default
      persist: 'demo_cache_200'
    });

    // Generate 200 dummy entries
    for (let i = 1; i <= 200; i++) {
      const key = `entry_${i}`;
      const value = `Value for entry ${i} - ${Math.random().toString(36).substring(7)}`;
      const ttl = i % 10 === 0 ? 1000 : undefined; // Every 10th entry expires in 1s
      
      demoCache.set(key, value, ttl);
    }

    console.log(`Total entries added: 200`);
    assert(demoCache.size() === 200, 'all 200 entries stored');

    // Test access pattern
    console.log('\nAccessing entries to demonstrate LRU behavior...');
    for (let i = 1; i <= 50; i++) {
      demoCache.get(`entry_${i}`);
    }

    // Add more entries to trigger eviction
    console.log('Adding 60 more entries (total 260, exceeds maxSize 250)...');
    for (let i = 201; i <= 260; i++) {
      const key = `entry_${i}`;
      const value = `New entry ${i}`;
      demoCache.set(key, value);
    }

    const sizeAfterEviction = demoCache.size();
    console.log(`Size after adding beyond capacity: ${sizeAfterEviction}`);
    assert(sizeAfterEviction <= 250, 'LRU eviction maintains maxSize');

    // Check that recently accessed entries are retained
    let recentlyAccessedRetained = 0;
    for (let i = 1; i <= 50; i++) {
      if (demoCache.has(`entry_${i}`)) {
        recentlyAccessedRetained++;
      }
    }
    console.log(`Recently accessed entries (1-50) retained: ${recentlyAccessedRetained}/50`);
    assert(recentlyAccessedRetained > 40, 'most recently accessed entries retained');

    // Wait for expiration
    console.log('\nWaiting 1.5s for entries with short TTL to expire...');
    await sleep(1500);

    const sizeAfterExpiration = demoCache.size();
    console.log(`Size after expiration cleanup: ${sizeAfterExpiration}`);
    assert(sizeAfterExpiration < sizeAfterEviction, 'expired entries removed');

    // Verify persistence
    console.log('\nTesting persistence with 200+ entries...');
    const persistedCache = new SmartCache<string, string>({ persist: 'demo_cache_200' });
    const persistedSize = persistedCache.size();
    console.log(`Entries restored from localStorage: ${persistedSize}`);
    assert(persistedSize > 0, 'large cache persisted and restored');

    // Sample verification
    const sampleKeys = ['entry_25', 'entry_150', 'entry_225'];
    let samplesFound = 0;
    for (const key of sampleKeys) {
      if (persistedCache.has(key)) {
        samplesFound++;
        console.log(`  ✓ Sample key '${key}' found in restored cache`);
      }
    }
    assert(samplesFound > 0, 'sample entries restored from storage');
  }

  // ============================================================================
  // TEST SUMMARY
  // ============================================================================

  console.log(`\n${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.yellow}TEST SUMMARY${colors.reset}`);
  console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
  console.log(`Total: ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log(`\n${colors.green}✓ All tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}✗ Some tests failed${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test execution error:${colors.reset}`, error);
  process.exit(1);
});
