# WebGL Parallax

The script creates a parallax effect reacting to mouse movement and device tilt using WebGL for rendering. If WebGL is not supported, a fallback is used which translates the intial `div`s.
It uses a part of the [Tetragon](https://github.com/detomon/Tetragon.js) library.

```html
<div class="parallax-container" data-alignment="0.0, 0.0">
	<div class="parallax-layer" data-image="img/background.jpg" data-shift="-0.030, -0.030"></div>
	<div class="parallax-layer" data-image="img/layer5.png" data-shift="-0.015, -0.015"></div>
	<div class="parallax-layer" data-image="img/layer4.png" data-shift="+0.003, +0.003"></div>
	<div class="parallax-layer" data-image="img/layer3.png" data-shift="+0.015, +0.015"></div>
	<div class="parallax-layer" data-image="img/layer2.png" data-shift="+0.030, +0.030"></div>
	<div class="parallax-layer" data-image="img/layer1.png" data-shift="+0.045, +0.045"></div>
	<div class="parallax-layer" data-shift="-0.1, -0.1"></div>
	<div class="parallax-layer" data-shift="+0.02, +0.02"></div>
	<div class="parallax-layer" data-shift="-0.08, +0.04"></div>
</div>
```

The container element contains the movable layers. `data-image` sets the path to the layer's image. `data-shift` defines the amount by which the layer should move. The first number defines the horizontal movement, the second the vertical movement, respectively.

`data-alignment` defines the focus point which should always be visible when resizing the container. The first number define the horizontal position of the focus point relative to the center. `0` is the center itself, `-1` is left, and `1` is right. The second number defines the vertical position relative to the center. `0` is the center itself, `-1` is top, and `1` is bottom.

```js
var parallax = new Parallax({
	// container element
	element: document.querySelector('.parallax-container'),
	// the following are the default options:
	// layer class
	layerSelector: '.parallax-layer',
	// delay factor of layer movement
	moveDelay: 0.03,
	// start animating when  images are loaded
	autoStart: true,
	// degrees in which the device tilt will move the layers to their maximum positions
	deviceTiltDegrees: 12,
	// defines focus point if not defined by container
	alignment: [0.0, 0.0],
	// uses WebGL if supported
	noWebGL: false,
	// called when all images are loaded
	loaded: function () {},
	// called when image of layer is loaded
	loadLayer: function () {},
	// called each frame when drawing layers
	draw: function () {},
});
```
