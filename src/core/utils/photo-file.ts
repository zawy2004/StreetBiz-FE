/** Upload limit the backend enforces for every photo (EvidenceFiles.MaxBytes). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * The check the API runs on a public photo (dish, store, avatar), done before uploading so the
 * vendor gets the message at once. Returns the message to show, or undefined when it is fine.
 */
export function photoFileProblem(file: File): string | undefined {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.';
  if (file.size > MAX_PHOTO_BYTES) return 'Ảnh tối đa 5 MB.';
  return undefined;
}
