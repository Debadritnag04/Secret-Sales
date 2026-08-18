/**
 * Per-key asynchronous mutex to serialize concurrent operations on the same room.
 */
export class Mutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const execute = () => {
        this.locked = true;
        resolve(() => this.release());
      };

      if (!this.locked) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }

  /**
   * Helper to execute an async function under lock
   */
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

export class RoomMutexManager {
  private static locks = new Map<string, Mutex>();

  static getMutex(roomId: string): Mutex {
    let mutex = this.locks.get(roomId);
    if (!mutex) {
      mutex = new Mutex();
      this.locks.set(roomId, mutex);
    }
    return mutex;
  }

  static async runExclusive<T>(roomId: string, fn: () => Promise<T>): Promise<T> {
    const mutex = this.getMutex(roomId);
    return mutex.runExclusive(fn);
  }

  static removeMutex(roomId: string): void {
    this.locks.delete(roomId);
  }
}
