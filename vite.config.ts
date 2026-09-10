import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      // Upstream MIT: https://github.com/nicosandller/easy-floorplan
      'easy-floorplan': path.resolve('E:/easy-floorplan/src'),
      lit: path.resolve(root, 'node_modules/lit'),
      'lit/decorators.js': path.resolve(root, 'node_modules/lit/decorators.js'),
      'lit/directive.js': path.resolve(root, 'node_modules/lit/directive.js'),
      'lit/directives/repeat.js': path.resolve(root, 'node_modules/lit/directives/repeat.js'),
      'lit/directives/keyed.js': path.resolve(root, 'node_modules/lit/directives/keyed.js'),
      'lit/directives/guard.js': path.resolve(root, 'node_modules/lit/directives/guard.js'),
      'custom-card-helpers': path.resolve(root, 'node_modules/custom-card-helpers'),
    },
    dedupe: ['lit', 'custom-card-helpers'],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    fs: {
      allow: [root, 'E:/easy-floorplan'],
    },
  },
  optimizeDeps: {
    include: ['lit', 'lit/decorators.js', 'custom-card-helpers'],
  },
})
