/** .env의 VITE_HOME_URL (미설정·주석 시 undefined) */
export function getHomeUrl(): string | undefined {
  const url = import.meta.env.VITE_HOME_URL?.trim();
  return url || undefined;
}

/** 홈 URL이 있으면 이동, 없으면 앱 첫 화면 콜백 실행 */
export function navigateHome(onAppHome?: () => void): void {
  const url = getHomeUrl();
  if (url) {
    window.location.href = url;
    return;
  }
  onAppHome?.();
}
