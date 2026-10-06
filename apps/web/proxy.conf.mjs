// The dev server passes /api to the API, so the app talks to one address,
// like in the cluster where the ingress does it. In Docker the API is
// http://api:3000, set by compose.yaml.
import process from 'node:process';

export default {
  '/api': {
    target: process.env.API_PROXY_TARGET ?? 'http://localhost:41001',
  },
};
