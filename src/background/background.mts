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

import { validateURL, generateShlinkRequest, requestShlink } from "./lib.mts";
import * as browser from "webextension-polyfill";
import { notifySuccess, notifyError } from "../background/notify.mts";
import { copyLinkToClipboard } from "../background/clipboard.mts";

/**
 * Main function for generating a shortened link.
 */
async function generateShlink() {
  const storage = browser.storage.local;
  const notifications = browser.notifications;

  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    console.debug("Extracting tab data");
    let activeTab = tabs.pop();
    if (!activeTab) {
      throw new Error("Failed to extract tab information");
    }
    if (!activeTab.url) {
      throw new Error(
        "Failed to extract URL from tab -- missing manifest permission?",
      );
    }
    if (!activeTab.title) {
      throw new Error(
        "Failed to extract title from tab -- missing manifest permission?",
      );
    }

    const validatedUrl = await validateURL(
      storage,
      new URL(activeTab.url),
      activeTab.title,
      activeTab.id,
    );
    const generatedShlinkRequest = await generateShlinkRequest(
      storage,
      validatedUrl,
    );
    const shlinkResponse = await requestShlink(generatedShlinkRequest);
    await copyLinkToClipboard(shlinkResponse);
    await notifySuccess(notifications, shlinkResponse);
  } catch (error) {
    console.error(error);
    notifyError(notifications, error as Error);
  }
}

browser.action.onClicked.addListener(generateShlink);
