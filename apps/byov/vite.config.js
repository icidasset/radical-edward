import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import wasm from 'vite-plugin-wasm'

export default defineConfig({
  plugins: [wasm(), nodePolyfills()],
  build: {
    target: 'es2022',
  },
})
