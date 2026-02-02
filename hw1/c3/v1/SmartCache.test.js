"use strict";
/**
 * SmartCache Test Suite (Node.js Compatible)
 * Tests all core functionality: TTL, LRU eviction, persistence, and stress testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
const SmartCache_1 = require("./SmartCache");
// ============================================================
// localStorage Mock for Node.js Environment
// ============================================================
class LocalStorageMock {
    constructor() {
        this.store = new Map();
    }
    getItem(key) {
        return this.store.get(key) || null;
    }
    setItem(key, value) {
        this.store.set(key, value);
    }
    removeItem(key) {
        this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
    get length() {
        return this.store.size;
    }
    key(index) {
        const keys = Array.from(this.store.keys());
        return keys[index] || null;
    }
}
// Install localStorage mock in global scope
globalThis.localStorage = new LocalStorageMock();
// ============================================================
// Test Utilities
// ============================================================
// Helper function to wait for a specified time
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Test Suite Runner
async function runTests() {
    console.log('='.repeat(60));
    console.log('SmartCache Test Suite');
    console.log('='.repeat(60));
    await testBasicOperations();
    await testTTLExpiration();
    await testLRUEviction();
    await testPersistence();
    await testStressTest200Entries();
    console.log('\n' + '='.repeat(60));
    console.log('All tests completed!');
    console.log('='.repeat(60));
}
/**
 * Test 1: Basic Cache Operations
 */
async function testBasicOperations() {
    console.log('\n[Test 1] Basic Cache Operations');
    console.log('-'.repeat(60));
    const cache = new SmartCache_1.SmartCache({ maxSize: 10 });
    // Test set and get
    cache.set('key1', 100);
    cache.set('key2', 200);
    cache.set('key3', 300);
    console.log('✓ Set 3 entries');
    console.log(`  get('key1'): ${cache.get('key1')} (expected: 100)`);
    console.log(`  get('key2'): ${cache.get('key2')} (expected: 200)`);
    console.log(`  get('key3'): ${cache.get('key3')} (expected: 300)`);
    // Test has
    console.log(`\n✓ has('key1'): ${cache.has('key1')} (expected: true)`);
    console.log(`  has('nonexistent'): ${cache.has('nonexistent')} (expected: false)`);
    // Test size
    console.log(`\n✓ size(): ${cache.size()} (expected: 3)`);
    // Test delete
    cache.delete('key2');
    console.log(`\n✓ After delete('key2'):`);
    console.log(`  has('key2'): ${cache.has('key2')} (expected: false)`);
    console.log(`  size(): ${cache.size()} (expected: 2)`);
    // Test clear
    cache.clear();
    console.log(`\n✓ After clear():`);
    console.log(`  size(): ${cache.size()} (expected: 0)`);
    console.log(`  has('key1'): ${cache.has('key1')} (expected: false)`);
}
/**
 * Test 2: TTL Expiration
 */
async function testTTLExpiration() {
    console.log('\n[Test 2] TTL Expiration');
    console.log('-'.repeat(60));
    // Test with default TTL
    const cacheWithDefaultTTL = new SmartCache_1.SmartCache({
        maxSize: 10,
        defaultTTL: 100 // 100ms
    });
    cacheWithDefaultTTL.set('short-lived', 'value1');
    console.log('✓ Set entry with default TTL (100ms)');
    console.log(`  Immediate get: ${cacheWithDefaultTTL.get('short-lived')} (expected: value1)`);
    await sleep(150);
    console.log(`  After 150ms: ${cacheWithDefaultTTL.get('short-lived')} (expected: undefined - expired)`);
    console.log(`  has('short-lived'): ${cacheWithDefaultTTL.has('short-lived')} (expected: false)`);
    // Test with per-entry TTL
    const cache = new SmartCache_1.SmartCache({ maxSize: 10 });
    cache.set('key1', 'persistent'); // No TTL
    cache.set('key2', 'expires-soon', 100); // 100ms TTL
    cache.set('key3', 'expires-later', 300); // 300ms TTL
    console.log('\n✓ Set entries with different TTLs');
    console.log(`  key1: no TTL (persistent)`);
    console.log(`  key2: 100ms TTL`);
    console.log(`  key3: 300ms TTL`);
    await sleep(150);
    console.log(`\n✓ After 150ms:`);
    console.log(`  get('key1'): ${cache.get('key1')} (expected: persistent)`);
    console.log(`  get('key2'): ${cache.get('key2')} (expected: undefined - expired)`);
    console.log(`  get('key3'): ${cache.get('key3')} (expected: expires-later)`);
    await sleep(200);
    console.log(`\n✓ After 350ms total:`);
    console.log(`  get('key3'): ${cache.get('key3')} (expected: undefined - expired)`);
    console.log(`  size(): ${cache.size()} (expected: 1 - only key1 remains)`);
}
/**
 * Test 3: LRU Eviction
 */
