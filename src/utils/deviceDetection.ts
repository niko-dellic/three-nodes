/**
 * Utility functions for detecting device capabilities
 */

/**
 * Detects if the device is a touch-capable device (mobile/tablet)
 * This checks for touch events support and excludes laptops with touchscreens
 */
export function isTouchDevice(): boolean {
  // Check for touch support
  const hasTouchSupport =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0;

  // Additional check: mobile user agent patterns
  const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // If it's a mobile user agent, definitely touch device
  if (mobileUserAgent) {
    return true;
  }

  // If has touch support but not mobile UA, check if it's likely a laptop with touchscreen
  // We can use pointer media query to distinguish
  if (hasTouchSupport) {
    // Check if primary input is coarse (finger/stylus) vs fine (mouse)
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      return true;
    }
  }

  return false;
}

/**
 * Detects if the device is mobile (phone/small tablet)
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Detects if the device is a tablet
 */
export function isTablet(): boolean {
  return /iPad|Android/i.test(navigator.userAgent) && !isMobile();
}
