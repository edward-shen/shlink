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

import { describe, expect, mock, test } from "bun:test";
import type { Events, Storage } from "webextension-polyfill";
import * as lib from "./lib.mjs";

class MockStorage implements Storage.StorageArea {
    constructor() {
        this.onChanged = mock() as unknown as Events.Event<(changes: Storage.StorageAreaOnChangedChangesType) => void>;
    }

    get(_keys?: null | string | string[] | Record<string, unknown>): Promise<Record<string, unknown>> {
        throw new Error("Method not implemented.");
    }

    set(_items: Record<string, unknown>): Promise<void> {
        throw new Error("Method not implemented.");
    }

    remove(_keys: string | string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }

    clear(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    onChanged: Events.Event<(changes: Storage.StorageAreaOnChangedChangesType) => void>;
}

describe("getOrInitProtocols", () => {
    test("empty list but not undefined returns no allowed protocols", async () => {
        const storage = new MockStorage();
        storage.get = mock(async () => { return { allowedProtocols: [] } });
        expect(await lib.getOrInitProtocols(storage)).toEqual(new Set());
        expect(storage.get).toBeCalledTimes(1);
    });

    test("undefined list initializes", async () => {
        const storage = new MockStorage();
        storage.get = mock(async () => { return {} });
        storage.set = mock(async () => { });
        expect((await lib.getOrInitProtocols(storage))).toEqual(lib.DEFAULT_PROTOCOLS);
        expect(storage.get).toBeCalledTimes(1);
        expect(storage.set).toBeCalledTimes(1);
    });

    test("defined list does not reinitialize", async () => {
        const storage = new MockStorage();
        const expected = ["https:"];
        storage.get = mock(async () => { return { allowedProtocols: expected } });
        storage.set = mock(async () => { });
        expect((await lib.getOrInitProtocols(storage))).toEqual(new Set(expected));
        expect(storage.get).toBeCalledTimes(1);
        expect(storage.set).toBeCalledTimes(0);
    });
})
