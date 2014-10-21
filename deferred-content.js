(function() {
  'use strict';

  var loadSrc  = new WeakMap()
  var loadData = new WeakMap()

  function fire(name, target) {
    setTimeout(function() {
      var event = document.createEvent('Event')
      event.initEvent(name, true, true)
      target.dispatchEvent(event)
    }, 0)
  }

  function load(el, url) {
    fire('loadstart', el)
    return el.fetch(url).then(function(data) {
      fire('load', el)
      fire('loadend', el)
      return data
    }, function(error) {
      fire('error', el)
      fire('loadend', el)
      throw error
    })
  }

  function reload(el, src) {
    var data = src ? load(el, src) :
      Promise.reject(new Error('missing src'))
    loadSrc.set(el, src)
    loadData.set(el, data)
    return data
  }

  function handleData(el, data) {
    return data.then(function(html) {
      el.insertAdjacentHTML('afterend', html)
      el.parentNode.removeChild(el)
    }, function() {
      el.classList.add('is-error')
    })
  }

  var DeferredContentPrototype = Object.create(window.HTMLElement.prototype)

  Object.defineProperty(DeferredContentPrototype, 'src', {
    get: function() {
      var src = this.getAttribute('src')
      if (src) {
        var link = this.ownerDocument.createElement('a')
        link.href = src
        return link.href
      } else {
        return ''
      }
    },
    set: function(value) {
      this.setAttribute('src', value)
    }
  })

  Object.defineProperty(DeferredContentPrototype, 'data', {
    get: function() {
      var src = this.src
      if (loadSrc.get(this) === src) {
        return loadData.get(this)
      } else {
        return reload(this, src)
      }
    }
  })

  DeferredContentPrototype.attributeChangedCallback = function(attrName, oldValue, newValue) {
    // Reload data load cache
    if (attrName === 'src') {
      loadSrc['delete'](this)
      loadData['delete'](this)
      this.data
    }
  }

  DeferredContentPrototype.createdCallback = function() {
    // Preload data cache
    this.data
  }

  DeferredContentPrototype.attachedCallback = function() {
    handleData(this, this.data)
  }

  DeferredContentPrototype.fetch = function(url) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        switch (xhr.status) {
          case 200:
            resolve(xhr.responseText)
            break
          default:
            reject()
            break
        }
      }

      xhr.onerror = function() {
        reject()
      }

      xhr.open('GET', url)
      xhr.send()
    })
  }

  window.DeferredContentElement = document.registerElement('deferred-content', {
    prototype: DeferredContentPrototype
  })


  var PollDeferredContentPrototype = Object.create(DeferredContentPrototype)

  PollDeferredContentPrototype.fetch = function(url) {
    return new Promise(function(resolve, reject) {
      function poll(wait) {
        var xhr = new XMLHttpRequest()

        xhr.onload = function() {
          switch (xhr.status) {
            case 200:
              resolve(xhr.responseText)
              break
            case 202:
            case 404:
              window.setTimeout(function() {
                poll(wait * 1.5)
              }, wait)
              break
            default:
              reject()
              break
          }
        }

        xhr.onerror = function() {
          reject()
        }

        xhr.open('GET', url)
        xhr.send()
      }

      poll(1000)
    })
  }

  window.PollDeferredContentElement = document.registerElement('poll-deferred-content', {
    prototype: PollDeferredContentPrototype
  })
})();
