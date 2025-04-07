<template>
  <div>
    <main>
        <ClientOnly>
            <slot />
        </ClientOnly>
    </main>
  </div>
</template>

<script setup>
    useHead({
        title: 'Ani-Fit',
        meta: [
            { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
            { name: 'format-detection', content: 'telephone=no' }
        ],
        script: [
            { src: 'https://telegram.org/js/telegram-web-app.js', defer: true, async: true, }
        ]
    })
</script>
