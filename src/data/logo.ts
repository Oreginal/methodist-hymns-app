/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// The previous inline base64 PNG was truncated (payload length not a multiple
// of 4, no IEND chunk), so browsers rendered a broken image. Use the intact
// bundled asset instead; Vite resolves this import to a usable image URL.
import logoUrl from '../assets/logo-v4.png';

export const LOGO_BASE64 = logoUrl;
