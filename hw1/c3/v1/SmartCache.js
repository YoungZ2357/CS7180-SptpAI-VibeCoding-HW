"use strict";
/**
 * SmartCache - A production-grade caching utility with TTL, LRU eviction, and persistence
 *
 * @example
 * ```typescript
 * // Basic usage
 * const cache = new SmartCache<string, number>({ maxSize: 100, defaultTTL: 60000 });
 * cache.set('key1', 42);
 * const value = cache.get('key1'); // 42
 *
 * // With persistence
 * const persistentCache = new SmartCache<string, string>({
 *   maxSize: 50,
 *   persist: 'my-cache-key'
 * });
 * persistentCache.set('user', 'John', 5000); // 5 second TTL
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartCache = void 0;
/**
 * Node in doubly-linked list for LRU tracking
 */
class LRUNode {
    constructor(key, prev = null, next = null) {
        this.key = key;
        this.prev = prev;
        this.next = next;
    }
}
/**
 * SmartCache - Generic cache with TTL, LRU eviction, and optional persistence
 */
class SmartCache {
    constructor(options) {
        this.options = {
            maxSize: options.maxSize,
            defaultTTL: options.defaultTTL ?? 0, // 0 means no default TTL
            persist: options.persist ?? false,
        };
        this.cache = new Map();
        this.lruMap = new Map();
        this.head = null;
        this.tail = null;
        // Set up storage key
        if (typeof this.options.persist === 'string') {
            this.storageKey = this.options.persist;
        }
        else if (this.options.persist === true) {
            this.storageKey = 'smart-cache-default';
        }
        else {
            this.storageKey = '';
        }
        // Load from localStorage if persistence is enabled
        if (this.options.persist) {
            this.loadFromStorage();
        }
    }
    /**
     * Set a value in the cache with optional TTL
     */
    set(key, value, ttlMs) {
        // Remove expired entry if it exists
        if (this.cache.has(key)) {
            this.removeFromLRU(key);
        }
        // Evict LRU if at capacity
        if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }
        // Calculate expiration time
        const ttl = ttlMs ?? this.options.defaultTTL;
        const expiresAt = ttl > 0 ? Date.now() + ttl : null;
        // Store entry
        const entry = {
            value,
            expiresAt,
            lastUsed: Date.now(),
        };
        this.cache.set(key, entry);
        this.addToLRU(key);
        // Persist to storage
        if (this.options.persist) {
            this.saveToStorage();
        }
    }
    /**
     * Get a value from the cache
     * Returns undefined if key doesn't exist or is expired
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        // Check expiration
        if (this.isExpired(entry)) {
            this.delete(key);
            return undefined;
        }
        // Update last used time and move to front (most recently used)
        entry.lastUsed = Date.now();
        this.moveToFront(key);
        return entry.value;
    }
    /**
     * Delete a key from the cache
     */
    delete(key) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
            this.removeFromLRU(key);
            if (this.options.persist) {
                this.saveToStorage();
            }
        }
    }
    /**
     * Clear all entries from the cache
     */
    clear() {
        this.cache.clear();
        this.lruMap.clear();
        this.head = null;
        this.tail = null;
        if (this.options.persist) {
            this.saveToStorage();
        }
    }
    /**
     * Check if a key exists and is not expired
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        if (this.isExpired(entry)) {
            this.delete(key);
            return false;
        }
        return true;
    }
    /**
     * Get the current number of non-expired entries
     */
    size() {
        // Clean up expired entries
        this.cleanExpired();
        return this.cache.size;
    }
    /**
     * Check if an entry is expired
     */
    isExpired(entry) {
        if (entry.expiresAt === null) {
            return false;
        }
        return Date.now() > entry.expiresAt;
    }
    /**
     * Remove expired entries from cache
     */
    cleanExpired() {
        const keysToDelete = [];
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                keysToDelete.push(key);
            }
        }
        for (const key of keysToDelete) {
            this.delete(key);
        }
    }
    /**
     * Add a key to the front of LRU list (most recently used)
     */
    addToLRU(key) {
        const node = new LRUNode(key);
        this.lruMap.set(key, node);
        if (!this.head) {
            // First node
            this.head = node;
            this.tail = node;
        }
        else {
            // Add to front
            node.next = this.head;
            this.head.prev = node;
            this.head = node;
        }
    }
    /**
     * Remove a key from the LRU list
     */
    removeFromLRU(key) {
        const node = this.lruMap.get(key);
        if (!node)
            return;
        // Update links
        if (node.prev) {
            node.prev.next = node.next;
        }
        else {
            // Node is head
            this.head = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        }
        else {
            // Node is tail
            this.tail = node.prev;
        }
        this.lruMap.delete(key);
    }
    /**
     * Move a key to the front of LRU list (most recently used)
     */
    moveToFront(key) {
        const node = this.lruMap.get(key);
        if (!node || node === this.head)
            return;
        // Remove from current position
        if (node.prev) {
            node.prev.next = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        }
        else {
            // Node was tail
            this.tail = node.prev;
        }
        // Add to front
        node.prev = null;
        node.next = this.head;
        if (this.head) {
            this.head.prev = node;
        }
        this.head = node;
    }
    /**
     * Evict the least recently used entry
     */
    evictLRU() {
        if (!this.tail)
            return;
        // First, try to evict expired entries
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                this.delete(key);
                return;
            }
        }
        // If no expired entries, evict LRU
        const lruKey = this.tail.key;
        this.delete(lruKey);
    }
    /**
     * Save cache to localStorage
     */
    saveToStorage() {
        if (!this.storageKey)
            return;
        try {
            const data = {};
            for (const [key, entry] of this.cache.entries()) {
                // Skip expired entries
                if (!this.isExpired(entry)) {
                    data[String(key)] = entry;
                }
            }
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
        catch (error) {
            console.error('Failed to save cache to localStorage:', error);
        }
    }
    /**
     * Load cache from localStorage
     */
    loadFromStorage() {
        if (!this.storageKey)
            return;
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored)
                return;
            const data = JSON.parse(stored);
            // Restore entries, filtering out expired ones
            for (const [keyStr, entry] of Object.entries(data)) {
                // Parse key back to correct type
                const key = this.parseKey(keyStr);
                // Skip expired entries
                if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
                    continue;
                }
                this.cache.set(key, entry);
                this.addToLRU(key);
            }
        }
        catch (error) {
            console.error('Failed to load cache from localStorage:', error);
        }
    }
    /**
     * Parse string key back to correct type
     */
    parseKey(keyStr) {
        // Try to infer original type
        if (keyStr === 'true' || keyStr === 'false') {
            return (keyStr === 'true');
        }
        const asNumber = Number(keyStr);
        if (!isNaN(asNumber) && keyStr === String(asNumber)) {
            return asNumber;
        }
        return keyStr;
    }
}
exports.SmartCache = SmartCache;
