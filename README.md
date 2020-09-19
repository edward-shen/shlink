# Shlink Extension (Unofficial)

This minimalist extension provides a shortcut button to generate a short url
using [Shlink][home-page].

## Usage

Click the extension and a short link will be requested from your instance
for the page you're currently on. This short link will be copied to your
clipboard, so you can easily paste it.

## Requirements

An existing Shlink installation that's ready to use. If you don't have one,
take a look at their [Getting Started page][getting-started].

## Installation

Once installed from the Firefox store, you'll need to set it up with your API
key and host URL information:

1. Go to about:addons, then select extensions.
2. Next, select the Shlink extension.
3. Then, there will be a Preferences tab. Here, you'll need to enter your [API
key][api-key-docs] and point to where your Shlink instance is located.

Once all these steps are complete, the extension should be ready to use.

## Privacy

This extension does not log any information by itself, and only communicates
with the Shlink instance you provide in its preferences. All other information
is kept local.

This extension keeps your API key in plaintext in your local browser storage.

### Permissions used

| Permission                        | Reason |
| --------------------------------- | ------ |
| [`tabs`][tabs-api]                | Needed so that the extension read the current active tab. |
| [`notifications`][notif-api]      | Needed so that the extension can inform users if generating the short link was successful or not. |
| [`clipboardWrite`][clipboard-api] | Needed so that the extension can copy the short link to your clipboard. |
| [`storage`][storage-api]          | Needed so that the extension can save the location of a Shlinker instance and your API key. |
| [`<all_urls>`][all-urls-api]      | Needed so that the extension can run on every page. |

## Technical Notes

This extension will always send a `findIfExists` request alongside the `longUrl`, so requesting multiple links from the same page will return an identical link.

[home-page]: https://shlink.io
[getting-started]: https://shlink.io/documentation
[api-key-docs]: https://shlink.io/documentation/api-docs/authentication/
[tabs-api]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs
[notif-api]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/notifications
[clipboard-api]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/clipboard
[storage-api]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage
[all-urls-api]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns