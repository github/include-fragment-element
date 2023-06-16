interface CachedData {
  src: string
  data: Promise<string | CSPTrustedHTMLToStringable>
}
const privateData = new WeakMap<IncludeFragmentElement, CachedData>()

function isWildcard(accept: string | null) {
  return accept && !!accept.split(',').find(x => x.match(/^\s*\*\/\*/))
}

// CSP trusted types: We don't want to add `@types/trusted-types` as a
// dependency, so we use the following types as a stand-in.
interface CSPTrustedTypesPolicy {
  createHTML: (s: string, response: Response) => CSPTrustedHTMLToStringable
}
// Note: basically every object (and some primitives) in JS satisfy this
// `CSPTrustedHTMLToStringable` interface, but this is the most compatible shape
// we can use.
interface CSPTrustedHTMLToStringable {
  toString: () => string
}
let cspTrustedTypesPolicyPromise: Promise<CSPTrustedTypesPolicy> | null = null

export class IncludeFragmentElement extends HTMLElement {
  static define(tag = 'include-fragment', registry = customElements) {
    registry.define(tag, this)
    return this
  }

  // Passing `null` clears the policy.
  static setCSPTrustedTypesPolicy(policy: CSPTrustedTypesPolicy | Promise<CSPTrustedTypesPolicy> | null): void {
    cspTrustedTypesPolicyPromise = policy === null ? policy : Promise.resolve(policy)
  }

  static get observedAttributes(): string[] {
    return ['src', 'loading']
  }

  get src(): string {
    const src = this.getAttribute('src')
    if (src) {
      const link = this.ownerDocument!.createElement('a')
      link.href = src
      return link.href
    } else {
      return ''
    }
  }

  set src(val: string) {
    this.setAttribute('src', val)
  }

  get loading(): 'eager' | 'lazy' {
    if (this.getAttribute('loading') === 'lazy') return 'lazy'
    return 'eager'
  }

  set loading(value: 'eager' | 'lazy') {
    this.setAttribute('loading', value)
  }

  get accept(): string {
    return this.getAttribute('accept') || ''
  }

  set accept(val: string) {
    this.setAttribute('accept', val)
  }

  // We will return string or error for API backwards compatibility. We can consider
  // returning TrustedHTML in the future.
  get data(): Promise<string> {
    return this.#getStringOrErrorData()
  }

  #busy = false

  attributeChangedCallback(attribute: string, oldVal: string | null): void {
    if (attribute === 'src') {
      // Source changed after attached so replace element.
      if (this.isConnected && this.loading === 'eager') {
        this.#handleData()
      }
    } else if (attribute === 'loading') {
      // Loading mode changed to Eager after attached so replace element.
      if (this.isConnected && oldVal !== 'eager' && this.loading === 'eager') {
        this.#handleData()
      }
    }
  }

  connectedCallback(): void {
    if (!this.shadowRoot) {
      this.attachShadow({mode: 'open'})
      const style = document.createElement('style')
      style.textContent = `:host {display: block;}`
      this.shadowRoot!.append(style, document.createElement('slot'))
    }
    if (this.src && this.loading === 'eager') {
      this.#handleData()
    }
    if (this.loading === 'lazy') {
      this.#observer.observe(this)
    }
  }

