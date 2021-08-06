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

// Element lookups
const hostKeyEle = document.getElementById("host");
const apiKeyEle = document.getElementById("key");
const AllowHttpEle = document.getElementById("allow-http");
const AllowHttpsEle = document.getElementById("allow-https");
const AllowFileEle = document.getElementById("allow-file");
const AllowFtpEle = document.getElementById("allow-ftp");
const clickBehaviorEle = document.getElementById("click-behavior");
const createOptionsEle = document.getElementById("create-options");
const createOptionsFindIfExistsEle = document.getElementById("create-findIfExists");
const createOptionsTagShortUrlEle = document.getElementById("create-tagShortUrl");
const modifyOptionsEle = document.getElementById("modify-options");
const modifyOptionsShortUrlEle = document.getElementById("modify-shortUrl");

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
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Invalid protocol");
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
  const apiKeyRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const shlinkApiKey = apiKeyEle.value;

  if (apiKeyRegex.test(shlinkApiKey)) {
    browserStorage.set({ shlinkApiKey });
    apiKeyEle.classList.remove("invalid-value");
  } else {
    apiKeyEle.classList.add("invalid-value");
  }
};

createOptionsFindIfExistsEle.onclick = () => {
  browserStorage.get("createOptions").then(({ createOptions }) => {
    createOptions.findIfExists = createOptionsFindIfExistsEle.checked;
    browserStorage.set({ createOptions });
  });
};

createOptionsTagShortUrlEle.onclick = () => {
  browserStorage.get("createOptions").then(({ createOptions }) => {
    createOptions.tagShortUrl = createOptionsTagShortUrlEle.checked;
    browserStorage.set({ createOptions });
  });
};

const allowProtocolsMapping = [
  [AllowHttpEle, "http:"],
  [AllowHttpsEle, "https:"],
  [AllowFileEle, "file:"],
  [AllowFtpEle, "ftp:"],
];

for (const [ele, protocol] of allowProtocolsMapping) {
  ele.onclick = () => {
    browserStorage.get("allowedProtocols").then(({ allowedProtocols }) => {
      if (ele.checked) {
        allowedProtocols.add(protocol);
      } else {
        allowedProtocols.delete(protocol);
      }
      browserStorage.set({ allowedProtocols });
    });
  };
}

clickBehaviorEle.onchange = () => {
  switch (clickBehaviorEle.value) {
    case "create":
      modifyOptionsEle.classList.add("hidden");
      createOptionsEle.classList.remove("hidden");
      browserStorage.set({ "shlinkButtonOption": clickBehaviorEle.value });
      break;
    case "modify":
      modifyOptionsEle.classList.remove("hidden");
      createOptionsEle.classList.add("hidden");
      browserStorage.set({ "shlinkButtonOption": clickBehaviorEle.value });
      break;
    default:
      console.error(`Got unknown click behavior: ${clickBehaviorEle.value}`);
  }
}

modifyOptionsShortUrlEle.oninput = (event) => {
  if (event.type === "click") {
    event.preventDefault();
  }

  if (modifyOptionsShortUrlEle.value.length < 4) {
    modifyOptionsShortUrlEle.classList.add("invalid-value");
    return;
  } else {
    modifyOptionsShortUrlEle.classList.remove("invalid-value");
  }

  browserStorage.get("modifyOptions").then(({ modifyOptions }) => {
    modifyOptions.shortUrl = modifyOptionsShortUrlEle.value;
    browserStorage.set({ modifyOptions });
  })
}

function setCurrentChoice({ shlinkHost, shlinkApiKey, allowedProtocols, shlinkButtonOption, createOptions, modifyOptions }) {
  hostKeyEle.value = shlinkHost || "";
  apiKeyEle.value = shlinkApiKey || "";

  // If option doesn't exist, set default options
  // This should also handle migrating from 0.3.0 to 0.4.0
  if (!shlinkButtonOption) {
    const defaultConfig = {
      "shlinkButtonOption": "create",
      "createOptions": {
        "findIfExists": true,
      },
      "modifyOptions": {
        "shortUrl": "",
      }
    };
    browserStorage.set(defaultConfig);
    ({ shlinkButtonOption, createOptions } = defaultConfig);
  }

  // Initialize a list of protocols that are allowed if unset. This needs
  // to be synced with the initialization code in background.js#validateURL.
  if (allowedProtocols === undefined) {
    allowedProtocols = new Set();
    allowedProtocols.add("http:");
    allowedProtocols.add("https:");
    allowedProtocols.add("ftp:");
    allowedProtocols.add("file:");
    browser.storage.local.set({ allowedProtocols });
  }

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

browserStorage.get().then(setCurrentChoice, (error) => {
  console.log(`Error: ${error}`);
});