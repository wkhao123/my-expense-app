import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: "./", // <--- 加上这一行！意思是使用相对路径
  plugins: [react()],
});