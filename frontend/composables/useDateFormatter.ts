export const useDateFormatter = () => {
  // Функция для форматирования только даты
  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '';
    
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Функция для форматирования только времени
  const formatTime = (date: string | Date | null | undefined): string => {
    if (!date) return '';
    
    const d = new Date(date);
    return d.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Функция для получения текста статуса
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'confirmed': return 'Подтверждено';
      case 'cancelled': return 'Отменено';
      case 'pending': return 'В ожидании';
      default: return status;
    }
  };

  // Функция для получения имени специалиста из staffInfo
  const getStaffName = (staffInfo: any): string => {
    if (!staffInfo) return '';
    
    // Если staffInfo - строка, пытаемся распарсить JSON
    if (typeof staffInfo === 'string') {
      try {
        staffInfo = JSON.parse(staffInfo);
      } catch (e) {
        return staffInfo;
      }
    }
    
    if (staffInfo.name) return staffInfo.name;
    if (staffInfo.id === 'any') return 'Будет назначен';
    
    return '';
  };

  return {
    formatDate,
    formatTime,
    getStatusText,
    getStaffName
  };
}; 