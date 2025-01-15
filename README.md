# Shlink Extension (Unofficial)

<a href="https://chrome.google.com/webstore/detail/shlink/mgdacpmionfhhogkokjbdeehfnnliajj" target="_blank"><img src="https://imgur.com/3C4iKO0.png" width="64" height="64"></a>
<a href="https://addons.mozilla.org/en-US/firefox/addon/shlink/" target="_blank"><img src="https://imgur.com/ihXsdDO.png" width="64" height="64"></a>
<a href="https://chrome.google.com/webstore/detail/shlink/mgdacpmionfhhogkokjbdeehfnnliajj" target="_blank"><img src="https://imgur.com/EuDp4vP.png" width="64" height="64"></a>
<a href="https://chrome.google.com/webstore/detail/shlink/mgdacpmionfhhogkokjbdeehfnnliajj" target="_blank"><img src="https://imgur.com/z8yjLZ2.png" width="64" height="64"></a>
<a href="https://addons.mozilla.org/en-US/firefox/addon/shlink/" target="_blank"><img src="https://imgur.com/MQYBSrD.png" width="64" height="64"></a>

This extension provides a shortcut button to generate a short url using
[Shlink][home-page].

## Usage

Click the extension and a short link will be requested from your instance for
the page you're currently on. This short link will be copied to your clipboard,
so you can easily paste it.

## Requirements

An existing Shlink installation that's ready to use. If you don't have one, take
a look at their [Getting Started page][getting-started] to learn how to run your
own instance.

## Installation

Once installed, you'll need to set it up with your API key and host URL
information:

1. Right click the Shlink button in the top right and select the option to
   manage the extension.
   - In Chrome, you would select "Options".
   - In Firefox, you would select "Manage Extension".
2. (Firefox only) Then, select the Preferences tab.
3. Here, you'll need to enter your [API key][api-key-docs] and point to where
   your Shlink instance is located.

Once all these steps are complete, the extension should be ready to use. If you
encounter any errors, check to see if your API key is correct and you're pointed
to the right domain.

## Privacy

This extension does not log any information by itself, and only communicates
with the Shlink instance you provide in its preferences. All other information
is kept local.

This extension keeps your API key in plaintext in your local browser storage.

### Permissions used

| Permission                        | Reason                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| [`activeTab`][tabs-api]           | Needed so that the extension read the current active tab.                                         |
| [`notifications`][notif-api]      | Needed so that the extension can inform users if generating the short link was successful or not. |
| [`clipboardWrite`][clipboard-api] | Needed so that the extension can copy the short link to your clipboard.                           |
| [`offscreen`][offscreen-api]      | _Chrome only_. Needed to [workaround clipboard writing] to an offscreen doc.                      |
| [`storage`][storage-api]          | Needed so that the extension can save the location of a Shlinker instance and your API key.       |

[home-page]: https://shlink.io
[getting-started]: https://shlink.io/documentation
[api-key-docs]: https://shlink.io/documentation/api-docs/authentication/
[tabs-api]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs
[notif-api]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/notifications
[clipboard-api]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/clipboard
[offscreen-api]: https://developer.chrome.com/docs/extensions/reference/api/offscreen
[workaround clipboard writing]: https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3/
[storage-api]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage

## Developing

### Pre-requsities

- `bun`
- `web-ext`

Then, run `bun install`.

### Running

```sh
bun run watch
```

This starts two scripts that watches for changes and updates the extension on an
test browser instance.

Currently, the watch script accepts additional args to be provided to the
`web-ext` script. By default, it opens up a firefox instance, but you can change
it by providing a `--target` option:

```sh
bun run watch -- --target chromium
```

### Testing

todo

### Notes

Currently, `bundle.mts` watches for changes in the `assets/` and `src` folder.
On change, this triggers `bun` to output data into the `dist` folder. The `dist`
folder is watched/used by `web-ext` for testing/building.

The `assets/` folder are items that should be directly copied over without
changes to the `dist` folder. This is for things that `bun` either name-mangles
or "helps" out by processing it into a `.js` file. Notably, the manifest file
and various "simplier" files are here.

The `src/` folder contains assets that need to be compiled. This is for any
other files.
