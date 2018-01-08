export class IncludeFragmentElement extends HTMLElement {
  constructor() {
    super()
    this._privateData = new WeakMap()
    // Preload data cache
    this._getData()['catch'](function() {
      // Ignore `src missing` error on pre-load.
    })
  }

  _fire(name, target) {
    setTimeout(function() {
      const event = target.ownerDocument.createEvent('Event')
      event.initEvent(name, false, false)
      target.dispatchEvent(event)
    }, 0)
  }

  _handleData(data) {
    return data.then(
      function(html) {
        const parentNode = this.parentNode
        if (parentNode) {
          this.insertAdjacentHTML('afterend', html)
          parentNode.removeChild(this)
        }
      }.bind(this),
      function(err) {
        console.log(err)
        this.classList.add('is-error')
      }.bind(this)
    )
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

  _load() {
    const self = this

    return Promise.resolve()
      .then(function() {
        const request = self._request()
        self._fire('loadstart', self)
        return self._fetch(request)
      })
      .then(function(response) {
        if (response.status !== 200) {
          throw new Error(`Failed to load resource: the server responded with a status of ${response.status}`)
        }

        const ct = response.headers.get('Content-Type')
        if (!ct || !ct.match(/^text\/html/)) {
          throw new Error(`Failed to load resource: expected text/html but was ${ct}`)
        }

        return response
      })
      .then(function(response) {
        return response.text()
      })
      .then(
        function(data) {
          self._fire('load', self)
          self._fire('loadend', self)
          return data
        },
        function(error) {
          self._fire('error', self)
          self._fire('loadend', self)
          throw error
        }
      )
  }

  _fetch(request) {
    return fetch(request)
  }
}

if (!window.customElements.get('include-fragment')) {
  window.customElements.define('include-fragment', IncludeFragmentElement)
}
