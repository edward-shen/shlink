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

const hostKeyEle = document.getElementById("host");
const apiKeyEle = document.getElementById("key");

function saveOptions(event) {
  if (event.type === 'click') {
    event.preventDefault();
  }

  // Apparently the API key is a UUID
  const apiKeyRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const shlinkHost = hostKeyEle.value;
  const shlinkApiKey = apiKeyEle.value;

  let invalidInput = false;

  // Check if URL is valid
  try {
    const url = new URL(shlinkHost);
    console.log(url.protocol);
    console.log(url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
  } catch (_) {
    invalidInput = true;
    hostKeyEle.style.color = "#f00";
  }


  // Check if API key is valid.
  if (!apiKeyRegex.test(shlinkApiKey)) {
    invalidInput = true;
    apiKeyEle.style.color = "#f00";
  }

  if (invalidInput) {
    return;
  }

  // If we got here than everything is valid
  hostKeyEle.style.color = "#000";
  apiKeyEle.style.color = "#000";

  browser.storage.local.set({
    shlinkHost,
    shlinkApiKey,
  });
}

function restoreOptions() {
  function setCurrentChoice(result) {
    hostKeyEle.value = result.shlinkHost || "";
    apiKeyEle.value = result.shlinkApiKey || "";
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  browser.storage.local.get(["shlinkHost", "shlinkApiKey"]).then(setCurrentChoice, onError);
}

hostKeyEle.oninput = saveOptions;
apiKeyEle.oninput = saveOptions;

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);