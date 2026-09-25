import { app } from './app';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 SMB-Agent-OS API Server running on port ${PORT}`);
});
