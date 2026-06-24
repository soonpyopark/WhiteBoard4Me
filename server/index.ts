import { HOSTNAME, PORT } from '../config/ports.ts';
import { startServer } from './startServer.ts';

await startServer({ port: PORT }).then((port) => {
  const localUrl = `http://localhost:${port}`;
  if (HOSTNAME === '0.0.0.0') {
    console.log(`My-local-whiteboard running at ${localUrl} (network: http://<this-pc-ip>:${port})`);
  } else {
    console.log(`My-local-whiteboard running at http://${HOSTNAME}:${port}`);
  }
});
