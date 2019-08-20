// TODO: Replace placeholder shaders by original ones (requires fixing projection matrix)
import fetchScript from './utils/fetch-script.js'
import PromiseCache from './utils/promise-cache.js'
import fragmentShader from './shaders/fragment-placeholder.glsl'
import vertexShader from './shaders/vertex-placeholder.glsl'

// configs

var LEGACY_GLFT_V1_LOADER_URL = 'https://cdn.rawgit.com/mrdoob/three.js/r86/examples/js/loaders/GLTFLoader.js'
var POLY_API_URL = 'https://poly.googleapis.com/v1/assets/'
var UNOFFICIAL_LEGACY_API_URL = 'https://gblock.3d.io/api/get-gltf-url/'
// ADD API KEY or provide it in a-frame param by adding "?key=xxxxxxxxxxxxxx" to the poly url
var API_KEY = ''


// for local development using unofficial legacy API:
// 1. uncomment the following line
//var UNOFFICIAL_LEGACY_API_URL = 'http://localhost:3000/api/get-gltf-url/'
// 2. start local server: npm run start
// 3. compile aframe component: npm run build
// 4. go to http://localhost:3000

// internals

var promiseCache = new PromiseCache()

// aframe module

AFRAME.registerComponent('gblock', {

  schema: {type: 'asset'},

  init: function () {

    this.model = null

  },

  update: function () {

    var self = this
    var el = this.el
    var src = this.data

    if (!src) { return; }

    // check if API key is provided...
    var apiKey
    if (src.indexOf('?key=') > -1) {
      // ... in aframe parameter
      apiKey = src.split('?key=').pop() // extract API key
      src = src.substring(0,src.indexOf('?key=')) // remove key from src
    } else if (API_KEY !== '') {
      // ... as hardcoded constant
      apiKey = API_KEY
    }
    if (apiKey) {
      var id = src.substr(src.lastIndexOf('/') + 1) // get GLTF id
      if (!id) { return; }
    }

    self.remove()

    ;(apiKey ? getGltfUrl(id, apiKey) : getGltfUrlFromLegacyApi(src))
      .then(loadGblockModel)
      .then(function onLoaded (gltfModel) {

        self.model = gltfModel.scene || gltfModel.scenes[0]
        self.model.animations = gltfModel.animations

        el.setObject3D('mesh', self.model)
        el.emit('model-loaded', {format: 'gltf', model: self.model})

      })
      .catch(function(errorMessage){

        console.error('ERROR loading gblock model from "' + src +'" : ' + errorMessage)
        el.emit('model-error', { message: errorMessage })

      })

  },

  remove: function () {

    if (!this.model) { return; }
    this.el.removeObject3D('mesh')

  }

})

// private shared methods

// This API call is only needed to obtain the official glTF URL of a google block model.
// The glTF itself is not being proxied and gets fetched from https://vr.google.com/downloads/* directly.
// https://github.com/archilogic-com/aframe-gblock/issues/1
// API server code: server/index.js
// try promise cache (could be in loading state)
function getGltfUrl (id, apiKey) {
  var url = POLY_API_URL + id + '/?key=' + apiKey;

  // try cache
  var getUrlPromise = promiseCache.get(url)

  if (!getUrlPromise) {

    getUrlPromise = fetch(url).then(function (response) {

      // parse response
      return response.json().catch(function(error){
        // handle JSON parsing error
        console.log('ERROR parsing gblock API server response JSON.\nRequested Model: "' + url + '"\nError: "' + JSON.stringify(error) + '"')
        return Promise.reject('gblock API server error. Check console for details.')
      }).then(function (info) {
        if (info.error !== undefined) {
          return Promise.reject('Poly API error: ' + info.error.message)
        }
        var format = info.formats.find( format => { return format.formatType === 'GLTF' || format.formatType === 'GLTF2'; } );
        if ( format !== undefined ) {
          const r = info.presentationParams.orientingRotation;
          const quaternion = new THREE.Quaternion(r.x || 0, r.y || 0, r.z || 0, r.w || 1);
          return {url: format.root.url, quaternion: quaternion}
        } else {
          return Promise.reject('Poly asset id:' + id + ' not provided in GLTF or GLTF2 format.')
        }
      })

    })

    // add to cache
    promiseCache.add(url, getUrlPromise)

  }

  return getUrlPromise

}

// Legacy mode using unofficial API
// This API call is only needed to obtain the official glTF URL of a google block model.
// The glTF itself is not being proxied and gets fetched from https://vr.google.com/downloads/* directly.
// https://github.com/archilogic-com/aframe-gblock/issues/1
// API server code: server/index.js
// try promise cache (could be in loading state)
function getGltfUrlFromLegacyApi (src) {

  // try cache
  var getUrlPromise = promiseCache.get(src)

  if (!getUrlPromise) {

    getUrlPromise = fetch(UNOFFICIAL_LEGACY_API_URL + '?url=' + src).then(function (response) {

      // parse response
      return response.json().catch(function(error){
        // handle JSON parsing error
        console.log('ERROR parsing gblock API server response JSON.\nRequested Model: "' + src + '"\nError: "' + JSON.stringify(error) + '"')
        return Promise.reject('gblock API server error. Check console for details.')
      }).then(function (message) {
        if (response.ok) {
          // return glTF URL
          return message.gltfUrl
        } else {
          // handle error response
          console.error('ERROR loading gblock model "'+ src +'" : ' + response.status + ' "' + message.message)
          return Promise.reject(message.message)
        }
      })

    })

    // add to cache
    promiseCache.add(src, getUrlPromise)

  }

  return getUrlPromise

}

