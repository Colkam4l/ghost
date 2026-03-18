/**
 * stealth.js — Native Win32 display-affinity helper
 *
 * Directly calls SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE) via FFI
 * to make the GHOST window truly invisible during entire-screen sharing.
 */

const koffi = require('koffi');

// Win32 display affinity constants
const WDA_NONE                = 0x00000000;
const WDA_EXCLUDEFROMCAPTURE  = 0x00000011;  // Truly invisible (Win10 2004+)

// Load user32.dll — treat HWND as a pointer-sized integer
const user32 = koffi.load('user32.dll');
const SetWindowDisplayAffinity = user32.func(
  'bool __stdcall SetWindowDisplayAffinity(uintptr_t hwnd, uint32_t affinity)'
);

/**
 * Read the HWND integer from Electron's native handle buffer.
 */
function readHwnd(browserWindow) {
  const buf = browserWindow.getNativeWindowHandle();
  // 64-bit Windows returns 8-byte buffer, 32-bit returns 4-byte
  if (buf.length >= 8) {
    // Use BigInt but convert to Number (HWND fits in safe integer range)
    return Number(buf.readBigUInt64LE());
  }
  return buf.readUInt32LE();
}

/**
 * Apply WDA_EXCLUDEFROMCAPTURE to the given BrowserWindow.
 * Makes it completely invisible to all screen-capture APIs.
 */
function applyStealthAffinity(browserWindow) {
  if (!browserWindow || browserWindow.isDestroyed()) return false;

  try {
    const hwnd = readHwnd(browserWindow);
    const ok = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);

    if (!ok) {
      console.error('[STEALTH] SetWindowDisplayAffinity failed for hwnd:', hwnd);
      return false;
    }

    console.log('[STEALTH] WDA_EXCLUDEFROMCAPTURE applied — window is invisible to capture');
    return true;
  } catch (err) {
    console.error('[STEALTH] Exception:', err.message);
    return false;
  }
}

/**
 * Remove the display affinity (make window capturable again).
 */
function removeStealthAffinity(browserWindow) {
  if (!browserWindow || browserWindow.isDestroyed()) return false;

  try {
    const hwnd = readHwnd(browserWindow);
    const ok = SetWindowDisplayAffinity(hwnd, WDA_NONE);
    if (!ok) {
      console.error('[STEALTH] Failed to remove affinity');
      return false;
    }
    console.log('[STEALTH] Display affinity removed');
    return true;
  } catch (err) {
    console.error('[STEALTH] Exception:', err.message);
    return false;
  }
}

/**
 * Re-apply stealth on window state changes that may reset the flag.
 */
function bindStealthEvents(browserWindow) {
  if (!browserWindow) return;

  const reapply = () => {
    if (!browserWindow.isDestroyed()) {
      applyStealthAffinity(browserWindow);
    }
  };

  browserWindow.on('show', reapply);
  browserWindow.on('restore', reapply);
  browserWindow.on('focus', reapply);

  console.log('[STEALTH] Lifecycle event bindings active');
}

module.exports = {
  applyStealthAffinity,
  removeStealthAffinity,
  bindStealthEvents,
};
