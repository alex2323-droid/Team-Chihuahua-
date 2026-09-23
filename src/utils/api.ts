/**
 * Returns the absolute or relative API URL depending on where the app is being hosted.
 * If running on a static hosting provider like Vercel, redirects backend API requests
 * to the fully-functional preview server.
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  const origin = window.location.origin;

  // If running locally or on the main preview environment, use relative path
  if (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('us-east1.run.app')
  ) {
    return cleanPath;
  }

  // Fallback to our active high-availability preview backend server
  return `https://ais-pre-umamnytuupe5onpcgzkyqy-631218923693.us-east1.run.app${cleanPath}`;
}
