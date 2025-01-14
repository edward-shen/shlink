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

import type { ShlinkCreateShortUrlData, ShlinkEditShortUrlData, ShlinkShortUrl } from "@shlinkio/shlink-js-sdk/api-contract";

// This class only exists because the provided sdk doesn't provide sufficient
// error information to return meaningful responses.
class ShlinkRestClient {
  #hostname: string;
  #headers: Headers;

  constructor(hostname: string, apiKey: string) {
    this.#hostname = hostname;

    const headers = new Headers();
    headers.append("accept", "application/json");
    headers.append("Content-Type", "application/json");
    headers.append("X-Api-Key", apiKey);
    this.#headers = headers;
  }

  createShortUrl(options: ShlinkCreateShortUrlData): Promise<ShlinkShortUrl> {
    console.debug("Creating new url");
    return fetch(new Request(
      `${this.#hostname}/rest/v2/short-urls`,
      {
        method: 'POST',
        headers: this.#headers,
        body: JSON.stringify(options),
      },
    )).then(validateShlinkResponse, debugConnError);
  }

  updateShortUrl(shortUrl: string, options: ShlinkEditShortUrlData): Promise<ShlinkShortUrl> {
    console.debug("Patching existing url");
    return fetch(new Request(
      `${this.#hostname}/rest/v2/short-urls/${shortUrl}`,
      {
        method: 'PATCH',
        headers: this.#headers,
        body: JSON.stringify(options)
      }
    )).then(validateShlinkResponse, debugConnError);
  }
}

/**
 * Checks if the HTTP response was valid.
 *
 * @param {!Response} httpResp The response from the Shlink instance from
 * requesting a shortened link.
 * @returns {!Promise<ShlinkResponse>} An object containing the Shlink
 * response if the server responded successfully, or an error describing the
 * HTTP error code returned by the server.
 */
async function validateShlinkResponse(httpResp: Response): Promise<ShlinkShortUrl> {
  console.debug("Validating shlink repsonse");
  if (httpResp.ok) {
    return await httpResp.json();
  } else if (httpResp.status >= 400 && httpResp.status < 500) {
    throw new Error(
      `Got error code ${httpResp.status}. ` +
      "Please check if you've configured the Shlink extension correctly."
    );
  } else if (httpResp.status >= 500 && httpResp.status < 600) {
    throw new Error(
      `Got error code ${httpResp.status}. ` +
      "Please check if the Shlink server is properly configured."
    );
  } else {
    throw new Error(
      `Got unknown error code ${httpResp.status}. Please try again later.`
    );
  }
}

function debugConnError(error: Error): Promise<never> {
  console.error(error);
  return Promise.reject(new Error("Failed to fetch. Please check if you've configured Shlink extension's Host URL correctly."));
}

export { ShlinkRestClient };