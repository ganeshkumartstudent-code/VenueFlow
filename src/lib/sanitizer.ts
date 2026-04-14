/**
 * Utility for sanitizing user inputs before they are processed by AI
 */
export const sanitizeInput = (text: string, maxLength: number = 500): string => {
  if (!text) return "";

  // 1. Strip HTML tags to prevent XSS and tag-based injection
  let sanitized = text.replace(/<[^>]*>?/gm, '');

  // 2. Character length limit
  sanitized = sanitized.substring(0, maxLength);

  // 3. Block common prompt injection patterns
  const injectionPatterns = [
    /ignore previous instructions/i,
    /system prompt/i,
    /you are now a/i,
    /forget everything/i,
    /output the internal/i,
    /reveal your secret/i,
    /execute command/i
  ];

  const hasInjection = injectionPatterns.some(pattern => pattern.test(sanitized));
  if (hasInjection) {
    throw new Error("Security Alert: Prompt injection attempt detected.");
  }

  return sanitized.trim();
};
