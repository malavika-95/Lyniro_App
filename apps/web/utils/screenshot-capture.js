/**
 * Screenshot capture utility that periodically captures the app and sends to parent.
 */

let screenshotInterval = null;
let lastScreenshotTime = 0;
let hasInitialScreenshot = false;
const SCREENSHOT_INTERVAL = 10 * 60 * 1000;
const MIN_SCREENSHOT_GAP = 30 * 1000;

async function captureScreenshot(force = false) {
  if (typeof window === 'undefined') return;
  if (!window.parent || window.parent === window) return;
  const now = Date.now();
  if (!force && now - lastScreenshotTime < MIN_SCREENSHOT_GAP) return;

  try {
    const html2canvas = (await import('html2canvas')).default;
    const targetElement = document.querySelector('main') || document.body;
    const canvas = await html2canvas(targetElement, {
      useCORS: true, allowTaint: true, backgroundColor: '#ffffff',
      scale: 1, logging: false, imageTimeout: 5000, removeContainer: true,
    });
    const dataUrl = canvas.toDataURL('image/png', 0.8);
    try {
      if (window.parent && window.parent !== window && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage({ type: 'appgen:screenshot', data: dataUrl }, '*');
        lastScreenshotTime = now;
        hasInitialScreenshot = true;
      }
    } catch (err) { console.error('[AppGen] Failed to send screenshot to parent:', err); }
  } catch (error) { console.error('[AppGen] Failed to capture screenshot:', error); }
}

function initScreenshotCapture() {
  if (typeof window === 'undefined') return;
  if (!window.parent || window.parent === window) return;

  try {
    if (typeof window.parent.postMessage === 'function') {
      window.parent.postMessage({ type: 'appgen:screenshotReady' }, '*');
    }
  } catch { /* ignore */ }

  const captureInitialScreenshot = () => {
    if (hasInitialScreenshot) return;
    if (document.readyState === 'complete') {
      setTimeout(() => captureScreenshot(true), 2000);
    } else {
      window.addEventListener('load', () => setTimeout(() => captureScreenshot(true), 2000));
    }
  };

  const startInterval = () => {
    if (screenshotInterval) return;
    screenshotInterval = setInterval(() => captureScreenshot(false), SCREENSHOT_INTERVAL);
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    captureInitialScreenshot();
    startInterval();
  } else {
    window.addEventListener('DOMContentLoaded', () => { captureInitialScreenshot(); startInterval(); });
  }

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'appgen:captureScreenshot') captureScreenshot(true);
  });
}

if (typeof window !== 'undefined') { initScreenshotCapture(); }

export { captureScreenshot, initScreenshotCapture };