// loads google block models (poly.google.com)
function loadGblockModel(data, onProgress) {
  const url = data.url;
  const quaternion = data.quaternion;
  const matrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);

  return new Promise(function(resolve, reject) {

    // create unviresal GLTF loader for google blocks
    // this one will inherit methods from GLTF V1 or V2 based on file version
    function GBlockLoader () {
      this.manager = THREE.DefaultLoadingManager
      //this.path = new THREE.LoaderUtils().extractUrlBase( url )
      this.path = THREE.Loader.prototype.extractUrlBase( url )
    }

    // load model
    var loader = new THREE.FileLoader( GBlockLoader.manager )
    loader.setResponseType( 'arraybuffer' )
    loader.load( url, function onLoad( data ) {
      try {

        // convert uint8 to json
        var json = JSON.parse(convertUint8ArrayToString(data))

        // check GLTF version
        var isGLTF1 = json.asset === undefined || json.asset.version[ 0 ] < 2

        if (isGLTF1) {

          fetchGLTF1Loader().then(function(GLTF1Loader){

            // inherit methods from GLTF V1 loader
            GBlockLoader.prototype = GLTF1Loader.prototype
            var gblockLoader = new GBlockLoader()
            GLTF1Loader.call(gblockLoader)

            // Replace original shaders with placeholders
            Object.keys(json.shaders).forEach(function (key, i) {
              if (key.indexOf('fragment') > -1) json.shaders[key].uri = fragmentShader.base64
              else if (key.indexOf('vertex') > -1) json.shaders[key].uri = vertexShader.base64
            })

            // convert json back to uint8 data
            var modifiedData = new TextEncoder('utf-8').encode(JSON.stringify(json))

            // parse data
            gblockLoader.parse( modifiedData, function onParsingDone (gltf) {


              // FIXME: adapt projection matrix in original shaders and do not replace materials
              (gltf.scene || gltf.scenes[0]).traverse(function (child) {
                if (child.material) child.material = new THREE.MeshPhongMaterial({ vertexColors: THREE.VertexColors })
                if (child.geometry) child.geometry.applyMatrix(matrix);
              })

              // GLTF V1 ready
              resolve(gltf)

            }, gblockLoader.path)

          })

        } else {

          // inferit methods from GLTF V2 loader
          GBlockLoader.prototype = THREE.GLTFLoader.prototype
          var gblockLoader = new GBlockLoader()
          THREE.GLTFLoader.call(gblockLoader)

          // parse data
          //gblockLoader.parse( data, gblockLoader.path, resolve, reject)
          gblockLoader.parse( data, gblockLoader.path, function onDone(gltf) {
            gltf.scene.traverse(function (child) {
              if (child.geometry) child.geometry.applyMatrix(matrix);
            })
            resolve(gltf);
          }, reject)

        }

      } catch ( e ) {

        // For SyntaxError or TypeError, return a generic failure message.
        reject( e.constructor === Error ? e : new Error( 'THREE.GLTFLoader: Unable to parse model.' ) )

      }

    }, onProgress, reject )

  })
}

// fetch legacy GLTF v1 loader on demand
var GLFT1LoaderPromise
function fetchGLTF1Loader () {
  if (!GLFT1LoaderPromise ) {
    // legacy loader will overwrite THREE.GLTFLoader so we need to keep reference to it
    THREE.___GLTF2Loader = THREE.GLTFLoader
    // fetch legacy loader for GLTF1
    GLFT1LoaderPromise = fetchScript(LEGACY_GLFT_V1_LOADER_URL).then(function(){
      // keep reference GLTF V1 loader
      var GLTF1Loader = THREE.GLTFLoader
      // restore GLTF V2 loader reference
      THREE.GLTFLoader = THREE.___GLTF2Loader

      return GLTF1Loader
    })
  }
  return GLFT1LoaderPromise
}

// from https://github.com/mrdoob/three.js/blob/master/examples/js/loaders/GLTFLoader.js
function convertUint8ArrayToString (array) {
  if (window.TextDecoder !== undefined) {
    return new TextDecoder().decode(array)
  }
  // Avoid the String.fromCharCode.apply(null, array) shortcut, which
  // throws a "maximum call stack size exceeded" error for large arrays.
  var s = '';
  for (var i = 0, il = array.length; i < il; i++) {
    s += String.fromCharCode(array[i])
  }
  return s;
}
