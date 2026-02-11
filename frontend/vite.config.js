import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
const certKeyPath = path.resolve(__dirname, '../certificate/server.key')
const certCrtPath = path.resolve(__dirname, '../certificate/server.crt')
const hasCerts = fs.existsSync(certKeyPath) && fs.existsSync(certCrtPath)

export default defineConfig({
  plugins: [vue()],
  server: hasCerts
    ? {
        https: {
          key: fs.readFileSync(certKeyPath),
          cert: fs.readFileSync(certCrtPath)
        }
      }
    : undefined
})
