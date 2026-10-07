"use strict";

function hostingConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const origin = env.FRONTEND_URL || (production ? '' : 'http://localhost:3000');
  let parsed;
  try { parsed = new URL(origin); } catch { /* checked below */ }
  if (!parsed || !['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
    throw new Error('FRONTEND_URL must be one exact http(s) origin, without a trailing slash or path.');
  }
  const hops = env.TRUST_PROXY_HOPS || '0';
  if (!/^[0-9]+$/.test(hops) || !Number.isSafeInteger(Number(hops))) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
  }
  return { origin, trustProxy: Number(hops) };
}

module.exports = { hostingConfig };
