// Reserved slugs that would collide with Next.js routes or API paths
export const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "static",
  "favicon",
  "robots",
  "cron",
  "upload",
  "create",
]);

// Limits
export const MAX_SECTIONS_PER_PAGE = 20;
export const MAX_FILES_PER_SECTION = 5;
export const MAX_SECTION_CONTENT_BYTES = 102_400; // 100 KB
export const MAX_FILE_SIZE_BYTES = 52_428_800;    // 50 MB

// Slug validation regex
export const SLUG_REGEX = /^[a-zA-Z0-9_-]{3,50}$/;
