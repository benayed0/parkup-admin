// Generates environment files from CI/CD environment variables before Angular builds.
// Run automatically via the "prebuild" npm script.
// Required env vars: MAPBOX_TOKEN
const { writeFileSync } = require('fs');
const { resolve } = require('path');

const mapboxToken = process.env.MAPBOX_TOKEN;
if (!mapboxToken) {
  console.warn('[set-env] WARNING: MAPBOX_TOKEN is not set — Mapbox will not initialize.');
}

const token = mapboxToken ?? '';

const prod = `export const environment = {
  production: true,
  apiUrl: 'https://parkup-api.onrender.com/api/v1',
  mapboxToken: '${token}',
};
`;

const dev = `export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  mapboxToken: '${token}',
};
`;

const dir = resolve(__dirname, '../src/environments');
writeFileSync(`${dir}/environment.ts`, prod);
writeFileSync(`${dir}/environment.dev.ts`, dev);

console.log('[set-env] Environment files generated.');
