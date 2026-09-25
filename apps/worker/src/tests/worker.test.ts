import { describe, it, expect } from 'vitest';
import { BackgroundWorker } from '../worker';

describe('Background Worker Service', () => {
  it('instantiates background worker cleanly', () => {
    const worker = new BackgroundWorker();
    expect(worker).toBeDefined();
  });
});
