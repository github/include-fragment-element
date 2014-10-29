# &lt;deferred-content&gt; custom element

Replaces an element with the result of an XMLHttpRequest, deferring the building of the replacement element until it's ready on the server.

## Installation

Available on [Bower](http://bower.io) as **deferred-content**.

```
$ bower install deferred-content
```

This component is built on the [Web Component](http://webcomponents.org/) stack. Specifically, it requires a feature called [Custom Elements](http://www.html5rocks.com/en/tutorials/webcomponents/customelements/). You'll need to use a polyfill to get this feature today. Either the [Polymer](http://www.polymer-project.org/) or [X-Tag](http://www.x-tags.org/) frameworks supply a polyfill, or you can install the standalone [CustomElements](https://github.com/Polymer/CustomElements) polyfill.

``` html
<script src="https://cdnjs.cloudflare.com/ajax/libs/polymer/0.2.2/platform.js"></script>
```

## Usage

All `deferred-content` elements must have a `src` attribute from which to retrieve an HTML element fragment.

The initial page load must contain a `deferred-content` element with markup to be displayed while the deferred content is building on the server.

**Original:**

``` html
<div class="some-container">
  <deferred-content src="/users/hubot/contributions">
    <p>Loading…</p>
  </deferred-content>
</div>
```

On page load, the `deferred-content` element retrieves the URL via an XMLHttpRequest, the response is parsed into an HTML element, which replaces the `deferred-content` element entirely.

**Result:**

``` html
<div class="some-container">
  <svg>…</svg>
</div>
```

The server must respond with an HTML fragment to replace the `deferred-content` element. It must not contain _another_ `deferred-content` element or the server will be polled in an infinite loop.

### Polling

If the URL returns a 202 Accepted or 404 Not Found HTTP status code, the `deferred-content` element will poll the resource until a 200 status is returned. This is useful for a user action starting a background job on the server, then polling a URL resource for the job's result.

### Errors

If the URL fails to load, the `deferred-content` element is left in the page and tagged with an `is-error` CSS class that can be used for styling. No additional polling requests are made to the URL after an error occurs.

### Options

Attribute      | Options                        | Description
---            | ---                            | ---
`src`          | URL string                     | Required URL from which to load the replacement HTML element fragment.

## Patterns

Deferring the display of markup is typically done in the following usage patterns.

- A user action begins a slow running background job on the server, like backing up files stored on the server. While the backup job is running, a progress bar is shown to the user. When it's complete, the deferred-content element is replaced with a link to the backup files.

- The first time a user visits a page, containing a time-consuming piece of markup to generate, a loading indicator is displayed. When the markup is finished building on the server, it's stored in memcache and sent to the browser to replace the deferred-content loader. Subsequent visits to the page render the cached markup directly, without going through a deferred-content element.

## Browser Support

![Chrome](https://raw.github.com/alrra/browser-logos/master/chrome/chrome_48x48.png) | ![Firefox](https://raw.github.com/alrra/browser-logos/master/firefox/firefox_48x48.png) | ![IE](https://raw.github.com/alrra/browser-logos/master/internet-explorer/internet-explorer_48x48.png) | ![Opera](https://raw.github.com/alrra/browser-logos/master/opera/opera_48x48.png) | ![Safari](https://raw.github.com/alrra/browser-logos/master/safari/safari_48x48.png)
--- | --- | --- | --- | --- |
Latest ✔ | Latest ✔ | 9+ ✔ | Latest ✔ | 6.1+ ✔ |
