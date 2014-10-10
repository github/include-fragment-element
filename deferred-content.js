(function() {
  'use strict';

  function fire(name, target) {
    var event = document.createEvent('Event')
    event.initEvent(name, true, true)
    target.dispatchEvent(event)
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

  DeferredContentPrototype.attachedCallback = function() {
    var self = this

    var url = self.src
    if (!url) {
      return
    }

    self.fetch(url).then(function(html) {
      self.insertAdjacentHTML('afterend', html)
      self.parentNode.removeChild(self)

      fire('load', self)
      fire('loadend', self)
    }, function() {
      self.classList.add('is-error')

      fire('error', self)
      fire('loadend', self)
    })
  }

  DeferredContentPrototype.fetch = function(url) {
    var self = this

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
        xhr.send(null)
        fire('loadstart', self)
      }

      poll(1000)
    })
  }

  window.DeferredContentElement = document.registerElement('deferred-content', {
    prototype: DeferredContentPrototype
  })
})()
