const privateData = new WeakMap()

function fire(name, target) {
  setTimeout(function() {
    target.dispatchEvent(new Event(name))
  }, 0)
}

function handleData(el) {
  return getData(el).then(
    function(html) {
      const parentNode = el.parentNode
      if (parentNode) {
        el.insertAdjacentHTML('afterend', html)
        parentNode.removeChild(el)
      }
    },
    function() {
      el.classList.add('is-error')
    }
  )
}

function getData(el) {
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

function isWildcard(accept) {
  return accept && !!accept.split(',').find(x => x.match(/^\s*\*\/\*/))
}

export default class IncludeFragmentElement extends HTMLElement {
  constructor() {
    super()
  }

  static get observedAttributes() {
    return ['src']
  }

  get src() {
    const src = this.getAttribute('src')
    if (src) {
      const link = this.ownerDocument.createElement('a')
      link.href = src
      return link.href
    } else {
      return ''
    }
  }

  set src(val) {
    this.setAttribute('src', val)
  }

  get accept() {
    return this.getAttribute('accept')
  }

  set accept(val) {
    this.setAttribute('accept', val)
  }

  get data() {
    return getData(this)
  }

  attributeChangedCallback(attribute) {
    if (attribute === 'src') {
      // Source changed after attached so replace element.
      if (this._attached) {
        handleData(this)
      }
    }
  }

  connectedCallback() {
    this._attached = true
    if (this.src) {
      handleData(this)
    }
  }

  disconnectedCallback() {
    this._attached = false
  }

  request() {
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

  load() {
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

  fetch(request) {
    return fetch(request)
  }
}

if (!window.customElements.get('include-fragment')) {
  window.IncludeFragmentElement = IncludeFragmentElement
  window.customElements.define('include-fragment', IncludeFragmentElement)
}
