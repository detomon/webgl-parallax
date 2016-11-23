/*
 * Copyright (c) 2016 Simon Schoenenberger
 * https://github.com/detomon/webgl-parallax
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

 (function (window, document, T) {
'use strict';

function Parallax(options) {
	options = T.extend({
		element: null,
		layerSelector: '.parallax-layer',
		moveDelay: 0.03,
		autoStart: true,
		deviceTiltDegrees: 12,
		alignment: [0.0, 0.0],
		noWebGL: false,
		loaded: function () {},
		loadLayer: function () {},
		draw: function () {},
	}, options);

	this.container = options.element;

	var self = this;
	var frameTime;
	var animationFrame;
	var moveDelay = options.moveDelay;
	var maxShift = new T.Vector();
	var relShift = new T.Vector();
	var delayShift = new T.Vector();

	var alignment = options.alignment;

	if (this.container.dataset.alignment) {
		alignment = this.container.dataset.alignment.split(',');
	}

	alignment = new T.Vector(alignment[0], alignment[1]);
	alignment.x = Math.max(-1, Math.min(alignment.x, 1));
	alignment.y = Math.max(-1, Math.min(alignment.y, 1));

	var elements = this.container.querySelectorAll(options.layerSelector);

	var images = [];
	var layers = Array.prototype.map.call(elements, function (layer) {
		return {
			element: layer,
			size: null,
			shift: null,
			image: null,
		};
	});

	var additionalItems = [];
	var layerItems = [];

	for (var i = 0; i < layers.length; i ++) {
		var layer = layers[i];

		if (layer.element.dataset.image) {
			images[i] = layer.element.dataset.image;
		}

		var items = layer.element.querySelectorAll('.parallax-layer-item');

		for (var j = 0; j < items.length; j ++) {
			var item = items[j];


			if (item.dataset.image) {
				additionalItems.push(item.dataset.image);
			}
		}
	}

	// add additional images found in .parallax-layer-items
	additionalItems.unshift(images.length, 0);
	Array.prototype.splice.apply(images, additionalItems);

	var deviceTilt = {
		value: null,
		initialValue: null,
		factor: options.deviceTiltDegrees, // degrees for full roration to one side
		setTilt: function (newTilt) {
			if (!this.initialValue) {
				this.initialValue = newTilt.copy();
				this.initialValue.x = 0; // ignore initial Y-rotation
			}

			this.value = newTilt.sub(this.initialValue).div(this.factor);
			this.value.x = Math.min(-1, Math.max(this.value.x, 1));
			this.value.y = Math.min(-1, Math.max(this.value.y, 1));
			self.setShift(this.value);
		},
	};

	var glCtx;

	function layerCoverRect(layer, viewport) {
		var rect = new T.Rect();
		var size = layer.size;

		if (viewport.x / viewport.y > size.x / size.y) {
			rect.size.x = viewport.x;
			rect.size.y = viewport.x / size.x * size.y;
		}
		else {
			rect.size.y = viewport.y;
			rect.size.x = viewport.y / size.y * size.x;
		}

		rect.pos = viewport.sub(rect.size).mult(0.5);

		return rect;
	}

	function scaleRect(rect, scale) {
		rect = rect.copy();

		var size = rect.size.mult(scale);

		rect.pos = rect.center.sub(size.mult(0.5));
		rect.size = size;

		return rect;
	}

	function draw() {
		var deltaTime;
		var newTime = new Date();

		if (!frameTime) {
			frameTime = newTime;
		}

		deltaTime = (newTime.getTime() - frameTime.getTime()) / 1000;
		frameTime = newTime;

		var rect = self.container.getBoundingClientRect();
		var viewport = new T.Vector(rect.width, rect.height);

		delayShift.inc(relShift.sub(delayShift).mult(moveDelay));

		var rects = [];

		var maxShiftAll = Math.max(maxShift.x, maxShift.y);
		maxShift = new T.Vector(maxShiftAll, maxShiftAll);

		layers.forEach(function (layer) {
			var size = layer.size;
			var shift = layer.shift;

			if (!size) {
				rects.push(null);
				return;
			}

			var rect = layerCoverRect(layer, viewport);
			var rectShift = shift.mult(rect.size);
			var layerRect = scaleRect(rect, maxShift.mult(2).add(new T.Vector(1, 1)));

			// align to border
			var shiftDiff = layerRect.size.sub(maxShift).sub(viewport).mult(0.5);
			shiftDiff = shiftDiff.sub(maxShift.mult(rect.size));

			layerRect.pos.dec(shiftDiff.mult(alignment));
			layerRect.pos.dec(rectShift.mult(delayShift));

			layerRect.layer = layer;
			rects.push(layerRect);
		});

		if (glCtx) {
			glCtx.draw(rects);
		}
		else {
			rects.forEach(function (layerRect) {
				if (!layerRect) {
					return;
				}

				var layer = layerRect.layer;
				var element = layer.element;
				var transform = "translate3d(" + layerRect.pos.x + "px, " + layerRect.pos.y + "px, 0px)";

				element.style.webkitTransform = transform;
				element.style.MozTransform = transform;
				element.style.msTransform = transform;
				element.style.OTransform = transform;
				element.style.transform = transform;

				element.style.width = Math.ceil(layerRect.size.x) + 'px';
				element.style.height = Math.ceil(layerRect.size.y) + 'px';
			});
		}

		if (rects[0]) {
			options.draw(rects, new T.Vector(rect.width, rect.height));
		}
	}

	function animate() {
		draw();
		animationFrame = window.requestAnimationFrame(animate);
	}

	function resize(e) {
		// reset shift on resize
		relShift = new T.Vector();

		if (glCtx) {
			glCtx.resize();
		}

		setTimeout(function () {
			draw();
		}, 10);
	}

	function eventOffsetInElement(event, element) {
		var elem = element;
		var rect = elem.getBoundingClientRect();
		var offset = new T.Vector(rect.left, rect.top);
		var size = new T.Vector(rect.width, rect.height);

		if (event.changedTouches) {
			offset.x = event.changedTouches[0].pageX - offset.x;
			offset.y = event.changedTouches[0].pageY - offset.y;
		}
		else {
			offset.x = event.clientX - offset.x;
			offset.y = event.clientY - offset.y;
		}

		offset.x = Math.max(0, Math.min(offset.x, size.x));
		offset.y = Math.max(0, Math.min(offset.y, size.y));

		return {
			size: size,
			absOffset: offset,
			relOffset: offset.div(size),
		};
	}

	function move(e) {
		var offset = eventOffsetInElement(e, self.container);
		var shift = offset.relOffset.sub(new T.Vector(0.5, 0.5)).mult(2);

		self.setShift(shift);
	}

	function deviceoriantation(e) {
		var z = e.alpha;
		var x = e.beta;
		var y = e.gamma;
		var t = new T.Vector();

		switch (window.orientation) {
			// Portrait
			case 0: {
				t.x = -y;
				t.y = -x;
				break;
			}
			// Landscape (Clockwise)
			case -90: {
				t.x = x;
				t.y = -y;
				break;
			}
			// Landscape  (Counterclockwise)
			case 90: {
				t.x = -x;
				t.y = y;
				break;
			}
			// Portrait (Upside-down)
			case 180: {
				t.x = -y;
				t.y = x;
				break;
			}
		}

		deviceTilt.setTilt(t);
	}

	function prepare() {
		layers.forEach(function (layer, i) {
			var element = layer.element;
			var shift = element.dataset.shift.split(',');

			shift = new T.Vector(parseFloat(shift[0]), parseFloat(shift[1]))

			layer.shift = shift;

			if (element.dataset.size) {
				var size = element.dataset.size.split(/,/);
				layer.size = new T.Vector(parseFloat(size[0]), parseFloat(size[1]));
			}

			maxShift.x = Math.max(maxShift.x, Math.abs(shift.x));
			maxShift.y = Math.max(maxShift.y, Math.abs(shift.y));
		});
	}

	function init(loadedImages) {
		var addImageIdx = layers.length;
		var maxSize = new T.Vector();
		var emptyLayers = [];

		layers.forEach(function (layer, i) {
			var image = loadedImages[i];
			var element = layer.element;

			layer.image = image;

			if (image) {
				layer.size = new T.Vector(image.naturalWidth, image.naturalHeight);
				maxSize.x = Math.max(maxSize.x, layer.size.x);
				maxSize.y = Math.max(maxSize.y, layer.size.y);
			}
			else if (!layer.size) {
				emptyLayers.push(layer);
			}

			items = element.querySelectorAll('.parallax-layer-item');

			layer.items = [];

			Array.prototype.forEach.call(items, function (item) {
				var rect = new T.Rect(new T.Vector(
					parseFloat(item.style.left) / 100,
					parseFloat(item.style.top) / 100
				), new T.Vector(
					parseFloat(item.style.width) / 100,
					parseFloat(item.style.height) / 100
				));

				var sublayer = {
					item: item,
					rect: rect,
					image: loadedImages[addImageIdx],
				};

				layerItems.push(sublayer);
				layer.items.push(sublayer);

				addImageIdx ++;
			});
		});

		emptyLayers.forEach(function (layer) {
			layer.size = maxSize.copy();
		});

		if (!('ontouchstart' in document.documentElement)) {
			document.addEventListener('mousemove', move);
		}

		window.addEventListener('deviceorientation', deviceoriantation);

		self.container.addEventListener('DOMNodeRemoved', function () {
			self.deinit();
		});

		self.container.classList.add('parallax-loaded');
		options.loaded.call(self);

		if (!options.noWebGL) {
			glCtx = initWebGL();
		}

		if (!glCtx) {
			layers.forEach(function (layer, i) {
				var image = loadedImages[i];
				var element = layer.element;

				layer.image = image;

				if (image) {
					element.style.backgroundImage = 'url(' + element.dataset.image + ')';
				}

				Array.prototype.forEach.call(layer.items, function (item) {
					item.item.style.backgroundImage = 'url(' + item.image.src + ')';
				});

				options.loadLayer.call(self, layer, i);
			});
		}

		resize();
	}

	function initWebGL() {
		var canvas = document.createElement('canvas');
		canvas.width = 1024;
		canvas.height = 768;
		canvas.style.position = 'absolute';
		canvas.style.left = '0';
		canvas.style.top = '0';
		canvas.style.width = '100%';
		canvas.style.height = '100%';

		var webgl;

		try {
			webgl = new WebGLContext(canvas, layers, layerItems);
			options.element.appendChild(canvas);
		}
		catch (e) {
			console.log(e);
		}

		return webgl;
	}

	this.setShift = function (shift) {
		relShift = shift.copy();
	}

	this.startAnimating = function () {
		if (!animationFrame) {
			animationFrame = window.requestAnimationFrame(animate);
		}
	};

	this.stopAnimating = function () {
		if (animationFrame) {
			window.cancelAnimationFrame(animationFrame);
			animationFrame = null;
		}
	};

	this.deinit = function () {
		this.stopAnimating();
		document.removeEventListener('mousemove', move);
		window.removeEventListener('resize', resize);
		window.removeEventListener('orientationchange', resize);
		window.removeEventListener('deviceorientation', deviceoriantation);
	};

	T.loadImages(images, {
		done: function (loadedImages) {
			window.addEventListener('resize', resize);
			window.addEventListener('orientationchange', resize);

			if (options.autoStart) {
				self.startAnimating();
			}

			prepare();
			resize();
			draw();
			init(loadedImages);
		},
		allowCrossOrigin: true, // prevent security error for cross origin WebGL textures
	});
}

function WebGLContext(canvas, images, layerItems) {
	function createShader(gl, type, source) {
		var shader = gl.createShader(type);

		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

		if (success) {
			return shader;
		}

		console.log(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
	}

	function createProgram(gl, vertexShader, fragmentShader) {
		var program = gl.createProgram();

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		var success = gl.getProgramParameter(program, gl.LINK_STATUS);

		if (success) {
			return program;
		}

		console.log(gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
	}

	var resizeCanvas = document.createElement('canvas');
	var resizeCtx = resizeCanvas.getContext('2d');

	var textures = [];

	function makeTextureImage(layer) {
		var image = layer.image;
		var size = 1, maxSize;
		var canvas;
		var width, naturalWidth;
		var height, naturalHeight;

		if (image) {
			naturalWidth = image.naturalWidth;
			naturalHeight = image.naturalHeight;
			canvas = resizeCanvas;
		}
		else {
			naturalWidth = layer.size.x;
			naturalHeight = layer.size.y;
		}

		maxSize = Math.max(naturalWidth, naturalHeight);

		while (size < maxSize && size < 2048) {
			size <<= 1;
		}

		width = naturalWidth;
		height = naturalHeight;

		if (canvas) {
			canvas.width = size;
			canvas.height = size;

			resizeCtx.clearRect(0, 0, resizeCanvas.width, resizeCanvas.height);
			resizeCtx.drawImage(image, 0, 0);
		}

		return {
			scaleX: size / width,
			scaleY: size / height,
			image: canvas,
			size: layer.size,
			shift: layer.shift,
		};
	}

	var prevRects;

	function drawImage(texture, p1, p2, s, alpha) {
		if (alpha === undefined) {
			alpha = 1.0;
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			p1.x, p1.y,
			p1.x, p2.y,
			p2.x, p1.y,
			p2.x, p1.y,
			p2.x, p2.y,
			p1.x, p2.y,
		]), gl.STREAM_DRAW);

		var sx = 1 / texture.scaleX;
		var sy = 1 / texture.scaleY;

		gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0, 0,
			0, s.y,
			s.x, 0,
			s.x, 0,
			s.x, s.y,
			0, s.y,
		]), gl.STREAM_DRAW);

		gl.uniform1f(alphaUniformLocation, alpha);
		gl.bindTexture(gl.TEXTURE_2D, texture.texture);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	function draw(rects) {
		rects = rects || prevRects;
		prevRects = rects;

		if (!rects) {
			return;
		}

		var viewport = new T.Vector(gl.canvas.width, gl.canvas.height);

		gl.viewport(0, 0, viewport.x, viewport.y);
		gl.clear(gl.COLOR_BUFFER_BIT);

		var left = 0;
		var right = viewport.x;
		var top = 0;
		var bottom = viewport.y;

		var ral = right + left;
		var rsl = right - left;
		var tab = top + bottom;
		var tsb = top - bottom;

		var transform = new T.Matrix();

		transform[0] = 2.0 / rsl;
		transform[2] = 0.0;
		transform[4] = -ral / rsl;

		transform[1] = 0.0;
		transform[3] = 2.0 / tsb;
		transform[5] = -tab / tsb;

		gl.uniformMatrix3fv(transformUniformLocation, false, new Float32Array([
			transform[0], transform[1], 0.0,
			transform[2], transform[3], 0.0,
			transform[4], transform[5], 1.0,
		]));

		var itemIdx = rects.length;

		var tweenValue = T.Tween.easeOutBack(tween);
		var tweenScale = tweenValue * 0.5 + 0.5;
		var tweenAlpha = tweenValue;

		for (var i in rects) {
			var rect = rects[i];
			var texture = textures[i];
			var pos = new T.Vector(rect.pos.x, rect.pos.y);
			var size = new T.Vector(rect.size.x, rect.size.y);

			var p1 = pos.sub(viewport.mult(0.5));
			var p2 = p1.add(size);
			var s = new T.Vector(1 / texture.scaleX, 1 / texture.scaleY);

			if (texture.texture) {
				gl.bindTexture(gl.TEXTURE_2D, texture.texture);
				drawImage(texture, p1, p2, s);
			}

			for (var j in rect.layer.items) {
				var item = rect.layer.items[j];
				var texture = textures[itemIdx ++];
				var s1 = item.rect.pos;
				var s2 = item.rect.maxPos;
				var s = new T.Vector(1 / texture.scaleX, 1 / texture.scaleY);

				var w = p2.sub(p1);
				s1 = p1.add(s1.mult(w));
				s2 = p1.add(s2.mult(w));

				var c = s2.add(s1).mult(0.5);
				var cl = s2.sub(s1).mult(0.5);

				cl = cl.mult(tweenScale);

				var w1 = c.sub(cl);
				var w2 = c.add(cl);

				s1.x = w1.x;
				s1.y = w1.y + (w1.y - s1.y);
				s2.x = w2.x;

				drawImage(texture, s1, s2, s, tweenAlpha);
			}
		}

		tween += tweenVelocity;
		tween = Math.max(0, Math.min(tween, 1));
	}

	var gl = canvas.getContext('webgl', {
		alpha: false,
		premultipliedAlpha: false,
	});

	if (!gl) {
		gl = canvas.getContext('experimental-webgl', {
			alpha: false,
			premultipliedAlpha: false,
		});
	}

	if (!gl) {
		throw new Error("WebGL not supported");
	}

	var vertexShader =
		"attribute vec4 a_position;\n" +
		"attribute vec2 a_texcoord;\n" +
		"varying vec2 v_texcoord;\n" +
		"varying float a_alpha;\n" +
		"uniform mat3 trans;\n" +
		"uniform float alpha;\n" +
		"\n" +
		"void main() {\n" +
		"	gl_Position = vec4(trans * a_position.xyz, 1.0);\n" +
		"	v_texcoord = a_texcoord;\n" +
		"	a_alpha = alpha;\n" +
		"}\n";

	var fragmentShader =
		"precision mediump float;\n" +
		"varying vec2 v_texcoord;\n" +
		"varying float a_alpha;\n" +
		"uniform sampler2D u_texture;\n" +
		"\n" +
		"void main() {\n" +
		"  vec4 color = texture2D(u_texture, v_texcoord);\n" +
		"  color.a *= a_alpha;\n" +
		"  gl_FragColor = color;\n" +
		"}\n";

	var tween = 0;
	var tweenVelocity = -0.03;

	var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShader);
	var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader);

	var program = createProgram(gl, vertexShader, fragmentShader);

	var positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
	var texcoordLocation = gl.getAttribLocation(program, 'a_texcoord');
	var offsetUniformLocation = gl.getUniformLocation(program, 'offset');
	var sizeUniformLocation = gl.getUniformLocation(program, 'size');
	var transformUniformLocation = gl.getUniformLocation(program, 'trans');
	var alphaUniformLocation = gl.getUniformLocation(program, 'alpha');

	var positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.enableVertexAttribArray(positionAttributeLocation);
	gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1, -1,
		-1, +1,
		+1, -1,
		+1, -1,
		+1, +1,
		-1, +1,
	]), gl.STATIC_DRAW);

	var texcoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
	gl.enableVertexAttribArray(texcoordLocation);
	gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		0, 0,
		0, 1,
		1, 0,
		1, 0,
		1, 1,
		0, 1,
	]), gl.STATIC_DRAW);

	for (var i in images) {
		var texture = null;
		var image = makeTextureImage(images[i]);

		if (image.image) {
			texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_LINEAR);

			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image.image);
			gl.generateMipmap(gl.TEXTURE_2D);
		}

		image.texture = texture;
		textures[i] = image;
	}

	for (var i in layerItems) {
		var texture = gl.createTexture();
		var image = makeTextureImage(layerItems[i]);

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_LINEAR);

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image.image);
		gl.generateMipmap(gl.TEXTURE_2D);

		image.texture = texture;
		textures.push(image);
	}

	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.enable(gl.BLEND);
	gl.useProgram(program);
	gl.clearColor(0, 0, 0, 0);

	this.draw = function (rects) {
		draw(rects);
	};

	this.resize = function () {
		var canvas = gl.canvas;
		var rect = canvas.getBoundingClientRect()
		var width = rect.width;
		var height = rect.height;

		canvas.width = width;
		canvas.height = height;

		draw();
	};

	this.fadeItems = function (fadeIn) {
		if (fadeIn) {
			tweenVelocity = Math.abs(tweenVelocity);
		}
		else {
			tweenVelocity = -Math.abs(tweenVelocity);
		}
	};

	this.destroy = function () {
		self.deinit();
	};
}

window.Parallax = Parallax;

}(window, document, Tetragon));
