# Изображения для карточек

В этой папке содержатся изображения для карточек на главной странице.

## Текущие изображения

- `massage.jpg` - изображение для карточки "Массаж"
- `pool.jpg` - изображение для карточки "Занятие в бассейне"
- `pool-rent.jpg` - изображение для карточки "Аренда бассейна"
- `trainer.jpg` - изображение для карточки "Занятие с хендлером"

## Скачивание реальных изображений

Для замены временных плейсхолдеров на реальные изображения, можно скачать оригинальные изображения с Unsplash:

1. Массаж: https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b
   ```
   curl -o frontend/public/images/cards/massage.jpg "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
   ```

2. Занятие в бассейне: https://images.unsplash.com/photo-1490645935967-10de6ba17061
   ```
   curl -o frontend/public/images/cards/pool.jpg "https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
   ```

3. Аренда бассейна: https://images.unsplash.com/photo-1517836357463-d25dfeac3438
   ```
   curl -o frontend/public/images/cards/pool-rent.jpg "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
   ```

4. Занятие с хендлером: https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b
   ```
   curl -o frontend/public/images/cards/trainer.jpg "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
   ```

## Требования к изображениям

- Рекомендуемый размер: 800x600px
- Формат: JPG или WebP для лучшей производительности
- Названия файлов должны соответствовать соглашению: все строчные буквы, дефисы вместо пробелов 