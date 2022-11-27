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

"use strict";

// Type definitions

/**
 * @typedef ShlinkRequest
 * @type {object}
 * @property {string} shlinkApiKey The API key to communicate with a Shlink
 * instance with.
 * @property {string} shlinkHost The location of the Shlink instance.
 * @property {string} longUrl The requested URL to shorten.
 * @property {string} title The title of the content (from the tab).
 */

/**
 * This is a subset of the full API response from Shlink.
 *
 * @see {@link https://api-spec.shlink.io/|Shlink API} for more information.
 * @typedef ShlinkResponse
 * @type {object}
 * @property {string} shortUrl The shortened URL.
 */

// Functions

/**
 * Checks if we should accept the current page as a URL to shorten. There are a
 * variety of restrictions that can be imposed, such as specific protocols or
 * only permitting a domain to be shortened.
 *
 * @param {!URL} url A URL object that holds the requested URL to shorten.
 * @param {!string} title Title of the page being shortened.
 * @returns {!Promise<[URL, string], Error>} An unmodified URL and title if it was a valid link,
 * else an error describing why it was unsupported.
 */
function validateURL(url, title) {
  return browser.storage.local.get("allowedProtocols").then(({ allowedProtocols }) => {
    // Initialize a list of protocols that are allowed if unset. This needs
    // to be synced with the initialization code in options.js.
    if (allowedProtocols === undefined) {
      allowedProtocols = new Set();
      allowedProtocols.add("http:");
      allowedProtocols.add("https:");
      allowedProtocols.add("ftp:");
      allowedProtocols.add("file:");
      browser.storage.local.set({ allowedProtocols });
    }

    if (allowedProtocols.size > 0 && !allowedProtocols.has(url.protocol)) {
      return Promise.reject(new Error(`The current page's protocol (${url.protocol}) is unsupported.`));
    }

    return Promise.resolve([url, title]);
  });
}

/**
 * Fetches locally saved data and parse the URL object to generate an object
 * used to later send a Shlink request.
 *
 * @param {[!URL, string]} url A URL object that holds the requested URL to shorten.
 *                          title The title of the content. 
 * @returns {!Promise<ShlinkRequest, Error>} A ShlinkRequest if we were able to
 * get all the data necessary to send a request, else an error explaining what's
 * missing.
 */
function generateShlinkRequest([url, title]) {
  return browser.storage.local.get().then((data) => {
    if (!data.shlinkApiKey) {
      return Promise.reject(new Error(
        "Missing API key. Please configure the Shlink extension!"
      ));
    }
    if (!data.shlinkApiKey || !data.shlinkHost) {
      return Promise.reject(new Error("Please configure Shlink!"));
    }
    data.longUrl = url.href;
    data.title = title;
    return Promise.resolve(data);
  });
}

/**
 * Fetches a response from the Shlink instance using the provided arguments.
 *
 * @param {!ShlinkRequest} shlinkRequest An object containing all the variables
 * needed to request a shortened link from a Shlink instance.
 * @returns {!Response} The HTTP response from the Shlink instance.
 */
function requestShlink(shlinkRequest) {
  const headers = new Headers();
  headers.append("accept", "application/json");
  headers.append("Content-Type", "application/json");
  headers.append("X-Api-Key", shlinkRequest.shlinkApiKey);

  if (shlinkRequest.shlinkButtonOption === "create") {
    const options = {
      longUrl: shlinkRequest.longUrl,
      title: shlinkRequest.title,
    };

    if (shlinkRequest.createOptions.findIfExists) {
      options.findIfExists = true;
    }

    if (shlinkRequest.createOptions.tagShortUrl) {
      options.tags = ["shlink-extension"];
    }

    return fetch(new Request(
      `${shlinkRequest.shlinkHost}/rest/v3/short-urls`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(options),
      },
    ));
  } else {
    return fetch(new Request(
      `${shlinkRequest.shlinkHost}/rest/v3/short-urls/${shlinkRequest.modifyOptions.shortUrl}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          longUrl: shlinkRequest.longUrl,
          title: shlinkRequest.title,
        })
      }
    ));
  }
}

/**
 * Checks if the HTTP response was valid.
 *
 * @param {!Response} httpResp The response from the Shlink instance from
 * requesting a shortened link.
 * @returns {!Promise<ShlinkResponse, Error>} An object containing the Shlink
 * response if the server responded successfully, or an error describing the
 * HTTP error code returned by the server.
 */
function validateShlinkResponse(httpResp) {
  if (httpResp.ok) {
    return httpResp.json();
  } else if (httpResp.status >= 400 && httpResp.status < 500) {
    return Promise.reject(new Error(
      `Got error code ${httpResp.status}. ` +
      "Please check if you've configured the Shlink extension correctly."
    ));
  } else if (httpResp.status >= 500 && httpResp.status < 600) {
    return Promise.reject(new Error(
      `Got error code ${httpResp.status}. ` +
      "Please check if the Shlink server is properly configured."
    ));
  } else {
    return Promise.reject(new Error(
      `Got unknown error code ${httpResp.status}. Please try again later.`
    ));
  }
}

/**
 * Copies the shortened link provided from the Shlink instance to the clipboard.
 *
 * @param {!ShlinkResponse} shlinkResp The JSON response from a Shlink instance.
 * @returns {!Promise<ShlinkResponse, Error>} `shlinkResp`, unmodified, on
 * success, or an error indicating that we failed to copy to the clipboard.
 */
function copyLinkToClipboard(shlinkResp) {
  // God fucking dammit Chrome. You can't directly write to the clipboard when
  // as a background extension with the clipboard API (despite even having the
  // permission), so we instead just do this hacky workaround instead.
  if (typeof chrome !== "undefined") {
    const prevSelected = document.activeElement;
    const tempEle = document.createElement("input");
    document.body.appendChild(tempEle);
    tempEle.value = shlinkResp.shortUrl;
    tempEle.select();
    document.execCommand(`copy`);
    document.body.removeChild(tempEle);
    // Depending on what was previously selected, we might not be able to select
    // the text.
    if (prevSelected?.select) {
      prevSelected.select();
    }
    return Promise.resolve(shlinkResp);
  } else {
    return navigator.clipboard
      .writeText(shlinkResp.shortUrl)
      .then(
        () => Promise.resolve(shlinkResp),
        (e) => Promise.reject(new Error(`Failed to copy to clipboard. ${e.message}`))
      );
  }
}

/**
 * Generates an success notification.
 *
 * @param {!ShlinkResponse} response A successful Shlink response.
 * @returns {null}
 */
function notifySuccess(result) {
  browser.notifications.create({
    type: "basic",
    title: "Shlink copied!",
    iconUrl: "icons/shlink-64.png",
    message: `${result.shortUrl} was copied to your clipboard.`,
  });
}

/**
 * Generates an error notification.
 *
 * @param {!Error} error An error with a message to notify users with.
 * @returns {null}
 */
function notifyError(error) {
  browser.notifications.create({
    type: "basic",
    title: "Failed to create Shlink",
    iconUrl: "icons/shlink-64.png",
    message: error.message,
  });
}

/**
 * Main function for generating a shortened link.
 */
function generateShlink() {
  browser.tabs
    .query({ active: true, currentWindow: true })
    .then(tabData => validateURL(new URL(tabData[0].url), tabData[0].title))
    .then(generateShlinkRequest)
    .then(requestShlink)
    .then(validateShlinkResponse)
    .then(copyLinkToClipboard)
    .then(notifySuccess)
    .catch(notifyError);
}

browser.browserAction.onClicked.addListener(generateShlink);
