const { spawn } = require('child_process')
const path = require('path')

const projectRoot = __dirname
const tsxPath = path.join(projectRoot, 'node_modules', '.bin', 'tsx.cmd')
const serverPath = path.join(projectRoot, 'server', 'index.ts')

const child = spawn(tsxPath, [serverPath], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true
})

child.on('error', (err) => {
  console.error('Error al iniciar servidor:', err)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code || 0)
})
