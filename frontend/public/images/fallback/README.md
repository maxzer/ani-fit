# Запасные изображения

Эта папка содержит запасные изображения, которые будут использоваться при ошибках загрузки основных изображений.

## Изображение по умолчанию

- `default.jpg` - стандартное запасное изображение

## Использование

В компонентах используйте обработчик ошибок из composable `useLocalImages`:

```vue
<template>
  <img 
    :src="imagePath" 
    @error="(e) => handleImageError(e, '/images/fallback/default.jpg')"
    alt="Описание изображения"
  />
</template>

<script setup>
import { useLocalImages } from '~/composables/useLocalImages';

const { getCategoryImage, handleImageError } = useLocalImages();
const imagePath = getCategoryImage('cards', 'image.jpg');
</script>
``` 