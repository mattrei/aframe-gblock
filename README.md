# gBlock Component for A-Frame

[A-Frame](https://aframe.io) Component loading [Google Poly](https://poly.google.com) models from https://poly.google.com. Maintained by [archilogic.com](https://archilogic.com).

## Demo

#### [Live demo](http://project.archilogic.com/aframe-gblock/)

![](docs/screenshot3.png)

## Usage

```html
<head>
  <script src="https://aframe.io/releases/0.7.0/aframe.min.js"></script>
  <script src="https://cdn.rawgit.com/archilogic-com/aframe-gblock/6498b71d/dist/gblock.js"></script>
</head>
<body>
  <a-scene>
    // Using Poly API Key
    <a-entity gblock="https://poly.google.com/view/ewsXLyr8OPu?key=YOUR_POLY_API_KEY_HERE"></a-entity>
  </a-scene>
</body>
```

#### [Run Example](https://codepen.io/tomas-polach/pen/NvJRJe/right?editors=1000)

## Want to make changes?

### Installation

#### 1. Make sure you have Node installed.

On Mac OS X, it's recommended to use [Homebrew](http://brew.sh/) to install Node + [npm](https://www.npmjs.com):

    brew install node

#### 2. Clone git repo 

    git clone https://github.com/archilogic-com/aframe-gblock.git

#### 3. Install dependencies

    npm install

#### 5. Start local development server

    npm start

#### 6. Launch site from your favourite browser:

[http://localhost:3000/](http://localhost:3000/)

## Acknowledgements

Based on [gltf component](https://aframe.io/docs/0.6.0/components/gltf-model.html) from [A-Frame](https://aframe.io/) using [GLTF loader](https://threejs.org/examples/#webgl_loader_gltf) from [three.js](https://threejs.org/).

## License

Distributed under an [MIT License](LICENSE).

mat
c3lXOu8gooq
