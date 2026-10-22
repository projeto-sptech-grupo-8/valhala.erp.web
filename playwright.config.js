import { defineConfig } from '@playwright/test'

// E2E contra o backend real. Pré-requisito: API em :8080 e `npm run dev` em :5173.
export default defineConfig({
  testDir: './e2e',
  workers: 1, // um banco só: os testes não podem rodar em paralelo
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/relatorio' }]],
  use: {
    baseURL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    channel: process.env.PW_CHANNEL ?? 'chrome', // usa o Chrome instalado na máquina
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
})
