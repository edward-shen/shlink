/*
 * Unofficial Shlink extension for one-click link shortening.
 * Copyright (C) 2025 Edward Shen
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { ShlinkShortUrl } from "@shlinkio/shlink-js-sdk/api-contract";
import { writeToOffscreenClipboard } from "./offscreen_handler.mts";

/**
 * Copies the shortened link provided from the Shlink instance to the clipboard.
 *
 * @param {!ShlinkShortUrl} shlinkResp The JSON response from a Shlink instance.
 * @returns {!Promise<ShlinkShortUrl>} `shlinkResp`, unmodified, on
 * success, or an error indicating that we failed to copy to the clipboard.
 */
async function copyLinkToClipboard(
  shlinkResp: ShlinkShortUrl,
): Promise<ShlinkShortUrl> {
  console.debug("Copying to clipboard");
  // God fucking dammit Chrome. You can't directly write to the clipboard when
  // as a service_worker with the clipboard API (despite even having the
  // permission), so we instead just do this hacky workaround instead.
  if (isChrome(navigator.clipboard)) {
    console.info("Using Chrome fallback");
    await writeToOffscreenClipboard(shlinkResp.shortUrl);
  } else {
    console.debug("Using navigator.clipboard");
    try {
      await navigator.clipboard.writeText(shlinkResp.shortUrl);
    } catch (e: any) {
      throw new Error(`Failed to copy to clipboard. ${e.message}`);
    }
  }
  return shlinkResp;
}

function isChrome(clipboard: Clipboard | undefined): boolean {
  return !clipboard?.writeText && typeof chrome !== "undefined";
}

export { copyLinkToClipboard, isChrome };
