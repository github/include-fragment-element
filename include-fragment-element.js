/* eslint-disable github/no-then */

const privateData = new WeakMap()

function fire(name, target) {
  setTimeout(function() {
    const event = target.ownerDocument.createEvent('Event')
    event.initEvent(name, false, false)
    target.dispatchEvent(event)
  }, 0)
}

function handleData(el, data) {
  return data.then(
    function(html) {
      const parentNode = el.parentNode
      if (parentNode) {
        el.insertAdjacentHTML('afterend', html)
        parentNode.removeChild(el)

        // Hack to get custom elements in html upgraded
        // https://github.com/webcomponents/custom-elements/issues/104
        parentNode.innerHTML = parentNode.innerHTML
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

export class IncludeFragmentElement extends HTMLElement {
  constructor() {
    super()
    // Preload data cache
    getData(this)['catch'](function() {
      // Ignore `src missing` error on pre-load.
    })
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

  get data() {
    return getData(this)
  }

  attributeChangedCallback(attribute) {
    if (attribute === 'src') {
      // Reload data load cache.
      const data = getData(this)

      // Source changed after attached so replace element.
      if (this._attached) {
        handleData(this, data)
      }
    }
  }

  connectedCallback() {
    this._attached = true
    if (this.src) {
      handleData(this, getData(this))
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
        Accept: 'text/html'
      }
    })
  }

  load() {
    const self = this

    return Promise.resolve()
      .then(function() {
        const request = self.request()
        fire('loadstart', self)
        return self.fetch(request)
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
          fire('load', self)
          fire('loadend', self)
          return data
        },
        function(error) {
          fire('error', self)
          fire('loadend', self)
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
