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

import { ConfigManager, type ShlinkConfig } from "../lib/config.mts";

var browser = require("webextension-polyfill");

("use strict");

// Element lookups
const hostKeyEle = document.getElementById("host")! as HTMLInputElement;
const apiKeyEle = document.getElementById("key")! as HTMLInputElement;
const AllowHttpEle = document.getElementById("allow-http")! as HTMLInputElement;
const AllowHttpsEle = document.getElementById(
  "allow-https",
)! as HTMLInputElement;
const AllowFileEle = document.getElementById("allow-file")! as HTMLInputElement;
const AllowFtpEle = document.getElementById("allow-ftp")! as HTMLInputElement;
const clickBehaviorEle = document.getElementById(
  "click-behavior",
)! as HTMLSelectElement;
const createOptionsEle = document.getElementById("create-options")!;
const createOptionsFindIfExistsEle = document.getElementById(
  "create-findIfExists",
)! as HTMLInputElement;
const createOptionsTagShortUrlEle = document.getElementById(
  "create-tagShortUrl",
)! as HTMLInputElement;
const modifyOptionsEle = document.getElementById("modify-options")!;
const modifyOptionsShortUrlEle = document.getElementById(
  "modify-shortUrl",
)! as HTMLInputElement;

// Global shorthands
const browserStorage = browser.storage.local;

// Event listeners
hostKeyEle.oninput = (event) => {
  if (event.type === "click") {
    event.preventDefault();
  }

  const shlinkHost = hostKeyEle.value;

  // Need to use a try/catch here because URL constructor may throw an exception
  try {
    const url = new URL(shlinkHost);

    // We already throw an exception earlier, might as well throw an error here.
    if (url.protocol !== "https:") {
      throw new Error("Only HTTPS communications are allowed.");
    }

    browserStorage.set({ shlinkHost });
    hostKeyEle.classList.remove("invalid-value");
  } catch (_) {
    hostKeyEle.classList.add("invalid-value");
  }
};

apiKeyEle.oninput = (event) => {
  if (event.type === "click") {
    event.preventDefault();
  }

  // Apparently the API key is a UUID
  const apiKeyRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const shlinkApiKey = apiKeyEle.value;

  if (apiKeyRegex.test(shlinkApiKey)) {
    browserStorage.set({ shlinkApiKey });
    apiKeyEle.classList.remove("invalid-value");
  } else {
    apiKeyEle.classList.add("invalid-value");
  }
};

createOptionsFindIfExistsEle.onclick = async () => {
  const configManager = new ConfigManager(browserStorage);
  await configManager.mapCreateOptions((options) => {
    options.findIfExists = createOptionsFindIfExistsEle.checked;
    return options;
  });
};

createOptionsTagShortUrlEle.onclick = async () => {
  const configManager = new ConfigManager(browserStorage);
  await configManager.mapCreateOptions((options) => {
    options.tagShortUrl = createOptionsTagShortUrlEle.checked;
    return options;
  });
};

const allowProtocolsMapping: Array<[HTMLInputElement, string]> = [
  [AllowHttpEle, "http:"],
  [AllowHttpsEle, "https:"],
  [AllowFileEle, "file:"],
  [AllowFtpEle, "ftp:"],
];

for (const [ele, protocol] of allowProtocolsMapping) {
  ele.onclick = async () => {
    const configManager = new ConfigManager(browserStorage);
    await configManager.mapAllowedProtocols((allowedProtocols) => {
      allowedProtocols = new Set(allowedProtocols);
      if (ele.checked) {
        allowedProtocols.add(protocol);
      } else {
        allowedProtocols.delete(protocol);
      }
      return allowedProtocols;
    });
  };
}

clickBehaviorEle.onchange = () => {
  switch (clickBehaviorEle.value) {
    case "create":
      modifyOptionsEle.classList.add("hidden");
      createOptionsEle.classList.remove("hidden");
      browserStorage.set({ shlinkButtonOption: clickBehaviorEle.value });
      break;
    case "modify":
      modifyOptionsEle.classList.remove("hidden");
      createOptionsEle.classList.add("hidden");
      browserStorage.set({ shlinkButtonOption: clickBehaviorEle.value });
      break;
    default:
      console.error(`Got unknown click behavior: ${clickBehaviorEle.value}`);
  }
};

modifyOptionsShortUrlEle.oninput = async (event) => {
  if (event.type === "click") {
    event.preventDefault();
  }

  if (modifyOptionsShortUrlEle.value.length < 4) {
    modifyOptionsShortUrlEle.classList.add("invalid-value");
    return;
  } else {
    modifyOptionsShortUrlEle.classList.remove("invalid-value");
  }

  const configManager = new ConfigManager(browserStorage);
  await configManager.mapModifyOptions((current) => {
    current.shortUrl = modifyOptionsShortUrlEle.value;
    return current;
  });
};

function setCurrentChoice({
  shlinkHost,
  shlinkApiKey,
  allowedProtocols,
  shlinkButtonOption,
  createOptions,
  modifyOptions,
}: ShlinkConfig) {
  hostKeyEle.value = shlinkHost || "";
  apiKeyEle.value = shlinkApiKey || "";

  // Initialize a list of protocols that are allowed if unset. This needs
  // to be synced with the initialization code in background.js#validateURL.
  allowedProtocols = new Set(allowedProtocols);
  AllowHttpEle.checked = allowedProtocols.has("http:");
  AllowHttpsEle.checked = allowedProtocols.has("https:");
  AllowFileEle.checked = allowedProtocols.has("file:");
  AllowFtpEle.checked = allowedProtocols.has("ftp:");

  createOptionsFindIfExistsEle.checked = !!createOptions.findIfExists;
  createOptionsTagShortUrlEle.checked = !!createOptions.tagShortUrl;
  if (modifyOptions) {
    modifyOptionsShortUrlEle.value = modifyOptions.shortUrl;
  }

  switch (shlinkButtonOption) {
    case "create":
      createOptionsEle.classList.remove("hidden");
      clickBehaviorEle.value = shlinkButtonOption;
      break;
    case "modify":
      modifyOptionsEle.classList.remove("hidden");
      clickBehaviorEle.value = shlinkButtonOption;
      break;
    default:
      break;
  }
}

new ConfigManager(browserStorage)
  .get()
  .then(setCurrentChoice, (error: Error) => {
    console.log(`Error: ${error}`);
  });
