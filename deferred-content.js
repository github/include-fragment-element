(function() {
  'use strict';

  function poll(el, wait) {
    var url = el.src
    if (!url) {
      return
    }

    var xhr = new XMLHttpRequest()
    xhr.onload = function() {
      switch (xhr.status) {
        case 200:
          el.insertAdjacentHTML('afterend', xhr.responseText)
          el.parentNode.removeChild(el)
          break
        case 202:
        case 404:
          var retry = poll.bind(this, el, wait * 1.5)
          el._pollId = window.setTimeout(retry, wait)
          break
        default:
          el.classList.add('is-error')
          break
      }
    }

    xhr.onerror = function() {
      el.classList.add('is-error')
    }

    xhr.open('GET', url)
    xhr.send(null)
    return xhr
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

  DeferredContentPrototype.createdCallback = function() {
    this._xhr = null
    this._pollId = null
  }

  DeferredContentPrototype.attachedCallback = function() {
    this._xhr = poll(this, 1000)
  }

  DeferredContentPrototype.detachedCallback = function() {
    if (this._xhr) {
      this._xhr.abort()
      this._xhr = null
    }

    if (this._pollId) {
      window.clearTimeout(this._pollId)
      this._pollId = null
    }
  }

  window.DeferredContentElement = document.registerElement('deferred-content', {
    prototype: DeferredContentPrototype
  })
})()
