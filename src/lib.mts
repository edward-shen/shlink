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

import type { Storage } from "webextension-polyfill";
import type { ShlinkConfig } from "./config.mts";
import type { ShlinkRequest } from "./shlink_request.mts";
import type { ShlinkCreateShortUrlData, ShlinkEditShortUrlData, ShlinkShortUrl } from "@shlinkio/shlink-js-sdk/api-contract";
import { ShlinkRestClient } from "./shlink_api.mts";

const DEFAULT_PROTOCOLS = new Set(["http:", "https:", "ftp:", "file:"]);

class ValidatedUrl {
  url: URL;
  title: string;
  tabId?: number;

  constructor(url: URL, title: string, tabId?: number) {
    this.url = url;
    this.title = title;
    this.tabId = tabId;
  }
}

/**
 * Checks if we should accept the current page as a URL to shorten. There are a
 * variety of restrictions that can be imposed, such as specific protocols or
 * only permitting a domain to be shortened.
 *
 * @param {!Storage.StorageArea} storage Browser storage location. Not to be confused with localStorage.
 * @param {!URL} url A URL object that holds the requested URL to shorten.
 * @param {!string} title Title of the page being shortened.
 * @param {number | undefined} tabId Chrome tab ID of the page being shortened,
 * @returns {!Promise<ValidatedUrl>} An unmodified URL and title if it was a valid link,
 * else an error describing why it was unsupported.
 */
async function validateURL(storage: Storage.StorageArea, url: URL, title: string, tabId: number | undefined): Promise<ValidatedUrl> {
  const allowedProtocols = await getOrInitProtocols(storage);

  if (allowedProtocols.size > 0 && !allowedProtocols.has(url.protocol)) {
    throw new Error(`The current page's protocol (${url.protocol}) is unsupported.`);
  }

  return new ValidatedUrl(url, title, tabId);
}

async function getOrInitProtocols(storage: Storage.StorageArea): Promise<Set<string>> {
  const allowedProtocols = (await storage.get("allowedProtocols") as Record<string, Array<string> | undefined>)['allowedProtocols'];
  if (allowedProtocols === undefined) {
    await storage.set({ allowedProtocols: Array(...DEFAULT_PROTOCOLS) });
    return DEFAULT_PROTOCOLS;
  } else {
    return new Set(allowedProtocols);
  }
}

function getConfig(storage: Storage.StorageArea): Promise<ShlinkConfig> {
  return storage.get() as Promise<unknown> as Promise<ShlinkConfig>;
}


/**
 * Fetches locally saved data and parse the URL object to generate an object
 * used to later send a Shlink request.
 *
 * @param {ValidatedUrl} url A URL object that holds the requested URL to shorten.
 *                          title The title of the content.
 * @returns {!Promise<ShlinkRequest, Error>} A ShlinkRequest if we were able to
 * get all the data necessary to send a request, else an error explaining what's
 * missing.
 */
async function generateShlinkRequest(storage: Storage.StorageArea, { url, title, tabId }: ValidatedUrl): Promise<ShlinkRequest> {
  console.debug("Generating Shlink Request");
  let config = await getConfig(storage);
  if (!config.shlinkApiKey) {
    throw new Error(
      "Missing API key. Please configure the Shlink extension!"
    );
  }
  if (!config.shlinkApiKey || !config.shlinkHost) {
    throw new Error("Please configure Shlink!");
  }
  const request: ShlinkRequest = {
    longUrl: url.href,
    title,
    tabId,
    ...config,
  };

  return request;
}

/**
 * Fetches a response from the Shlink instance using the provided arguments.
 *
 * @param {!ShlinkRequest} shlinkRequest An object containing all the variables
 * needed to request a shortened link from a Shlink instance.
 * @returns {!Response} The HTTP response from the Shlink instance.
 */
function requestShlink(shlinkRequest: ShlinkRequest): Promise<ShlinkShortUrl> {
  console.debug("Requesting short URL from Shlink instance");

  if (shlinkRequest.shlinkButtonOption === "create") {
    console.debug("Using Create endpoint");
    const options: ShlinkCreateShortUrlData = {
      longUrl: shlinkRequest.longUrl,
      title: shlinkRequest.title,
    };

    if (shlinkRequest.createOptions.findIfExists) {
      options.findIfExists = true;
    }

    if (shlinkRequest.createOptions.tagShortUrl) {
      options.tags = ["shlink-extension"];
    }

    const client = new ShlinkRestClient(shlinkRequest.shlinkHost, shlinkRequest.shlinkApiKey);
    return client.createShortUrl(options);
  } else {
    console.debug("Using Modify endpoint");
    const options: ShlinkEditShortUrlData = {
      longUrl: shlinkRequest.longUrl,
      title: shlinkRequest.title,
    };
    const client = new ShlinkRestClient(shlinkRequest.shlinkHost, shlinkRequest.shlinkApiKey);
    return client.updateShortUrl(shlinkRequest.modifyOptions.shortUrl, options);
  }
}

export { DEFAULT_PROTOCOLS, ValidatedUrl, validateURL, getOrInitProtocols, generateShlinkRequest, requestShlink };