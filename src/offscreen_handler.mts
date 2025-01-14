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

// https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3/
// Except as otherwise noted, the content of this page is licensed under the
// Creative Commons Attribution 4.0 License, and code samples are licensed
// under the Apache 2.0 License. For details, see the Google Developers Site
// Policies. Java is a registered trademark of Oracle and/or its affiliates.

// A global promise to avoid concurrency issues
let creating: Promise<void> | null = null;

async function setupOffscreenDocument(path: string = "offscreen.html") {
  console.debug("Ensuring offscreen document is created");

  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    console.debug("Offscreen document context already exists, returning");
    return;
  }

  if (creating) {
    console.debug("Offscreen document is racing, awaiting existing");
    await creating;
  } else {
    console.debug("Offscreen document does not exist, creating");
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: 'Writing text to the clipboard',
    });
    await creating;
    creating = null;
  }
}

async function writeToOffscreenClipboard(text: string) {
  await setupOffscreenDocument();
  console.debug("Sending message to offscreen");
  await chrome.runtime.sendMessage({
    target: "offscreen-doc",
    text,
  });
}

export { writeToOffscreenClipboard };
