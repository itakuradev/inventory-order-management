/** YYYY-MM-DD を YYYY/MM/DD で表示する。 */
export function formatDate(isoDate: string): string {
  return isoDate.replaceAll('-', '/');
}

/** ISO 8601 を日本時間の YYYY/MM/DD HH:mm で表示する。 */
export function formatDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('year')}/${value('month')}/${value('day')} ${value('hour')}:${value('minute')}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ja-JP');
}

/** 入力欄の初期値に使う本日の日付（YYYY-MM-DD）。 */
export function todayIsoDate(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}
