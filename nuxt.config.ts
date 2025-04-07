// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: "2025-04-07",

  app: {
    head: {
      script: [
        {
          src: 'https://telegram.org/js/telegram-web-app.js',
          async: true,
          defer: true
        }
      ]
    }
  }
})