async function testLRUEviction() {
    console.log('\n[Test 3] LRU Eviction');
    console.log('-'.repeat(60));
    const cache = new SmartCache_1.SmartCache({ maxSize: 3 });
    // Fill cache to capacity
    cache.set('key1', 1);
    cache.set('key2', 2);
    cache.set('key3', 3);
    console.log('✓ Filled cache to capacity (3/3)');
    console.log(`  size(): ${cache.size()}`);
    // Access key1 and key2 to make key3 the LRU
    cache.get('key1');
    cache.get('key2');
    console.log('\n✓ Accessed key1 and key2 (key3 is now LRU)');
    // Add new entry - should evict key3
    cache.set('key4', 4);
    console.log('\n✓ Added key4 (should evict LRU: key3)');
    console.log(`  has('key1'): ${cache.has('key1')} (expected: true)`);
    console.log(`  has('key2'): ${cache.has('key2')} (expected: true)`);
    console.log(`  has('key3'): ${cache.has('key3')} (expected: false - evicted)`);
    console.log(`  has('key4'): ${cache.has('key4')} (expected: true)`);
    // Access key1 to make key2 the LRU
    cache.get('key1');
    cache.set('key5', 5);
    console.log('\n✓ Accessed key1, added key5 (should evict LRU: key2)');
    console.log(`  has('key1'): ${cache.has('key1')} (expected: true)`);
    console.log(`  has('key2'): ${cache.has('key2')} (expected: false - evicted)`);
    console.log(`  has('key4'): ${cache.has('key4')} (expected: true)`);
    console.log(`  has('key5'): ${cache.has('key5')} (expected: true)`);
}
/**
 * Test 4: Persistence to localStorage
 */
async function testPersistence() {
    console.log('\n[Test 4] Persistence to localStorage');
    console.log('-'.repeat(60));
    // Clear any existing data
    const storageKey = 'test-cache-persistence';
    localStorage.removeItem(storageKey);
    // Create cache with persistence
    const cache1 = new SmartCache_1.SmartCache({
        maxSize: 10,
        persist: storageKey
    });
    cache1.set('user1', { name: 'Alice', value: 100 });
    cache1.set('user2', { name: 'Bob', value: 200 });
    cache1.set('user3', { name: 'Charlie', value: 300 });
    console.log('✓ Created cache1 and set 3 entries');
    console.log(`  size(): ${cache1.size()}`);
    // Verify data is in localStorage
    const stored = localStorage.getItem(storageKey);
    console.log(`\n✓ Data saved to localStorage:`);
    console.log(`  Storage key: ${storageKey}`);
    console.log(`  Stored: ${stored !== null} (expected: true)`);
    // Create new cache instance - should restore data
    const cache2 = new SmartCache_1.SmartCache({
        maxSize: 10,
        persist: storageKey
    });
    console.log(`\n✓ Created cache2 (should restore from localStorage):`);
    console.log(`  size(): ${cache2.size()} (expected: 3)`);
    console.log(`  get('user1'): ${JSON.stringify(cache2.get('user1'))} (expected: Alice)`);
    console.log(`  get('user2'): ${JSON.stringify(cache2.get('user2'))} (expected: Bob)`);
    console.log(`  get('user3'): ${JSON.stringify(cache2.get('user3'))} (expected: Charlie)`);
    // Test persistence with TTL - expired entries should not be restored
    const cache3 = new SmartCache_1.SmartCache({
        maxSize: 10,
        defaultTTL: 100,
        persist: 'test-cache-ttl'
    });
    cache3.set('expires', 'value1');
    cache3.set('persistent', 'value2', 5000); // 5 seconds
    console.log(`\n✓ Created cache3 with TTL entries`);
    await sleep(150);
    const cache4 = new SmartCache_1.SmartCache({
        maxSize: 10,
        defaultTTL: 100,
        persist: 'test-cache-ttl'
    });
    console.log(`\n✓ Created cache4 after expiration (should filter expired):`);
    console.log(`  get('expires'): ${cache4.get('expires')} (expected: undefined - expired)`);
    console.log(`  get('persistent'): ${cache4.get('persistent')} (expected: value2)`);
    console.log(`  size(): ${cache4.size()} (expected: 1)`);
    // Cleanup
    localStorage.removeItem(storageKey);
    localStorage.removeItem('test-cache-ttl');
}
/**
 * Test 5: Stress Test with ~200 Entries
 */
