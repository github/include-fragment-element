(function() {
  'use strict';

  var DeferredContentPrototype = Object.create(window.HTMLElement.prototype)

  DeferredContentPrototype.attachedCallback = function() {
    var self = this

    var url = self.getAttribute('src')
    if (!url) {
      return
    }

    self.fetch(url).then(function(html) {
      self.insertAdjacentHTML('afterend', html)
      self.parentNode.removeChild(self)
    }, function() {
      self.classList.add('is-error')
    })
  }

  DeferredContentPrototype.fetch = function(url) {
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
      }

      poll(1000)
    })
  }

  window.DeferredContentElement = document.registerElement('deferred-content', {
    prototype: DeferredContentPrototype
  })
})()
