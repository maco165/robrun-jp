/** サイト内の道を base (/robrun-jp/) 付きの URL にする。path は先頭の / 無しで、末尾は / */
export function url(path = ''): string {
  return import.meta.env.BASE_URL + path;
}
