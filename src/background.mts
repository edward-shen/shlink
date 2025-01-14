/*
 * Unofficial Shlink extension for one-click link shortening.
 * Copyright (C) 2020 Edward Shen
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

import type { Tabs } from "webextension-polyfill";
import type { ShlinkCreateShortUrlData, ShlinkEditShortUrlData, ShlinkShortUrl } from '@shlinkio/shlink-js-sdk/api-contract';
import { writeToOffscreenClipboard } from './offscreen_handler.mts';
import { ShlinkRestClient } from "./shlink_api.mts";

var browser = require("webextension-polyfill");

interface ShlinkConfig {
  shlinkApiKey: string; // The API key to communicate with a Shlink instance with.
  shlinkHost: string; // The location of the Shlink instance.\
  shlinkButtonOption: "create" | "modify";
  createOptions: {
    findIfExists: boolean,
    tagShortUrl: boolean,
  };
  modifyOptions: {
    shortUrl: string,
  };
  allowedProtocols: Array<string>,
}

interface ShlinkRequest extends ShlinkConfig {
  longUrl: string; // The requested URL to shorten.
  title: string; // The title of the content (from the tab).
  tabId: Number | undefined; // The tab id.
}

// Functions

/**
 * Checks if we should accept the current page as a URL to shorten. There are a
 * variety of restrictions that can be imposed, such as specific protocols or
 * only permitting a domain to be shortened.
 *
 * @param {!URL} url A URL object that holds the requested URL to shorten.
 * @param {!string} title Title of the page being shortened.
 * @param {Number | undefined} tabId Chrome tab ID of the page being shortened,
 * @returns {!Promise<[URL, string, Number], Error>} An unmodified URL and title if it was a valid link,
 * else an error describing why it was unsupported.
 */
function validateURL(url: URL, title: string, tabId: Number | undefined) {
  return browser.storage.local.get("allowedProtocols").then(({ allowedProtocols }: { allowedProtocols: Set<string> }) => {
    // Initialize a list of protocols that are allowed if unset. This needs
    // to be synced with the initialization code in options.js.
    if (allowedProtocols === undefined) {
      allowedProtocols = new Set();
      allowedProtocols.add("http:");
      allowedProtocols.add("https:");
      allowedProtocols.add("ftp:");
      allowedProtocols.add("file:");
      browser.storage.local.set({ allowedProtocols: Array(...allowedProtocols) });
    } else {
      allowedProtocols = new Set(allowedProtocols);
    }

    if (allowedProtocols.size > 0 && !allowedProtocols.has(url.protocol)) {
      return Promise.reject(new Error(`The current page's protocol (${url.protocol}) is unsupported.`));
    }

    return Promise.resolve([url, title, tabId]);
  });
}

/**
 * Fetches locally saved data and parse the URL object to generate an object
 * used to later send a Shlink request.
 *
 * @param {[!URL, string, Number | undefined]} url A URL object that holds the requested URL to shorten.
 *                          title The title of the content.
 * @returns {!Promise<ShlinkRequest, Error>} A ShlinkRequest if we were able to
 * get all the data necessary to send a request, else an error explaining what's
 * missing.
 */
function generateShlinkRequest([url, title, tabId]: [URL, string, Number]) {
  console.debug("Generating Shlink Request");
  return browser.storage.local.get().then((data: ShlinkConfig) => {
    if (!data.shlinkApiKey) {
      return Promise.reject(new Error(
        "Missing API key. Please configure the Shlink extension!"
      ));
    }
    if (!data.shlinkApiKey || !data.shlinkHost) {
      return Promise.reject(new Error("Please configure Shlink!"));
    }
    const request: ShlinkRequest = {
      longUrl: url.href,
      title,
      tabId,
      ...data,
    };
    return Promise.resolve(request);
  });
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
  const serverInfo = {
    baseUrl: shlinkRequest.shlinkHost,
    apiKey: shlinkRequest.shlinkApiKey,
  };

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

/**
 * Copies the shortened link provided from the Shlink instance to the clipboard.
 *
 * @param {!ShlinkShortUrl} shlinkResp The JSON response from a Shlink instance.
 * @returns {!Promise<ShlinkShortUrl, Error>} `shlinkResp`, unmodified, on
 * success, or an error indicating that we failed to copy to the clipboard.
 */
async function copyLinkToClipboard(shlinkResp: ShlinkShortUrl) {
  console.debug("Copying to clipboard");
  // God fucking dammit Chrome. You can't directly write to the clipboard when
  // as a service_worker with the clipboard API (despite even having the
  // permission), so we instead just do this hacky workaround instead.
  if (!navigator.clipboard?.writeText && typeof chrome !== 'undefined') {
    console.info("Using Chrome fallback");
    await writeToOffscreenClipboard(shlinkResp.shortUrl);
    return shlinkResp;
  } else {
    console.debug("Using navigator.clipboard");
    try {
      await navigator.clipboard.writeText(shlinkResp.shortUrl);
      return shlinkResp;
    } catch (e: any) {
      throw new Error(`Failed to copy to clipboard. ${e.message}`);
    }
  }
}

function notifyAny(title: string, message: string) {
  browser.notifications.create({
    type: "basic",
    title,
    iconUrl: "icons/shlink-64.png",
    message,
  });
}

/**
 * Generates an success notification.
 *
 * @param {!ShlinkShortUrl} response A successful Shlink response.
 * @returns {null}
 */
function notifySuccess(result: ShlinkShortUrl) {
  console.log("Sending success notification");
  notifyAny("Shlink copied!", `${result.shortUrl} was copied to your clipboard.`);
}

/**
 * Generates an error notification.
 *
 * @param {!Error} error An error with a message to notify users with.
 * @returns {null}
 */
function notifyError(error: Error) {
  console.log("Sending error notification");
  notifyAny("Failed to create Shlink", error.message);
}

/**
 * Main function for generating a shortened link.
 */
function generateShlink() {
  browser.tabs
    .query({ active: true, currentWindow: true })
    .then((tabData: Array<Tabs.Tab>) => {
      console.debug("Extracting tab data");
      let activeTab = tabData.pop();
      if (!activeTab) {
        return Promise.reject("Failed to extract tab information");
      }
      if (!activeTab.url) {
        return Promise.reject("Failed to extract URL from tab -- missing manifest permission?");
      }
      if (!activeTab.title) {
        return Promise.reject("Failed to extract title from tab -- missing manifest permission?");
      }
      return validateURL(new URL(activeTab.url), activeTab.title, activeTab.id);
    })
    .then(generateShlinkRequest)
    .then(requestShlink)
    .then(copyLinkToClipboard)
    .then(notifySuccess)
    .catch(notifyError);
}

browser.action.onClicked.addListener(generateShlink);
