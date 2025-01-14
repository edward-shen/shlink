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

import type { ShlinkShortUrl } from '@shlinkio/shlink-js-sdk/api-contract';
import * as browser from 'webextension-polyfill';

function notifyAny(notifications: browser.Notifications.Static, title: string, message: string) {
    notifications.create({
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
function notifySuccess(notifications: browser.Notifications.Static, result: ShlinkShortUrl) {
    console.log("Sending success notification");
    notifyAny(notifications, "Shlink copied!", `${result.shortUrl} was copied to your clipboard.`);
}

/**
 * Generates an error notification.
 *
 * @param {!Error} error An error with a message to notify users with.
 * @returns {null}
 */
function notifyError(notifications: browser.Notifications.Static, error: Error) {
    console.log("Sending error notification");
    notifyAny(notifications, "Failed to create Shlink", error.message);
}

export { notifySuccess, notifyError };