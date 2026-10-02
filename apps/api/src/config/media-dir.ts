/** Directory for media files. In Docker and in the cluster it is a volume. */
export function mediaDirFromEnv(value = process.env.MEDIA_DIR): string {
  return value || '/app/media';
}