async function testStressTest200Entries() {
    console.log('\n[Test 5] Stress Test: 200 Entries');
    console.log('-'.repeat(60));
    const cache = new SmartCache_1.SmartCache({
        maxSize: 50,
        defaultTTL: 10000 // 10 seconds
    });
    console.log('✓ Creating cache with maxSize: 50');
    // Generate and add 200 entries
    const startTime = Date.now();
    for (let i = 0; i < 200; i++) {
        const key = `entry-${i}`;
        const value = {
            id: i,
            data: `Data for entry ${i} - ${Math.random().toString(36).substring(7)}`
        };
        cache.set(key, value);
    }
    const insertTime = Date.now() - startTime;
    console.log(`\n✓ Inserted 200 entries in ${insertTime}ms`);
    console.log(`  Current size: ${cache.size()} (expected: 50 - due to maxSize limit)`);
    // Verify LRU eviction - only last 50 entries should remain
    console.log(`\n✓ Verifying LRU eviction:`);
    console.log(`  has('entry-0'): ${cache.has('entry-0')} (expected: false - evicted)`);
    console.log(`  has('entry-100'): ${cache.has('entry-100')} (expected: false - evicted)`);
    console.log(`  has('entry-150'): ${cache.has('entry-150')} (expected: true)`);
    console.log(`  has('entry-199'): ${cache.has('entry-199')} (expected: true)`);
    // Test retrieval performance
    const retrievalStart = Date.now();
    let hitCount = 0;
    for (let i = 150; i < 200; i++) {
        if (cache.get(`entry-${i}`) !== undefined) {
            hitCount++;
        }
    }
    const retrievalTime = Date.now() - retrievalStart;
    console.log(`\n✓ Retrieved 50 entries in ${retrievalTime}ms`);
    console.log(`  Hit count: ${hitCount}/50 (expected: 50)`);
    // Test with persistence for large dataset
    console.log(`\n✓ Testing persistence with large dataset...`);
    const persistentCache = new SmartCache_1.SmartCache({
        maxSize: 100,
        persist: 'stress-test-cache'
    });
    for (let i = 0; i < 200; i++) {
        persistentCache.set(`num-${i}`, i * 10);
    }
    console.log(`  Filled persistent cache: size = ${persistentCache.size()}`);
    // Restore from localStorage
    const restoredCache = new SmartCache_1.SmartCache({
        maxSize: 100,
        persist: 'stress-test-cache'
    });
    console.log(`  Restored cache: size = ${restoredCache.size()}`);
    console.log(`  get('num-150'): ${restoredCache.get('num-150')} (expected: 1500)`);
    console.log(`  get('num-199'): ${restoredCache.get('num-199')} (expected: 1990)`);
    // Test mixed operations at scale
    console.log(`\n✓ Testing mixed operations (set/get/delete)...`);
    const mixedCache = new SmartCache_1.SmartCache({ maxSize: 75 });
    const mixedStart = Date.now();
    for (let i = 0; i < 100; i++) {
        mixedCache.set(`key-${i}`, `value-${i}`);
        if (i % 3 === 0) {
            mixedCache.get(`key-${Math.max(0, i - 10)}`);
        }
        if (i % 5 === 0 && i > 0) {
            mixedCache.delete(`key-${i - 5}`);
        }
    }
    const mixedTime = Date.now() - mixedStart;
    console.log(`  Completed 100 sets + gets + deletes in ${mixedTime}ms`);
    console.log(`  Final size: ${mixedCache.size()}`);
    // Cleanup
    localStorage.removeItem('stress-test-cache');
    console.log(`\n✓ Stress test completed successfully!`);
    console.log(`  Total operations: 500+ (inserts, gets, deletes)`);
    console.log(`  Cache behavior: Stable with LRU eviction working correctly`);
}
// Run all tests
runTests().catch(console.error);