  request(): Request {
    const src = this.src
    if (!src) {
      throw new Error('missing src')
    }

    return new Request(src, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: this.accept || 'text/html',
      },
    })
  }

  load(): Promise<string> {
    return this.#getStringOrErrorData()
  }

  fetch(request: RequestInfo): Promise<Response> {
    return fetch(request)
  }

  refetch() {
    privateData.delete(this)
    this.#handleData()
  }

  #observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const {target} = entry
          this.#observer.unobserve(target)
          if (!(target instanceof IncludeFragmentElement)) return
          if (target.loading === 'lazy') {
            this.#handleData()
          }
        }
      }
    },
    {
      // Currently the threshold is set to 256px from the bottom of the viewport
      // with a threshold of 0.1. This means the element will not load until about
      // 2 keyboard-down-arrow presses away from being visible in the viewport,
      // giving us some time to fetch it before the contents are made visible
      rootMargin: '0px 0px 256px 0px',
      threshold: 0.01,
    },
  )

  async #handleData(): Promise<void> {
    if (this.#busy) return
    this.#busy = true
    this.#observer.unobserve(this)
    try {
      const data = await this.#getData()
      if (data instanceof Error) {
        throw data
      }
      // Until TypeScript is natively compatible with CSP trusted types, we
      // have to treat this as a string here.
      // https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1246
      const dataTreatedAsString = data as string

      const template = document.createElement('template')
      // eslint-disable-next-line github/no-inner-html
      template.innerHTML = dataTreatedAsString
      const fragment = document.importNode(template.content, true)
      const canceled = !this.dispatchEvent(
        new CustomEvent('include-fragment-replace', {
          cancelable: true,
          detail: {fragment},
        }),
      )
      if (canceled) {
        this.#busy = false
        return
      }

      this.replaceWith(fragment)
      this.dispatchEvent(new CustomEvent('include-fragment-replaced'))
    } catch {
      this.classList.add('is-error')
    } finally {
      this.#busy = false
    }
  }

  async #getData(): Promise<string | CSPTrustedHTMLToStringable> {
    const src = this.src
    const cachedData = privateData.get(this)
    if (cachedData && cachedData.src === src) {
      return cachedData.data
    } else {
      let data: Promise<string | CSPTrustedHTMLToStringable>
      if (src) {
        data = this.#fetchDataWithEvents()
      } else {
        data = Promise.reject(new Error('missing src'))
      }
      privateData.set(this, {src, data})
      return data
    }
  }

  async #getStringOrErrorData(): Promise<string> {
    const data = await this.#getData()
    if (data instanceof Error) {
      throw data
    }
    return data.toString()
  }

  // Functional stand in for the W3 spec "queue a task" paradigm
  async #task(eventsToDispatch: string[]): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0))
    for (const eventType of eventsToDispatch) {
      this.dispatchEvent(new Event(eventType))
    }
  }

  async #fetchDataWithEvents(): Promise<string | CSPTrustedHTMLToStringable> {
    // We mimic the same event order as <img>, including the spec
    // which states events must be dispatched after "queue a task".
    // https://www.w3.org/TR/html52/semantics-embedded-content.html#the-img-element
    try {
      await this.#task(['loadstart'])
      const response = await this.fetch(this.request())
      if (response.status !== 200) {
        throw new Error(`Failed to load resource: the server responded with a status of ${response.status}`)
      }
      const ct = response.headers.get('Content-Type')
      if (!isWildcard(this.accept) && (!ct || !ct.includes(this.accept ? this.accept : 'text/html'))) {
        throw new Error(`Failed to load resource: expected ${this.accept || 'text/html'} but was ${ct}`)
      }

      const responseText: string = await response.text()
      let data: string | CSPTrustedHTMLToStringable = responseText
      if (cspTrustedTypesPolicyPromise) {
        const cspTrustedTypesPolicy = await cspTrustedTypesPolicyPromise
        data = cspTrustedTypesPolicy.createHTML(responseText, response)
      }

      // Dispatch `load` and `loadend` async to allow
      // the `load()` promise to resolve _before_ these
      // events are fired.
      this.#task(['load', 'loadend'])
      return data
    } catch (error) {
      // Dispatch `error` and `loadend` async to allow
      // the `load()` promise to resolve _before_ these
      // events are fired.
      this.#task(['error', 'loadend'])
      throw error
    }
  }
}

declare global {
  interface Window {
    IncludeFragmentElement: typeof IncludeFragmentElement
  }
  interface HTMLElementTagNameMap {
    'include-fragment': IncludeFragmentElement
  }
}
if (!window.customElements.get('include-fragment')) {
  window.IncludeFragmentElement = IncludeFragmentElement
  window.customElements.define('include-fragment', IncludeFragmentElement)
}
