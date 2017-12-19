;(function() {
  'use strict'

  const privateData = new WeakMap()

  function fire(name, target) {
    setTimeout(function() {
      const event = target.ownerDocument.createEvent('Event')
      event.initEvent(name, false, false)
      target.dispatchEvent(event)
    }, 0)
  }

  async function handleData(el, data) {
    let html
    try {
      html = await data
    } catch (error) {
      el.classList.add('is-error')
    }

    const parentNode = el.parentNode
    if (parentNode) {
      el.insertAdjacentHTML('afterend', html)
      parentNode.removeChild(el)
    }
  }

  const IncludeFragmentPrototype = Object.create(window.HTMLElement.prototype)

  Object.defineProperty(IncludeFragmentPrototype, 'src', {
    get() {
      const src = this.getAttribute('src')
      if (src) {
        const link = this.ownerDocument.createElement('a')
        link.href = src
        return link.href
      } else {
        return ''
      }
    },

    set(value) {
      this.setAttribute('src', value)
    }
  })

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

  Object.defineProperty(IncludeFragmentPrototype, 'data', {
    get() {
      return getData(this)
    }
  })

  IncludeFragmentPrototype.attributeChangedCallback = function(attrName) {
    if (attrName === 'src') {
      // Reload data load cache.
      const data = getData(this)

      // Source changed after attached so replace element.
      if (this._attached) {
        handleData(this, data)
      }
    }
  }

  IncludeFragmentPrototype.createdCallback = function() {
    // Preload data cache
    getData(this)['catch'](function() {
      // Ignore `src missing` error on pre-load.
    })
  }

  IncludeFragmentPrototype.attachedCallback = function() {
    this._attached = true
    if (this.src) {
      handleData(this, getData(this))
    }
  }

  IncludeFragmentPrototype.detachedCallback = function() {
    this._attached = false
  }

  IncludeFragmentPrototype.request = function() {
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

  IncludeFragmentPrototype.load = async function() {
    const request = await this.request()
    fire('loadstart', this)
    const response = await this.fetch(request)
    if (response.status !== 200) {
      throw new Error(`Failed to load resource: the server responded with a status of ${response.status}`)
    }

    const ct = response.headers.get('Content-Type')
    if (!ct || !ct.match(/^text\/html/)) {
      throw new Error(`Failed to load resource: expected text/html but was ${ct}`)
    }

    let data
    try {
      data = await response.text()
    } catch (error) {
      fire('error', this)
      fire('loadend', this)
      throw error
    }
    fire('load', this)
    fire('loadend', this)
    return data
  }

  IncludeFragmentPrototype.fetch = function(request) {
    return fetch(request)
  }

  window.IncludeFragmentElement = document.registerElement('include-fragment', {
    prototype: IncludeFragmentPrototype
  })
})()
