elemento <include-fragment>
Una etiqueta Incluye del lado del cliente.

Instalación
$ npm install --save @github/include-fragment-element
Uso
Todos los include-fragmentelementos deben tener un srcatributo del cual recuperar un fragmento de elemento HTML.

La carga de la página inicial debe incluir contenido de respaldo que se mostrará si el recurso no se pudo recuperar de inmediato.

importar  '@ github / include-fragment-element'
Original

< div  class = " tip " > 
  < include-fragment  src = " / tips " > 
    < p > Cargando sugerencia… </ p > 
  </ include-fragment > 
</ div >
Al cargar la página, el include-fragmentelemento obtiene la URL, la respuesta se analiza en un elemento HTML, que reemplaza el include-fragmentelemento por completo.

Resultado

< div  class = " tip " > 
  < p > Te ves bien hoy </ p > 
</ div >
El servidor debe responder con un fragmento HTML para reemplazar el include-fragmentelemento. No debe contener otro include-fragment elemento o el servidor será sondeado en un bucle infinito.

Errores
Si la URL no se carga, el include-fragmentelemento se deja en la página y se etiqueta con una is-errorclase CSS que se puede usar para diseñar.

Eventos
Los eventos del ciclo de vida de la solicitud se envían al <include-fragment>elemento.

loadstart - La búsqueda del servidor ha comenzado.
load - La solicitud se completó con éxito.
error - La solicitud falló.
loadend - La solicitud se ha completado.
include-fragment-replace(cancelable): se ha analizado la respuesta correcta. Viene con event.detail.fragmenteso reemplazará el elemento actual.
include-fragment-replaced - El elemento ha sido reemplazado por el fragmento.
const  loader  =  document . querySelector ( 'include-fragment' ) 
const  container  =  loader . cargador parentElement 
. addEventListener ( 'loadstart' , ( ) => container . classList . add ( 'is-loading' ) ) loader . addEventListener ( 'loadend' , ( ) => contenedor . classList . remove (   
   'is-loading' ) ) 
loader . addEventListener ( 'load' ,  ( )  =>  container . classList . add ( 'is-success' ) ) 
loader . addEventListener ( 'error' ,  ( )  =>  contenedor . classList . add ( 'is-error' ) )
Opciones
Atributo	Opciones	Descripción
src	Cadena de URL	URL requerida desde la que cargar el fragmento de elemento HTML de reemplazo.
Carga diferida
La solicitud de marcado de reemplazo del servidor comienza cuando el srcatributo está disponible en el <include-fragment>elemento. La mayoría de las veces, esto sucederá en la carga de la página cuando se representa el elemento. Sin embargo, si omitimos el srcatributo hasta más adelante, podemos aplazar la carga del contenido.

El <details-menu>elemento utiliza esta técnica para aplazar la carga del contenido del menú hasta que se abre por primera vez.

Patrones
El aplazamiento de la visualización del marcado se realiza normalmente en los siguientes patrones de uso.

Una acción del usuario inicia un trabajo en segundo plano de ejecución lenta en el servidor, como hacer una copia de seguridad de los archivos almacenados en el servidor. Mientras se ejecuta la tarea de copia de seguridad, se muestra al usuario una barra de progreso. Cuando está completo, el elemento include-fragment se reemplaza con un enlace a los archivos de respaldo.

La primera vez que un usuario visita una página que contiene un marcado que requiere mucho tiempo para generar, se muestra un indicador de carga. Cuando el marcado termina de compilarse en el servidor, se almacena en Memcache y se envía al navegador para reemplazar el cargador de inclusión de fragmentos. Las visitas posteriores a la página representan el marcado almacenado en caché directamente, sin pasar por un elemento include-fragment.

La relación con el lado del servidor incluye
Este enfoque declarativo es muy similar a las directivas SSI o ESI . De hecho, una implementación de borde podría reemplazar el marcado antes de que se entregue al cliente.

< include-fragment  src = " / github / include-fragment / commit-count " timeout = " 100 " > 
  < p > Contando confirmaciones… </ p > 
</ include-fragment >
Un proxy puede intentar recuperar y reemplazar el fragmento si la solicitud finaliza antes del tiempo de espera. De lo contrario, la etiqueta se entrega al cliente. Esta biblioteca solo implementa el aspecto del lado del cliente.

Soporte de navegador
Los navegadores sin soporte de elementos personalizados nativos requieren un polyfill . Los navegadores heredados requieren varios otros polyfills. Consulte examples/index.htmlpara obtener más detalles.

Cromo
Firefox
Safari
Microsoft Edge
Desarrollo
npm install
npm test
Licencia
Distribuido bajo la licencia MIT. Consulte LICENCIA para obtener más detalles.
