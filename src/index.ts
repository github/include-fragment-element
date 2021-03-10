const privateData = new WeakMap()

const observer = new IntersectionObserver(entries => {
  for(const entry of entries) {
    if (entry.isIntersecting) {
      const {target} = entry 
      observer.unobserve(target)
      if (!(target instanceof IncludeFragmentElement)) return
      if (target.loading === 'lazy') {
        handleData(target)
      }
    }
  }
}, {
  // Currently the threshold is set to 256px from the bottom of the viewport
  // with a threshold of 0.1. This means the element will not load until about
  // 2 keyboard-down-arrow presses away from being visible in the viewport,
  // giving us some time to fetch it before the contents are made visible
  rootMargin: '0px 0px 256px 0px',
  threshold: 0.01
})


// Functional stand in for the W3 spec "queue a task" paradigm
function task(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

async function handleData(el: IncludeFragmentElement) {
  observer.unobserve(el)
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

  get loading(): 'eager'|'lazy'  {
    if (this.getAttribute('loading') === 'lazy') return 'lazy'
    return 'eager'
  }

  set loading(value: 'eager'|'lazy') {
    this.setAttribute('loading', value)
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

  attributeChangedCallback(attribute: string, oldVal:string|null): void {
    if (attribute === 'src') {
      // Source changed after attached so replace element.
      if (this.isConnected && this.loading === 'eager') {
        handleData(this)
      }
    } else if (attribute === 'loading') {
      // Loading mode changed to Eager after attached so replace element.
      if (this.isConnected && oldVal !== 'eager' && this.loading === 'eager') {
        handleData(this)
      }
    }
  }

  connectedCallback(): void {
    if (this.src && this.loading === 'eager') {
      handleData(this)
    }
    if (this.loading === 'lazy') {
      observer.observe(this)
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
        Accept: this.accept || 'text/html'
      }
    })
  }

  load(): Promise<string> {
    observer.unobserve(this)
    // We mimic the same event order as <img>, including the spec
    // which states events must be dispatched after "queue a task".
    // https://www.w3.org/TR/html52/semantics-embedded-content.html#the-img-element
    return task()
      .then(() => {
        this.dispatchEvent(new Event('loadstart'))
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
        return response.text()
      })
      .then(data => {
        // Dispatch `load` and `loadend` async to allow
        // the `load()` promise to resolve _before_ these
        // events are fired.
        task().then(() => {
          this.dispatchEvent(new Event('load'))
          this.dispatchEvent(new Event('loadend'))
        })
        return data
      }, error => {
        // Dispatch `error` and `loadend` async to allow
        // the `load()` promise to resolve _before_ these
        // events are fired.
        task().then(() => {
          this.dispatchEvent(new Event('error'))
          this.dispatchEvent(new Event('loadend'))
        })
        throw error
      })
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
