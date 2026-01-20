import IORedis from 'ioredis'

// Redis client for local Redis instance
class RedisClient {
  private client: IORedis

  constructor() {
    const host = process.env.REDIS_HOST || 'localhost'
    const port = parseInt(process.env.REDIS_PORT || '6379')
    const password = process.env.REDIS_PASSWORD
    
    this.client = new IORedis({
      host,
      port,
      password,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      }
    })
    
    this.client.on('connect', () => {
      console.log(`✅ Connected to Redis at ${host}:${port}`)
    })
    
    this.client.on('error', (err) => {
      console.error('Redis connection error:', err)
    })
  }

  async setex(key: string, seconds: number, value: any): Promise<void> {
    await this.client.setex(key, seconds, typeof value === 'string' ? value : JSON.stringify(value))
  }

  async set(key: string, value: any): Promise<void> {
    await this.client.set(key, typeof value === 'string' ? value : JSON.stringify(value))
  }

  async get(key: string): Promise<any> {
    const value = await this.client.get(key)
    if (!value) return null
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }

  async lmove(source: string, destination: string, whereFrom: string, whereTo: string): Promise<any> {
    // Use Redis LMOVE command (available in Redis 6.2+)
    const result = await this.client.lmove(source, destination, whereFrom as any, whereTo as any)
    // Return raw result - parsing will be handled by the caller
    return result
  }

  async lrem(key: string, count: number, value: any): Promise<number> {
    return await this.client.lrem(key, count, typeof value === 'string' ? value : JSON.stringify(value))
  }

  async rpush(key: string, ...values: any[]): Promise<number> {
    const serializedValues = values.map(v => typeof v === 'string' ? v : JSON.stringify(v))
    return await this.client.rpush(key, ...serializedValues)
  }

  async lpush(key: string, ...values: any[]): Promise<number> {
    const serializedValues = values.map(v => typeof v === 'string' ? v : JSON.stringify(v))
    return await this.client.lpush(key, ...serializedValues)
  }

  async brpop(key: string, timeout: number): Promise<[string, string] | null> {
    return await this.client.brpop(key, timeout)
  }

  async llen(key: string): Promise<number> {
    return await this.client.llen(key)
  }

  // Gracefully close the Redis connection
  async quit(): Promise<void> {
    await this.client.quit()
  }

  // Get the underlying Redis client for direct access if needed
  getClient(): IORedis {
    return this.client
  }
}

// Lazy initialization to avoid connecting during build
let redisInstance: RedisClient | null = null

function getRedisInstance(): RedisClient {
  if (!redisInstance) {
    redisInstance = new RedisClient()
  }
  return redisInstance
}

export const redis = {
  setex: async (key: string, seconds: number, value: any) => {
    return getRedisInstance().setex(key, seconds, value)
  },
  set: async (key: string, value: any) => {
    return getRedisInstance().set(key, value)
  },
  get: async (key: string) => {
    return getRedisInstance().get(key)
  },
  del: async (key: string) => {
    return getRedisInstance().del(key)
  },
  exists: async (key: string) => {
    return getRedisInstance().exists(key)
  },
  lmove: async (source: string, destination: string, whereFrom: string, whereTo: string) => {
    return getRedisInstance().lmove(source, destination, whereFrom, whereTo)
  },
  lrem: async (key: string, count: number, value: any) => {
    return getRedisInstance().lrem(key, count, value)
  },
  rpush: async (key: string, ...values: any[]) => {
    return getRedisInstance().rpush(key, ...values)
  },
  lpush: async (key: string, ...values: any[]) => {
    return getRedisInstance().lpush(key, ...values)
  },
  brpop: async (key: string, timeout: number) => {
    return getRedisInstance().brpop(key, timeout)
  },
  llen: async (key: string) => {
    return getRedisInstance().llen(key)
  },
  quit: async () => {
    return getRedisInstance().quit()
  },
  getClient: () => {
    return getRedisInstance().getClient()
  }
}