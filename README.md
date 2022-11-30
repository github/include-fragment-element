# &lt;include-fragment&gt; element

A Client Side Includes tag.

## Installation

```
$ npm install --save @github/include-fragment-element
```

## Usage

All `include-fragment` elements must have a `src` attribute from which to retrieve an HTML element fragment.

The initial page load should include fallback content to be displayed if the resource could not be fetched immediately.

```js
import '@github/include-fragment-element'
```

**Original**

``` html
<div class="tip">
  <include-fragment src="/tips">
    <p>Loading tip…</p>
  </include-fragment>
</div>
```

On page load, the `include-fragment` element fetches the URL, the response is parsed into an HTML element, which replaces the `include-fragment` element entirely.

**Result**

``` html
<div class="tip">
  <p>You look nice today</p>
</div>
```

The server must respond with an HTML fragment to replace the `include-fragment` element. It should not contain _another_ `include-fragment` element or the server will be polled in an infinite loop.

### Other Attributes

#### accept

This attribute tells `<include-fragment/>` what to send as the `Accept` header, as part of the fetch request. If omitted, or if set to an empty value, the default behaviour will be `text/html`. It is important that the server responds with HTML, but you may wish to change the accept header to help negotiate the right content with the server.

#### loading

This indicates _when_ the contents should be fetched:

 - `eager`: Fetches and load the content immediately, regardless of whether or not the `<include-fragment/>` is currently within the visible viewport (this is the default value).
 - `lazy`: Defers fetching and loading the content until the `<include-fragment/>` tag reaches a calculated distance from the viewport. The intent is to avoid the network and storage bandwidth needed to handle the content until it's reasonably certain that it will be needed.

### Errors

If the URL fails to load, the `include-fragment` element is left in the page and tagged with an `is-error` CSS class that can be used for styling.

### Events

Request lifecycle events are dispatched on the `<include-fragment>` element.

- `loadstart` - The server fetch has started.
- `load` - The request completed successfully.
- `error` - The request failed.
- `loadend` - The request has completed.
- `include-fragment-replace` (cancelable) - The success response has been parsed. It comes with `event.detail.fragment` that will replace the current element.
- `include-fragment-replaced` - The element has been replaced by the fragment.

```js
const loader = document.querySelector('include-fragment')
const container = loader.parentElement
loader.addEventListener('loadstart', () => container.classList.add('is-loading'))
loader.addEventListener('loadend', () => container.classList.remove('is-loading'))
loader.addEventListener('load', () => container.classList.add('is-success'))
loader.addEventListener('error', () => container.classList.add('is-error'))
```

### Options

Attribute      | Options                        | Description
---            | ---                            | ---
`src`          | URL string                     | Required URL from which to load the replacement HTML element fragment.


### Deferred loading

The request for replacement markup from the server starts when the `src` attribute becomes available on the `<include-fragment>` element. Most often this will happen at page load when the element is rendered. However, if we omit the `src` attribute until some later time, we can defer loading the content at all.

The [`<details-menu>`][menu] element uses this technique to defer loading menu content until the menu is first opened.

[menu]: https://github.com/github/details-menu-element

## Patterns

Deferring the display of markup is typically done in the following usage patterns.

- A user action begins a slow running background job on the server, like backing up files stored on the server. While the backup job is running, a progress bar is shown to the user. When it's complete, the include-fragment element is replaced with a link to the backup files.

- The first time a user visits a page that contains a time-consuming piece of markup to generate, a loading indicator is displayed. When the markup is finished building on the server, it's stored in memcache and sent to the browser to replace the include-fragment loader. Subsequent visits to the page render the cached markup directly, without going through a include-fragment element.

### CSP Trusted Types

You can call `setCSPTrustedTypesPolicy(policy: TrustedTypePolicy | Promise<TrustedTypePolicy> | null)` from JavaScript to set a [CSP trusted types policy](https://web.dev/trusted-types/), which can perform (synchronous) filtering or rejection of the `fetch` response before it is inserted into the page:

```ts
import IncludeFragmentElement from "include-fragment-element";
import DOMPurify from "dompurify"; // Using https://github.com/cure53/DOMPurify

// This policy removes all HTML markup except links.
const policy = trustedTypes.createPolicy("links-only", {
  createHTML: (htmlText: string) => {
    return DOMPurify.sanitize(htmlText, {
      ALLOWED_TAGS: ["a"],
      ALLOWED_ATTR: ["href"],
      RETURN_TRUSTED_TYPE: true,
    });
  },
});
IncludeFragmentElement.setCSPTrustedTypesPolicy(policy);
```

The policy has access to the `fetch` response object. Due to platform constraints, only synchronous information from the response (in addition to the HTML text body) can be used in the policy:

```ts
import IncludeFragmentElement from "include-fragment-element";

const policy = trustedTypes.createPolicy("require-server-header", {
  createHTML: (htmlText: string, response: Response) => {
    if (response.headers.get("X-Server-Sanitized") !== "sanitized=true") {
      // Note: this will reject the contents, but the error may be caught before it shows in the JS console.
      throw new Error("Rejecting HTML that was not marked by the server as sanitized.");
    }
    return htmlText;
  },
});
IncludeFragmentElement.setCSPTrustedTypesPolicy(policy);
```

Note that:

- Only a single policy can be set, shared by all `IncludeFragmentElement` fetches.
- You should call `setCSPTrustedTypesPolicy()` ahead of any other load of `include-fragment-element` in your code.
  - If your policy itself requires asynchronous work to construct, you can also pass a `Promise<TrustedTypePolicy>`.
  - Pass `null` to remove the policy.
- Not all browsers [support the trusted types API in JavaScript](https://caniuse.com/mdn-api_trustedtypes). You may want to use the [recommended tinyfill](https://github.com/w3c/trusted-types#tinyfill) to construct a policy without causing issues in other browsers.

## Relation to Server Side Includes

This declarative approach is very similar to [SSI](http://en.wikipedia.org/wiki/Server_Side_Includes) or [ESI](http://en.wikipedia.org/wiki/Edge_Side_Includes) directives. In fact, an edge implementation could replace the markup before its actually delivered to the client.

``` html
<include-fragment src="/github/include-fragment/commit-count" timeout="100">
  <p>Counting commits…</p>
</include-fragment>
```

A proxy may attempt to fetch and replace the fragment if the request finishes before the timeout. Otherwise the tag is delivered to the client. This library only implements the client side aspect.

## Browser support

Browsers without native [custom element support][support] require a [polyfill][]. Legacy browsers require various other polyfills. See [`examples/index.html`][example] for details.

[example]: https://github.com/github/include-fragment-element/blob/master/examples/index.html#L5-L14

- Chrome
- Firefox
- Safari
- Microsoft Edge

[support]: https://caniuse.com/#feat=custom-elementsv1
[polyfill]: https://github.com/webcomponents/custom-elements

## Development

```
npm install
npm test
```

## License

Distributed under the MIT license. See LICENSE for details.
