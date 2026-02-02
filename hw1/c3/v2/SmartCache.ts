/**
 * SmartCache - A production-grade caching utility with TTL, LRU eviction, and persistence
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const cache = new SmartCache<string, number>({ maxSize: 100, defaultTTL: 60000 });
 * cache.set('key1', 42);
 * console.log(cache.get('key1')); // 42
 * 
 * // With persistence
 * const persistentCache = new SmartCache<string, string>({ 
 *   maxSize: 50, 
 *   persist: 'myAppCache' 
 * });
 * persistentCache.set('user', 'John', 30000); // 30s TTL
 * 
 * // Later session - data restored from localStorage
 * const restored = new SmartCache<string, string>({ persist: 'myAppCache' });
 * console.log(restored.get('user')); // 'John' (if not expired)
 * ```
 */

/**
 * Options for SmartCache constructor
 */
interface SmartCacheOptions {
  /** Maximum number of entries before LRU eviction kicks in */
  maxSize?: number;
  /** Default TTL in milliseconds for entries without explicit TTL */
  defaultTTL?: number;
  /** Enable persistence to localStorage. If string, use as storage key */
  persist?: boolean | string;
}

/**
 * Serializable cache entry for persistence
 */
interface SerializedEntry<V> {
  value: V;
  expiresAt: number | null;
}

/**
 * SmartCache - Generic cache with LRU eviction, TTL, and optional persistence
 * @template K - Key type (must be string or number for serialization)
 * @template V - Value type
 */
export class SmartCache<K extends string | number = string, V = unknown> {
  private map: Map<K, LRUNode<K, V>>;
  private lruList: DoublyLinkedList<K, V>;
  private readonly maxSize: number;
  private readonly defaultTTL?: number;
  private readonly persistKey?: string;

  constructor(options: SmartCacheOptions = {}) {
    this.maxSize = options.maxSize ?? Infinity;
    this.defaultTTL = options.defaultTTL;
    this.map = new Map();
    this.lruList = new DoublyLinkedList<K, V>();

    // Setup persistence
    if (options.persist) {
      this.persistKey = typeof options.persist === 'string' 
        ? options.persist 
        : 'smartcache_default';
      this.loadFromStorage();
    }
  }

  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param value - Value to store
   * @param ttlMs - Time-to-live in milliseconds (optional)
   */
  set(key: K, value: V, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL;
    const expiresAt = ttl !== undefined ? Date.now() + ttl : null;

    // Check if key already exists
    const existingNode = this.map.get(key);
    if (existingNode) {
      // Update existing entry
      existingNode.value = value;
      existingNode.expiresAt = expiresAt;
      this.lruList.moveToFront(existingNode);
    } else {
      // Evict if at capacity (clean expired first)
      if (this.map.size >= this.maxSize) {
        this.evictLRU();
      }

      // Add new entry
      const newNode = new LRUNode(key, value, expiresAt);
      this.lruList.addToFront(newNode);
      this.map.set(key, newNode);
    }

    this.syncToStorage();
  }

  /**
   * Get a value from the cache
   * @param key - Cache key
   * @returns The cached value or undefined if not found/expired
   */
  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) {
      return undefined;
    }

    // Check expiration
    if (this.isExpired(node)) {
      this.delete(key);
      return undefined;
    }

    // Move to front (most recently used)
    this.lruList.moveToFront(node);
    return node.value;
  }

  /**
   * Delete an entry from the cache
   * @param key - Cache key
   */
  delete(key: K): void {
    const node = this.map.get(key);
    if (node) {
      this.lruList.remove(node);
      this.map.delete(key);
      this.syncToStorage();
    }
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.map.clear();
    this.lruList.clear();
    this.syncToStorage();
  }

  /**
   * Check if a key exists in the cache (and is not expired)
   * @param key - Cache key
   * @returns true if key exists and is not expired
   */
  has(key: K): boolean {
    const node = this.map.get(key);
    if (!node) {
      return false;
    }

    if (this.isExpired(node)) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get the current number of non-expired entries
   * @returns Number of valid entries in cache
   */
  size(): number {
    // Clean up expired entries
    this.cleanExpired();
    return this.map.size;
  }

  /**
   * Check if a node is expired
   */
  private isExpired(node: LRUNode<K, V>): boolean {
    return node.expiresAt !== null && Date.now() > node.expiresAt;
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    // First try to evict expired entries
    this.cleanExpired();

    // If still at capacity, evict LRU
    if (this.map.size >= this.maxSize) {
      const lru = this.lruList.removeTail();
      if (lru) {
        this.map.delete(lru.key);
      }
    }
  }

  /**
   * Clean all expired entries from cache
   */
  private cleanExpired(): void {
    const keysToDelete: K[] = [];
    
    for (const [key, node] of this.map.entries()) {
      if (this.isExpired(node)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const node = this.map.get(key);
      if (node) {
        this.lruList.remove(node);
        this.map.delete(key);
      }
    }
  }

  /**
   * Sync cache to localStorage
   */
  private syncToStorage(): void {
    if (!this.persistKey || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const entries: Record<string, SerializedEntry<V>> = {};
      
      for (const [key, node] of this.map.entries()) {
        // Skip expired entries
        if (!this.isExpired(node)) {
          entries[String(key)] = {
            value: node.value,
            expiresAt: node.expiresAt
          };
        }
      }

      localStorage.setItem(this.persistKey, JSON.stringify(entries));
    } catch (error) {
      console.warn('Failed to persist cache to localStorage:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (!this.persistKey || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.persistKey);
      if (!stored) {
        return;
      }

      const entries: Record<string, SerializedEntry<V>> = JSON.parse(stored);
      const now = Date.now();

      // Restore non-expired entries
      for (const [keyStr, entry] of Object.entries(entries)) {
        // Skip expired entries
        if (entry.expiresAt !== null && now > entry.expiresAt) {
          continue;
        }

        // Convert key back to appropriate type
        const key = (typeof keyStr === 'string' && !isNaN(Number(keyStr)) 
          ? Number(keyStr) 
          : keyStr) as K;

        const node = new LRUNode(key, entry.value, entry.expiresAt);
        this.lruList.addToFront(node);
        this.map.set(key, node);
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }
}

/**
 * Node in the doubly-linked list for LRU tracking
 */
class LRUNode<K, V> {
  constructor(
    public key: K,
    public value: V,
    public expiresAt: number | null,
    public prev: LRUNode<K, V> | null = null,
    public next: LRUNode<K, V> | null = null
  ) {}
}

/**
 * Doubly-linked list for efficient LRU operations
 */
class DoublyLinkedList<K, V> {
  private head: LRUNode<K, V> | null = null;
  private tail: LRUNode<K, V> | null = null;

  /**
   * Add a node to the front (most recently used)
   */
  addToFront(node: LRUNode<K, V>): void {
    node.next = this.head;
    node.prev = null;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Move an existing node to the front
   */
  moveToFront(node: LRUNode<K, V>): void {
    if (node === this.head) {
      return; // Already at front
    }

    this.remove(node);
    this.addToFront(node);
  }

  /**
   * Remove a node from the list
   */
  remove(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
  }

  /**
   * Remove and return the tail node (least recently used)
   */
  removeTail(): LRUNode<K, V> | null {
    if (!this.tail) {
      return null;
    }

    const tailNode = this.tail;
    this.remove(tailNode);
    return tailNode;
  }

  /**
   * Clear the entire list
   */
  clear(): void {
    this.head = null;
    this.tail = null;
  }
}
