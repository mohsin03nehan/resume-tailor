const path = require('node:path')
const { defineConfig } = require('vitest/config')
const { transformWithEsbuild } = require('vite')
const react = require('@vitejs/plugin-react')

const jsxInJavaScript = {
  name: 'jsx-in-javascript',
  enforce: 'pre',
  async transform(code, id) {
    if (!/\/src\/.*\.js$/.test(id)) return null
    return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' })
  },
}

module.exports = defineConfig({
  root: __dirname,
  plugins: [jsxInJavaScript, react.default ? react.default() : react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['e2e/**'],
  },
})
