export class IncludeFragmentElement extends HTMLElement {
  constructor() {
    super()
    this._privateData = new WeakMap()
    // Preload data cache
    this._getData()['catch'](function() {
      // Ignore `src missing` error on pre-load.
    })
  }

  _fire(name) {
    setTimeout(
      function() {
        const event = this.ownerDocument.createEvent('Event')
        event.initEvent(name, false, false)
        this.dispatchEvent(event)
      }.bind(this),
      0
    )
  }

  async _handleData(data) {
    try {
      const html = await data
      const parentNode = this.parentNode
      if (parentNode) {
        this.insertAdjacentHTML('afterend', html)
        parentNode.removeChild(this)
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err)
      this.classList.add('is-error')
    }
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
    if (val) {
      this.setAttribute('src', val)
    } else {
      this.removeAttribute('src')
    }
  }

  _getData() {
    const src = this.src
    let data = this._privateData.get(this)
    if (data && data.src === src) {
      return data.data
    } else {
      if (src) {
        data = this._load()
      } else {
        data = Promise.reject(new Error('missing src'))
      }
      this._privateData.set(this, {src, data})
      return data
    }
  }

  get data() {
    return this._getData()
  }

  attributeChangedCallback(attribute) {
    if (attribute === 'src') {
      // Reload data load cache.
      const data = this._getData()

      // Source changed after attached so replace element.
      if (this._attached) {
        this._handleData(data)
      }
    }
  }

  connectedCallback() {
    this._attached = true
    if (this.src) {
      this._handleData(this._getData())
    }
  }

  disconnectedCallback() {
    this._attached = false
  }

  _request() {
    const src = this.src
    if (!src) {
      throw new Error('missing src')
    }

    return new Request(src, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'text/html'
      }
    })
  }

  async _load() {
    const request = this._request()
    this._fire('loadstart')
    const response = await this._fetch(request)

    if (response.status !== 200) {
      throw new Error(`Failed to load resource: the server responded with a status of ${response.status}`)
    }

    const ct = response.headers.get('Content-Type')
    if (!ct || !ct.match(/^text\/html/)) {
      throw new Error(`Failed to load resource: expected text/html but was ${ct}`)
    }

    try {
      const data = await response.text()
      this._fire('load')
      this._fire('loadend')
      return data
    } catch (error) {
      this._fire('error')
      this._fire('loadend')
      throw error
    }
  }

  _fetch(request) {
    return fetch(request)
  }
}

if (!window.customElements.get('include-fragment')) {
  window.customElements.define('include-fragment', IncludeFragmentElement)
}
