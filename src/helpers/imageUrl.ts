/**
 * Utility to add cache-busting to image URLs
 * This ensures that when images are updated, the browser fetches the new version
 */
export function getCachebustedUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  
  // If URL is already from the API with a v parameter, we'll add another one with current time
  // to force browser refresh
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

/**
 * Parse and clean URL for use with React img src
 */
export function getImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return getCachebustedUrl(url) || undefined;
}
