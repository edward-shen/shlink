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

import { describe, expect, mock, spyOn, test } from 'bun:test';
import * as clipboard from './clipboard.mts';
import * as offscreen_handler from './offscreen_handler.mjs';

describe("copyLinkToClipboard", () => {
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

    const isCromeSpy = spyOn(clipboard, 'isChrome');
    const writeToOffscreenClipboardSpy = spyOn(offscreen_handler, 'writeToOffscreenClipboard');
    const naviClipboardSpy = spyOn(navigator.clipboard, 'writeText');


    test("use offscreen clipboard copy if chrome is detected", async () => {
        isCromeSpy.mockReturnValueOnce(true);
        writeToOffscreenClipboardSpy.mockResolvedValueOnce(undefined);

        expect(writeToOffscreenClipboardSpy).not.toBeCalled();
        expect(naviClipboardSpy).not.toBeCalled();

        clipboard.copyLinkToClipboard(dummyResponse);

        expect(writeToOffscreenClipboardSpy).toBeCalledTimes(1);
        expect(naviClipboardSpy).not.toBeCalled();
        mock.restore();
    });


    test("use navigator clipboard if chrome is not detected", async () => {
        isCromeSpy.mockReturnValueOnce(false);
        writeToOffscreenClipboardSpy.mockResolvedValueOnce(undefined);
        const naviClipboardSpy = spyOn(navigator.clipboard, 'writeText');

        expect(writeToOffscreenClipboardSpy).not.toBeCalled();
        expect(naviClipboardSpy).not.toBeCalled();

        clipboard.copyLinkToClipboard(dummyResponse);

        expect(writeToOffscreenClipboardSpy).not.toBeCalled();
        expect(naviClipboardSpy).toBeCalledTimes(1);
        mock.restore();
    });

    test("throws an exception if navigator clipboard doesn't exist", async () => {
        isCromeSpy.mockReturnValueOnce(false);

        const naviClipboardSpy = spyOn(navigator.clipboard, 'writeText');
        naviClipboardSpy.mockImplementationOnce(async () => { throw new Error("mock error") });

        expect(async () => { await clipboard.copyLinkToClipboard(dummyResponse) }).toThrow("Failed to copy to clipboard");
        mock.restore();
    });
});


describe("isChrome", async () => {
    function getChromeGlobalAndNavi({ chrome, navi }: { chrome: boolean, navi: boolean }): [typeof chrome, Clipboard | undefined] {
        global.chrome = (chrome ? mock() : undefined) as any;
        const retNavi = navi ? navigator.clipboard : undefined;
        if (chrome) {
            expect(chrome).toBeTruthy();
        } else {
            expect(chrome).toBeFalsy();
        }

        if (retNavi) {
            expect(retNavi).toBeTruthy();
            expect(retNavi.writeText).toBeTruthy();
        } else {
            expect(retNavi).toBeFalsy();
        }

        return [chrome, retNavi];

    }
    function testName(defined: boolean): string { return (defined ? "" : "un") + "defined" }

    const table = [
        { useChrome: true, useNavi: false, expected: true },
        { useChrome: false, useNavi: false, expected: false },
        { useChrome: true, useNavi: true, expected: false },
        { useChrome: false, useNavi: false, expected: false },
    ];


    for (const { useChrome, useNavi, expected } of table) {
        test(`${testName(useChrome)}/${testName(useNavi)} chrome global/navi clipboard returns ${expected}`, async () => {
            const [_, navi] = getChromeGlobalAndNavi({ chrome: useChrome, navi: useNavi });
            expect(await clipboard.isChrome(navi)).toStrictEqual(expected);
        });
    }
});
