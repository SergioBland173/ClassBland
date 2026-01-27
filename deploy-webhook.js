const http = require('http')
const crypto = require('crypto')
const { exec } = require('child_process')

// Configura un secreto seguro (lo mismo que pondrás en GitHub)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'tu-secreto-seguro-aqui'
const PORT = 9000

// Ruta del proyecto
const PROJECT_PATH = __dirname

function verifySignature(payload, signature) {
  if (!signature) return false
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
  const digest = 'sha256=' + hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

function deploy() {
  console.log('[Deploy] Iniciando deployment...')

  const commands = [
    'git pull origin main',
    'npm install',
    'cd server && npm install',
    'pm2 restart classbland-server'
  ].join(' && ')

  exec(commands, { cwd: PROJECT_PATH }, (error, stdout, stderr) => {
    if (error) {
      console.error('[Deploy] Error:', error.message)
      console.error('[Deploy] stderr:', stderr)
      return
    }
    console.log('[Deploy] Exitoso:', stdout)
  })
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/deploy') {
    let body = ''

    req.on('data', chunk => { body += chunk.toString() })

    req.on('end', () => {
      const signature = req.headers['x-hub-signature-256']

      // Verificar firma de GitHub
      if (!verifySignature(body, signature)) {
        console.log('[Webhook] Firma invalida')
        res.writeHead(401)
        res.end('Unauthorized')
        return
      }

      const payload = JSON.parse(body)

      // Solo hacer deploy en push a main
      if (payload.ref === 'refs/heads/main') {
        console.log('[Webhook] Push detectado en main, iniciando deploy...')
        deploy()
        res.writeHead(200)
        res.end('Deploy iniciado')
      } else {
        console.log('[Webhook] Push a otra rama, ignorando:', payload.ref)
        res.writeHead(200)
        res.end('Ignorado - no es main')
      }
    })
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(PORT, () => {
  console.log(`[Webhook] Servidor escuchando en puerto ${PORT}`)
})
