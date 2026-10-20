/**
 * Hands a downloaded file to the browser's save flow. Files that need the bearer token are
 * fetched as a Blob first, since a plain link would reach the API without it.
 */
export function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick: revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
