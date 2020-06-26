const privateData = new WeakMap()

function fire(name: string, target: Element) {
  setTimeout(function () {
    target.dispatchEvent(new Event(name))
  }, 0)
}

async function handleData(el: IncludeFragmentElement) {
  // eslint-disable-next-line github/no-then
  return getData(el).then(
    function (html: string) {
      const template = document.createElement('template')
      template.innerHTML = html
      const fragment = document.importNode(template.content, true)
      const canceled = !el.dispatchEvent(new CustomEvent('include-fragment-replace', {cancelable: true, detail: {fragment}}))
      if (canceled) return
      el.replaceWith(fragment)
      el.dispatchEvent(new CustomEvent('include-fragment-replaced'))
    },
    function () {
      el.classList.add('is-error')
    }
  )
}

function getData(el: IncludeFragmentElement) {
  const src = el.src
  let data = privateData.get(el)
  if (data && data.src === src) {
    return data.data
  } else {
    if (src) {
      data = el.load()
    } else {
      data = Promise.reject(new Error('missing src'))
    }
    privateData.set(el, {src, data})
    return data
  }
}

function isWildcard(accept: string | null) {
  return accept && !!accept.split(',').find(x => x.match(/^\s*\*\/\*/))
}

export default class IncludeFragmentElement extends HTMLElement {
  _attached: boolean

  constructor() {
    super()
    this._attached = false
  }

  static get observedAttributes(): string[] {
    return ['src']
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

  get accept(): string {
    return this.getAttribute('accept') || ''
  }

  set accept(val: string) {
    this.setAttribute('accept', val)
  }

  get data(): Promise<string> {
    return getData(this)
  }

  attributeChangedCallback(attribute: string): void {
    if (attribute === 'src') {
      // Source changed after attached so replace element.
      if (this._attached) {
        handleData(this)
      }
    }
  }

  connectedCallback(): void {
    this._attached = true
    if (this.src) {
      handleData(this)
    }
  }

  disconnectedCallback(): void {
    this._attached = false
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
        Accept: this.accept || 'text/html'
      }
    })
  }

  load(): Promise<string> {
    return Promise.resolve()
      .then(() => {
        fire('loadstart', this)
        return this.fetch(this.request())
      })
      .then(response => {
        if (response.status !== 200) {
          throw new Error(`Failed to load resource: the server responded with a status of ${response.status}`)
        }
        const ct = response.headers.get('Content-Type')
        if (!isWildcard(this.accept) && (!ct || !ct.includes(this.accept ? this.accept : 'text/html'))) {
          throw new Error(`Failed to load resource: expected ${this.accept || 'text/html'} but was ${ct}`)
        }
        return response
      })
      .then(response => response.text())
      .then(
        data => {
          fire('load', this)
          fire('loadend', this)
          return data
        },
        error => {
          fire('error', this)
          fire('loadend', this)
          throw error
        }
      )
  }

  fetch(request: RequestInfo): Promise<Response> {
    return fetch(request)
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
