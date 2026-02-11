import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

const certKeyPath = path.resolve(__dirname, '../certificate/server.key')
const certCrtPath = path.resolve(__dirname, '../certificate/server.crt')
const hasCerts = fs.existsSync(certKeyPath) && fs.existsSync(certCrtPath)
const devPort = Number(process.env.VITE_DEV_PORT) || 5173

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: devPort,
    strictPort: true,
    ...(hasCerts
      ? {
          https: {
            key: fs.readFileSync(certKeyPath),
            cert: fs.readFileSync(certCrtPath)
          }
        }
      : {})
  }
})
