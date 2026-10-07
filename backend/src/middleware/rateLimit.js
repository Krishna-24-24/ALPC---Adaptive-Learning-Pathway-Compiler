'use strict';

/**
 * A small in-memory rate limiter: at most `max` requests per `windowMs` from
 * one client (by IP). Enough for one backend process; behind several
 * processes, put the limit in the proxy instead.
 *
 * The compile and check routes need no login and start child processes, so
 * without a limit one client could keep the machine busy.
 */
function rateLimit({ windowMs, max, name }) {
  const hits = new Map(); // ip -> timestamps inside the window

  const sweep = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [ip, times] of hits) {
      const kept = times.filter(t => t > cutoff);
      if (kept.length) hits.set(ip, kept); else hits.delete(ip);
    }
  }, windowMs);
  sweep.unref();

  return function limit(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const times = (hits.get(ip) || []).filter(t => t > now - windowMs);
    if (times.length >= max) {
      const retry = Math.ceil((times[0] + windowMs - now) / 1000);
      res.set('Retry-After', String(retry));
      return res.status(429).json({
        error: `Too many ${name} requests. Wait ${retry} second${retry === 1 ? '' : 's'} and try again.`,
      });
    }
    times.push(now);
    hits.set(ip, times);
    next();
  };
}

module.exports = { rateLimit };
