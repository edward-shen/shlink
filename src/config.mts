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

export type { ShlinkConfig };