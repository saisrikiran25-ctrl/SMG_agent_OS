import { BackgroundWorker } from './worker';

console.log('🤖 Starting SMB-Agent-OS Background Worker Service...');
const worker = new BackgroundWorker();
worker.start(5000);

process.on('SIGINT', () => {
  worker.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  worker.stop();
  process.exit(0);
});
