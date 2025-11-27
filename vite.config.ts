import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: {
      plugins: [
        require('tailwindcss/nesting'), // Adicionado para garantir o processamento correto de aninhamento
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
})