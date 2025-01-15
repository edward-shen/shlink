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

import {
  ConfigManager,
  FILE_PROTOCOL,
  FTP_PROTOCOL,
  HTTP_PROTOCOL,
  HTTPS_PROTOCOL,
  type ShlinkConfig,
} from "../lib/config.mts";

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

const HIDDEN_CLASS = "hidden";

function hide(ele: HTMLElement): void {
  ele.classList.add(HIDDEN_CLASS);
}

function show(ele: HTMLElement): void {
  ele.classList.remove(HIDDEN_CLASS);
}

const INVALID_VALUE_CLASS = "invalid-value";

function renderInvalid(ele: HTMLElement): void {
  ele.classList.add(INVALID_VALUE_CLASS);
}

function renderValid(ele: HTMLElement): void {
  ele.classList.remove(INVALID_VALUE_CLASS);
}

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
    if (url.protocol !== HTTPS_PROTOCOL) {
      throw new Error("Only HTTPS communications are allowed.");
    }

    browserStorage.set({ shlinkHost });
    renderValid(hostKeyEle);
  } catch (_) {
    renderInvalid(hostKeyEle);
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
    renderValid(apiKeyEle);
  } else {
    renderInvalid(apiKeyEle);
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
  [AllowHttpEle, HTTP_PROTOCOL],
  [AllowHttpsEle, HTTPS_PROTOCOL],
  [AllowFileEle, FILE_PROTOCOL],
  [AllowFtpEle, FTP_PROTOCOL],
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
      hide(modifyOptionsEle);
      show(createOptionsEle);
      browserStorage.set({ shlinkButtonOption: clickBehaviorEle.value });
      break;
    case "modify":
      show(modifyOptionsEle);
      hide(createOptionsEle);
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
    renderInvalid(modifyOptionsShortUrlEle);
    return;
  } else {
    renderValid(modifyOptionsShortUrlEle);
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
  hostKeyEle.value = shlinkHost;
  apiKeyEle.value = shlinkApiKey;

  AllowHttpEle.checked = allowedProtocols.has(HTTP_PROTOCOL);
  AllowHttpsEle.checked = allowedProtocols.has(HTTPS_PROTOCOL);
  AllowFileEle.checked = allowedProtocols.has(FILE_PROTOCOL);
  AllowFtpEle.checked = allowedProtocols.has(FTP_PROTOCOL);

  createOptionsFindIfExistsEle.checked = createOptions.findIfExists;
  createOptionsTagShortUrlEle.checked = createOptions.tagShortUrl;

  if (modifyOptions) {
    modifyOptionsShortUrlEle.value = modifyOptions.shortUrl;
  }

  switch (shlinkButtonOption) {
    case "create":
      show(createOptionsEle);
      clickBehaviorEle.value = shlinkButtonOption;
      break;
    case "modify":
      show(modifyOptionsEle);
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
