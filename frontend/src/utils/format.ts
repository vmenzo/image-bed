import dayjs from 'dayjs';

export function formatBytes(bytes = 0) {
  if (bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatDate(value?: string) {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

export function visibilityLabel(value: string) {
  return (
    {
      PRIVATE: '私有',
      PUBLIC: '公开',
      UNLISTED: '隐藏链接',
    }[value] ?? value
  );
}

export function statusLabel(value: string) {
  return (
    {
      PENDING: '待上传',
      PROCESSING: '处理中',
      READY: '可访问',
      FAILED: '失败',
      DELETED: '已删除',
    }[value] ?? value
  );
}
