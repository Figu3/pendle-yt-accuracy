import { promises as fs } from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'pendle');
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const entry: CacheEntry<T> = JSON.parse(content);
    
    const age = Date.now() - entry.timestamp;
    if (age > CACHE_TTL) {
      // Cache expired
      return null;
    }
    
    return entry.data;
  } catch (error) {
    // Cache miss or error
    return null;
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    // Ensure cache directory exists
    await fs.mkdir(CACHE_DIR, { recursive: true });
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    };
    
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

export async function clearCache(): Promise<void> {
  try {
    const files = await fs.readdir(CACHE_DIR);
    await Promise.all(
      files.map(file => fs.unlink(path.join(CACHE_DIR, file)))
    );
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}
