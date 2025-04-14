/**
 * Утилита для получения путей к локальным изображениям
 */

/**
 * Получает URL для локального изображения
 * @param path Путь к изображению относительно директории public/images
 * @returns Полный путь к изображению
 */
export function useLocalImages() {
  
  /**
   * Возвращает путь к изображению в директории services
   */
  const getServiceImage = (imageName: string): string => {
    // Проверяем, что файл имеет расширение
    if (!imageName.includes('.')) {
      imageName = `${imageName}.jpg`; // Добавляем расширение по умолчанию
    }
    
    return `/images/services/${imageName}`;
  };
  
  /**
   * Возвращает путь к изображению в указанной категории
   */
  const getCategoryImage = (category: string, imageName: string): string => {
    // Проверяем, что файл имеет расширение
    if (!imageName.includes('.')) {
      imageName = `${imageName}.jpg`; // Добавляем расширение по умолчанию
    }
    
    return `/images/${category}/${imageName}`;
  };
  
  /**
   * Проверяет, является ли URL внешним
   */
  const isExternalUrl = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://');
  };
  
  /**
   * Конвертирует внешний URL в локальный путь, если это возможно
   */
  const convertToLocalUrl = (url: string, category: string = 'services', defaultImage: string = 'default.jpg'): string => {
    if (!isExternalUrl(url)) {
      return url; // Уже локальный путь
    }
    
    // Извлекаем имя файла из URL
    const parts = url.split('/');
    const filename = parts[parts.length - 1].split('?')[0];
    
    // Проверяем наличие расширения
    if (filename.includes('.')) {
      return `/images/${category}/${filename}`;
    }
    
    // Если нет расширения, используем изображение по умолчанию
    return `/images/${category}/${defaultImage}`;
  };
  
  /**
   * Обработчик ошибки загрузки изображения
   * @param event Событие ошибки
   * @param fallbackImage Путь к запасному изображению
   */
  const handleImageError = (event: Event, fallbackImage: string = '/images/fallback/default.jpg'): void => {
    const target = event.target as HTMLImageElement;
    target.src = fallbackImage;
  };
  
  return {
    getServiceImage,
    getCategoryImage,
    isExternalUrl,
    convertToLocalUrl,
    handleImageError
  };
}

export default useLocalImages; 