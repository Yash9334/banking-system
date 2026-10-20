import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import net from 'node:net'

/**
 * Dev/preview server configuration.
 *
 * WHY A PROXY?
 * None of the backend services (or the API Gateway) configure CORS, so a browser
 * page on http://localhost:5173 cannot call http://localhost:8080 directly.
 * The Vite dev server forwards /api/* to the backend, so the browser only ever
 * talks to its own origin and no backend change is needed.
 *
 * Two modes (VITE_API_MODE / API_MODE in .env):
 *   gateway (default) -> /api/**  -> API Gateway (8080)
 *   direct            -> /api/v1/accounts     -> Account Service (8081)
 *                        /api/v1/transactions -> Transaction Service (8082)
 *                        /api/v1/payments     -> Payment Service (8083)
 */

function tcpProbe(host, port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    const done = (ok) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

// Dev-only helper: lets the UI show whether Kafka / Redis / MySQL ports accept
// TCP connections (browsers cannot open raw TCP sockets themselves).
function infraProbePlugin(targets) {
  const handler = async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/__probe/')) return next()
    const name = req.url.slice('/__probe/'.length).split('?')[0]
    const target = targets[name]
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    if (!target) {
      res.statusCode = 404
      return res.end(JSON.stringify({ error: 'unknown probe target' }))
    }
    const reachable = await tcpProbe(target.host, target.port)
    res.end(JSON.stringify({ name, reachable, target: `${target.host}:${target.port}` }))
  }
  return {
    name: 'infra-probe',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const gateway = env.GATEWAY_URL || 'http://localhost:8080'
  const account = env.ACCOUNT_SERVICE_URL || 'http://localhost:8081'
  const transaction = env.TRANSACTION_SERVICE_URL || 'http://localhost:8082'
  const payment = env.PAYMENT_SERVICE_URL || 'http://localhost:8083'
  const fraud = env.FRAUD_SERVICE_URL || 'http://localhost:8084'
  const notification = env.NOTIFICATION_SERVICE_URL || 'http://localhost:8085'
  const apiMode = (env.API_MODE || 'gateway').toLowerCase()

  // If a target is down, answer with a small JSON body so the UI can say WHICH service is unreachable.
  const makeProxy = (target, extra = {}) => ({
    target,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('error', (err, _req, res) => {
        if (res && typeof res.writeHead === 'function' && !res.headersSent) {
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ proxyError: true, target, code: err.code, message: `Cannot reach ${target}` }))
        }
      })
    },
    ...extra,
  })

  const health = (target) =>
    makeProxy(target, { rewrite: () => '/actuator/health' })

  const apiProxy =
    apiMode === 'direct'
      ? {
          '/api/v1/accounts': makeProxy(account),
          '/api/v1/transactions': makeProxy(transaction),
          '/api/v1/payments': makeProxy(payment),
        }
      : { '/api': makeProxy(gateway) }

  const proxy = {
    ...apiProxy,
    '^/_health/gateway$': health(gateway),
    '^/_health/account$': health(account),
    '^/_health/transaction$': health(transaction),
    '^/_health/payment$': health(payment),
    '^/_health/fraud$': health(fraud),
    '^/_health/notification$': health(notification),
  }

  const infra = {
    kafka: { host: env.KAFKA_HOST || 'localhost', port: Number(env.KAFKA_PORT || 9092) },
    redis: { host: env.REDIS_HOST || 'localhost', port: Number(env.REDIS_PORT || 6379) },
    mysql: { host: env.MYSQL_HOST || 'localhost', port: Number(env.MYSQL_PORT || 3306) },
  }

  return {
    plugins: [react(), infraProbePlugin(infra)],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    define: {
      __API_MODE__: JSON.stringify(apiMode),
    },
  }
})
