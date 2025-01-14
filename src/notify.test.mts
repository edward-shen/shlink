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

import { expect, mock, test } from 'bun:test';
import { notifySuccess, notifyError } from './notify.mts';
import * as browser from 'webextension-polyfill';

class MockNotifications implements browser.Notifications.Static {
    constructor() {
        this.onClosed = mock() as unknown as browser.Events.Event<(notificationId: string, byUser: boolean) => void>;
        this.onClicked = mock() as unknown as browser.Events.Event<(notificationId: string) => void>;
        this.onButtonClicked = mock() as unknown as browser.Events.Event<(notificationId: string, buttonIndex: number) => void>;
        this.onShown = mock() as unknown as browser.Events.Event<(notificationId: string) => void>;
    }

    create(_notificationId: unknown, _options?: unknown): Promise<string> {
        throw new Error('Method not implemented.');
    }

    clear(_notificationId: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    getAll(): Promise<Record<string, browser.Notifications.CreateNotificationOptions>> {
        throw new Error('Method not implemented.');
    }

    onClosed: browser.Events.Event<(notificationId: string, byUser: boolean) => void>;
    onClicked: browser.Events.Event<(notificationId: string) => void>;
    onButtonClicked: browser.Events.Event<(notificationId: string, buttonIndex: number) => void>;
    onShown: browser.Events.Event<(notificationId: string) => void>;
}

test("notifySuccess creates a notifiction", async () => {
    const dummyResponse = {
        shortCode: "foo",
        shortUrl: "https://example.com/foo",
        longUrl: "https://example.com/very-long-link",
        dateCreated: "",
        meta: {
            validSince: null,
            validUntil: null,
            maxVisits: null
        },
        tags: [],
        domain: null,
    };

    let mockNotifs = new MockNotifications();
    mockNotifs.create = mock();

    notifySuccess(mockNotifs, dummyResponse);

    expect(mockNotifs.create).toBeCalledTimes(1);
});


test("notifyError creates a notifiction", async () => {
    let mockNotifs = new MockNotifications();
    mockNotifs.create = mock();

    notifyError(mockNotifs, new Error("mock error"));

    expect(mockNotifs.create).toBeCalledTimes(1);
});


