(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
"use strict";

exports.__esModule = true;
var _var = exports._var = {};

_var.BP_TAB = 991;
_var.BP_SPL = 767;
_var.BP_SP = 553;

_var.THUMB_W = 290;
_var.THUMB_H = 179;

},{}],7:[function(require,module,exports){
'use strict';

exports.__esModule = true;
var _browser = exports._browser = {};

_browser.ua = navigator.userAgent.toLowerCase();
_browser.ie = /msie|trident/.test(_browser.ua);
_browser.ie6 = /msie\s6\./.test(_browser.ua);
_browser.ie7 = /msie\s7\./.test(_browser.ua);
_browser.ie8 = /msie\s8\./.test(_browser.ua);
_browser.ie9 = /msie\s9\./.test(_browser.ua);
_browser.ie10 = /msie\s10\./.test(_browser.ua);
_browser.opera = /opr/.test(_browser.ua);
_browser.firefox = /firefox/.test(_browser.ua);
if (_browser.opera) {
  _browser.chrome = false;
  _browser.safari = false;
} else {
  _browser.chrome = /chrome/.test(_browser.ua);

  if (_browser.chrome) {
    _browser.safari = false;
  } else {
    _browser.chrome = false;
    _browser.safari = /safari/.test(_browser.ua);
    _browser.version = parseFloat(_browser.ua.slice(_browser.ua.indexOf('version') + 8));
  }
}
_browser.prest = /opera/.test(_browser.ua);
if (_browser.ie) {
  _browser.legacy = /msie\s6\.|msie\s7\.|msie\s8\./.test(_browser.ua);
} else {
  _browser.legacy = false;
}
_browser.anim = !/msie\s6\.|msie\s7\.|msie\s8\.|msie\s9\./.test(_browser.ua);

_browser.android = /android/.test(_browser.ua);
_browser.iphone = /iphone/.test(_browser.ua);
_browser.ipod = /ipod/.test(_browser.ua);
_browser.ipad = /ipad/.test(_browser.ua);
_browser.ios = /iphone|ipod|ipad/.test(_browser.ua);
if (_browser.android) {
  _browser.sp = /mobile/.test(_browser.ua);
} else {
  _browser.sp = /iphone|ipod|blackberry/.test(_browser.ua);
}
if (_browser.android) {
  _browser.tablet = !/mobile/.test(_browser.ua);
} else {
  _browser.tablet = /ipad/.test(_browser.ua);
}
if (_browser.android) {
  _browser.version = parseFloat(_browser.ua.slice(_browser.ua.indexOf('android') + 8));
} else if (_browser.ios) {
  _browser.version = parseFloat(_browser.ua.slice(_browser.ua.indexOf('os ') + 3, _browser.ua.indexOf('os ') + 6).replace('_', '.'));
}
if (_browser.sp || _browser.tablet) {
  _browser.pc = false;
} else {
  _browser.pc = true;
}

if (_browser.android && !/Chrome/.test(_browser.ua)) {
  _browser.androidBrowser = true;
} else {
  _browser.androidBrowser = false;
}

_browser.push = window.history && window.history.pushState ? true : false;

},{}],8:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _var2 = require('../_var.js');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* ============================================================================
 参考：
 * flipsnap.js
 *
 * @version  0.6.2
 * @url http://hokaccha.github.com/js-flipsnap/
 *
 * Copyright 2011 PixelGrid, Inc.
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php

============================================================================ */

var Carousel = function () {
  function Carousel(el) {
    var _this = this;

    _classCallCheck(this, Carousel);

    this.el = document.querySelectorAll(el);

    this.carousels = [];
    Array.prototype.forEach.call(this.el, function (el, i) {
      var eachCarousel = new EachCarousel(_this.el[i]);
      _this.carousels.push(eachCarousel);
    });
  }

  Carousel.prototype.refresh = function refresh(num) {
    this.carousels.forEach(function (e, i) {
      e.refresh(num);
    });
  };

  return Carousel;
}();

exports.default = Carousel;


var support = Carousel.support = {};
var gestureStart = false;

var DISTANCE_THRESHOLD = 5;
var ANGLE_THREHOLD = 45;

support.addEventListener = 'addEventListener' in window;

var eventTypes = ['touch', 'mouse'];
var events = {
  start: {
    touch: 'touchstart',
    mouse: 'mousedown'
  },
  move: {
    touch: 'touchmove',
    mouse: 'mousemove'
  },
  end: {
    touch: 'touchend',
    mouse: 'mouseup'
  }
};

if (support.addEventListener) {
  document.addEventListener('gesturestart', function () {
    gestureStart = true;
  });

  document.addEventListener('gestureend', function () {
    gestureStart = false;
  });
}

var EachCarousel = function EachCarousel(el) {
  this.$el = $(el);
  this.init(el);
};

EachCarousel.prototype = {
  init: function init(el) {
    var self = this;

    self.$inner = self.$el.find('.js-Carousel_Inner');
    self.$content = self.$el.find('.js-Carousel_Content');
    self.$item = self.$content.find('.js-Carousel_Item');
    self._itemLength = self.$item.length;

    var opts = self.$el.data('carousel') || {};

    self.loop = opts.loop;
    self._pcShow = opts.pcShow;
    self._tabShow = opts.tabShow;
    self._spShow = opts.spShow;
    self.showDot = opts.showDot;
    self.showArrow = opts.showArrow;
    self._duration = opts.duration / 1000 || 0.4;
    self.auto = opts.autoPlay || false;
    self._interval = opts.interval || 5000;
    self._onebyone = opts.oneByOne || false;
    self._resizePoint = opts.resizePoint || null;

    self.timer = false;
    self.breakFlag = false;

    self.currentPoint = 0;
    self.viewLength = window.matchMedia('(max-width: ' + _var2._var.BP_TAB + 'px)').matches ? window.matchMedia('(max-width: ' + _var2._var.BP_SPL + 'px)').matches ? self._spShow : self._tabShow : self._pcShow;

    self.setting();
    if (self.showDot) self.setDot();
    if (self.showArrow) self.setArrow();
    self.setStyle();
    self.eventHandler();
    //if(self.auto) self.autoPlay();
  },

  setting: function setting() {
    var self = this;

    self.currentY = 0;
    self.currentX = 0;
    self._newT = 0;
    self._newL = 0;

    self.flag = true;

    self.$wrap = $('<div>').addClass('ja-Carousel_Wrap');

    self.$inner.wrap(self.$wrap);

    if (self.loop) {
      self.$inner.append(self.$content.clone());
      self.$inner.prepend(self.$content.clone());
      self.$inner.find('ul').eq(0).find('a').attr('tabindex', '-1');
      self.$inner.find('ul').eq(-1).find('a').attr('tabindex', '-1');
    }
  },

  refresh: function refresh(num) {
    var self = this;

    self.currentPoint = num === 0 ? num : self.currentPoint;

    var _staticItemLength = self.loop ? self.$el.find('.js-Carousel_Item').length / 3 : self.$el.find('.js-Carousel_Item').length;

    self._itemLength = _staticItemLength > self.viewLength ? _staticItemLength : self.viewLength;

    var _hideLength = 0;
    self.$content.find('.js-Carousel_Item').each(function () {
      if (!$(this).isVisible()) {
        self._itemLength--;
      }
    });

    self.setStyle();

    //$(window).triggerHandler('heightRefresh');

    var _elH = self.showDot ? self.$el.find('.js-Carousel_Item').height() + self.$dots.innerHeight() : self.$el.find('.js-Carousel_Item').height();

    if (self._itemLength > 0 && self.$el.height() != _elH + 2) {

      TweenMax.to(self.$el, self._duration, {
        css: { height: _elH },
        onComplete: function onComplete() {
          self.$el.css('height', 'auto');
        }
      });
    } else if (self._itemLength === 0) {
      TweenMax.to(self.$el, self._duration, {
        css: { height: 0 }
      });
    }
  },

  setStyle: function setStyle() {
    var self = this;

    self.$el.find('.js-Carousel_Item').css('width', '');
    self.$el.find('.js-Carousel_Content').removeAttr('style').css('width', '');
    self.$inner.css('width', '');

    self._itemPl = parseInt(self.$item.css('padding-left')) || 0;
    self._itemPr = parseInt(self.$item.css('padding-right')) || 0;

    var _contentW = self.$el.find('.js-Carousel_Content').innerWidth();
    var _ulLength = self.$el.find('.js-Carousel_Content').length;

    var preViewLength = self.viewLength;

    self.viewLength = window.matchMedia('(max-width: ' + _var2._var.BP_TAB + 'px)').matches && !window.matchMedia('print').matches ? window.matchMedia('(max-width: ' + _var2._var.BP_SPL + 'px)').matches ? self._spShow : self._tabShow : self._pcShow;
    var _staticItemLength = self.loop ? self.$el.find('.js-Carousel_Item').length / 3 : self.$el.find('.js-Carousel_Item').length;
    self._itemLength = _staticItemLength > self.viewLength ? _staticItemLength : self.viewLength;
    self._itemNum = self._itemLength % self.viewLength > 0 && !self._onebyone ? self._itemLength + (self.viewLength - self._itemLength % self.viewLength) : self._itemLength;

    self._itemW = Math.floor(_contentW / self.viewLength);

    self.initLeft = self.loop ? self._itemW * self._itemNum : 0;

    self.$el.find('.js-Carousel_Item').width(self._itemW - self._itemPl - self._itemPr);
    self.$el.find('.js-Carousel_Content').width(self._itemW * self._itemNum);

    self._distance = self._onebyone ? self._itemW : self._itemW * self.viewLength;

    self._maxPoint = self._onebyone ? self._itemLength - self.viewLength : Math.floor((self._itemLength - 1) / self.viewLength);

    self.currentPoint = self.currentPoint > self._maxPoint ? self._maxPoint : Math.ceil((self.currentPoint + 1) * preViewLength / self.viewLength - 1);

    if (self.breakFlag) {
      self.currentPoint = 0;
      self.breakFlag = false;
    }

    var _tmpMaxScrollX = self._distance * self._maxPoint;
    self._maxScrollX = _tmpMaxScrollX > 0 ? _tmpMaxScrollX : 0;

    self.$inner.width(self._itemW * self._itemNum * _ulLength);

    self.$el.find('.js-Carousel_Content').css('float', 'left');
    self.$inner.css({
      left: -self.currentPoint * self._distance - self.initLeft
    });

    if (self.loop && self._maxPoint === 0) {
      self.$inner.find('.js-Carousel_Content').eq(0).css('opacity', 0);
      self.$inner.find('.js-Carousel_Content').eq(-1).css('opacity', 0);
    }
    if (self.showDot) self.resizeDots();
    if (self.showArrow) self.resizeArrow();
  },

  setDot: function setDot() {
    var self = this;

    self.$dots = $('<ul>').addClass('ja-Carousel_Dots');

    for (var i = 0, l = Math.floor(self._itemLength / self._spShow); i <= l; i++) {
      self.$dots.append($('<li>').append($('<a href="#">').addClass('nojax').attr('tabindex', '-1')));
    }

    self.$el.append(self.$dots);
    self.$dots.find('a').eq(0).addClass('is-current');

    self.$dots.find('li').hide();
    self.$dots.find('li:lt(' + (self._maxPoint + 1) + ')').css('display', 'inline-block');

    self.$dots.find('a').on('click', function () {
      if (!$(this).is('.is-current') && self.flag) {
        var _index = self.$dots.find('a').index(this);
        self.moveToPoint(_index);
      }
      return false;
    });
  },

  resizeDots: function resizeDots() {
    var self = this;

    self.$dots.find('a').removeClass('is-current');
    self.$dots.find('a').eq(self.currentPoint).addClass('is-current');

    self.$dots.find('li').hide();

    if (self._maxPoint > 0) {
      self.$dots.find('li:lt(' + (self._maxPoint + 1) + ')').css('display', 'inline-block');
    }
  },

  setArrow: function setArrow() {
    var self = this;

    self.$prev = $('<a href="#" class="ja-Carousel_Prev">').addClass('nojax');
    self.$next = $('<a href="#" class="ja-Carousel_Next">').addClass('nojax');

    self.$el.append(self.$prev);
    self.$el.append(self.$next);

    self.$prev.on('click', function () {
      if (self.flag) {
        var point = self.currentPoint - 1;
        self.moveToPoint(point);
      }
      return false;
    });

    self.$next.on('click', function () {
      if (self.flag) {
        var point = self.currentPoint + 1;
        self.moveToPoint(point);
      }
      return false;
    });
  },

  resizeArrow: function resizeArrow() {
    var self = this;

    if (self._maxPoint > 0) {
      TweenMax.set(self.$prev, { autoAlpha: 1, display: 'block' });
      TweenMax.set(self.$next, { autoAlpha: 1, display: 'block' });
      if (self._maxPoint == self.currentPoint && !self.loop) {
        TweenMax.set(self.$next, { autoAlpha: 0, display: 'none' });
      } else if (self.currentPoint === 0 && !self.loop) {
        TweenMax.set(self.$prev, { autoAlpha: 0, display: 'none' });
      }
    } else {
      TweenMax.to(self.$prev, self._duration, {
        css: { autoAlpha: 0, display: 'none' }
      });
      TweenMax.to(self.$next, self._duration, {
        css: { autoAlpha: 0, display: 'none' }
      });
    }
  },

  eventHandler: function eventHandler() {
    var self = this;

    eventTypes.forEach(function (type) {
      self.$el[0].addEventListener(events.start[type], self, false);
    });

    if (self.auto && self._maxPoint > 0) self.autoPlay();

    window.matchMedia('(max-width: ' + _var2._var.BP_SPL + 'px)').addListener(function () {
      self.breakFlag = true;
    }, false);

    window.matchMedia('(max-width: ' + _var2._var.BP_TAB + 'px)').addListener(function () {
      self.breakFlag = true;
    }, false);

    $(window).on('load', function () {
      if (self.timer !== false) {
        clearTimeout(self.timer);
        self.timer = false;
      }

      self.currentPoint = 0;
      self.setStyle();

      if (self.auto && self._maxPoint > 0) self.autoPlay();
    });

    $(window).on('resize', function () {
      if (self.timer !== false) {
        clearTimeout(self.timer);
        self.timer = false;
      }

      self.setStyle();

      if (self.auto && self._maxPoint > 0) self.autoPlay();
    });
  },

  autoPlay: function autoPlay() {
    var self = this;

    self.timer = setTimeout(function () {
      if (self.flag) {
        var point = self.currentPoint + 1;
        self.moveToPoint(point);
      }
    }, self._interval);
  },

  handleEvent: function handleEvent(event, type) {
    var self = this;

    if (self._maxPoint > 0) {
      switch (event.type) {
        // start
        case events.start.touch:
          self.touchStartHandler(event, 'touch');break;
        case events.start.mouse:
          self.touchStartHandler(event, 'mouse');break;

        // move
        case events.move.touch:
          self.touchMoveHandler(event, 'touch');break;
        case events.move.mouse:
          self.touchMoveHandler(event, 'mouse');break;

        // end
        case events.end.touch:
          self.touchEndHandler(event, 'touch');break;
        case events.end.mouse:
          self.touchEndHandler(event, 'mouse');break;

        // click
        case 'click':
          self.clickHandler(event);break;
      }
    }
  },

  clickHandler: function clickHandler(event) {
    var self = this;

    event.stopPropagation();
    event.preventDefault();
  },

  touchStartHandler: function touchStartHandler(event, type) {
    var self = this;

    if (self.scrolling || gestureStart) {
      return;
    }

    if (self.timer !== false) {
      clearTimeout(self.timer);
      self.timer = false;
    }

    self.$el[0].addEventListener(events.move[type], self, false);
    document.addEventListener(events.end[type], self, false);

    var tagName = event.target.tagName;
    if (type === 'mouse' && tagName !== 'SELECT' && tagName !== 'INPUT' && tagName !== 'TEXTAREA' && tagName !== 'BUTTON') {
      event.preventDefault();
    }

    self.currentX = parseInt(self.$inner.css('left'));
    self.scrolling = true;
    self.moveReadyX = false;
    self.startPageX = getPage(event, 'pageX');
    self.startPageY = getPage(event, 'pageY');
    self.basePageX = self.startPageX;
    self.basePageY = self.startPageY;
    self.directionX = 0;
    self.startTime = event.timeStamp;

    self.moveDisX = 0;
  },

  touchMoveHandler: function touchMoveHandler(event, type) {
    var self = this;

    if (!self.scrolling || gestureStart) {
      return;
    }

    var pageX = getPage(event, 'pageX');
    var pageY = getPage(event, 'pageY');
    var distX;
    var newX;

    if (self.moveReadyX) {
      event.preventDefault();

      distX = pageX - self.basePageX;

      if (!self.loop && self._newL >= 0 || !self._onebyone && !self.loop && self._newL < -self._itemW * (self._itemNum - 1) || self._onebyone && !self.loop && self._newL < -self._itemW * self._maxPoint) {
        self.moveDisX += distX / 3;
        self._newL = Math.round(self.currentX + self.moveDisX);
      } else {
        self.moveDisX += distX;
        self._newL = self.currentX + self.moveDisX;
      }

      self.directionX = self.moveDisX === 0 ? self.directionX : self.moveDisX > 0 ? -1 : 1;

      self.setPositionX();

      self.basePageX = pageX;
    } else {
      var triangle = getTriangleSide(self.startPageX, self.startPageY, pageX, pageY);
      if (triangle.z > DISTANCE_THRESHOLD) {
        if (getAngle(triangle) > ANGLE_THREHOLD) {
          event.preventDefault();
          self.moveReadyX = true;
          self.$el[0].addEventListener('click', self, true);
        } else {
          self.scrolling = false;
        }
      }
    }
  },

  touchEndHandler: function touchEndHandler(event, type) {
    var self = this;

    self.$el[0].removeEventListener(events.move[type], self, false);
    document.removeEventListener(events.end[type], self, false);

    if (!self.scrolling) {
      return;
    }

    self.currentX = parseInt(self.$inner.css('left'));

    var newPoint = -(self.currentX + self.initLeft) / self._distance;

    newPoint = self.directionX > 0 ? Math.ceil(newPoint) : self.directionX < 0 ? Math.floor(newPoint) : Math.round(newPoint);

    self.touchAfter();

    if (self.moveReadyX) {
      self.moveToPoint(newPoint);
    } else {
      self.moveReadyX = false;
      self.scrolling = false;
    }
  },

  touchAfter: function touchAfter() {
    var self = this;

    setTimeout(function () {
      self.$el[0].removeEventListener('click', self, true);
    }, 200);
  },

  setPositionX: function setPositionX() {
    var self = this;

    self.$inner.stop().css({
      left: self._newL
    });
  },

  moveToPoint: function moveToPoint(point, duration) {
    var self = this;

    if (self.timer !== false) {
      clearTimeout(self.timer);
      self.timer = false;
    }

    self.flag = false;

    var _duration = duration === undefined ? self._duration : duration;
    var beforePoint = self.currentPoint;

    if (point === undefined) {
      point = self.currentPoint;
    }

    self.currentPoint = parseInt(point, 10);

    if (!self.loop && self.currentPoint > self._maxPoint) {
      self.currentPoint = self._maxPoint;
      self.setNextPositionX(_duration / 3);
    } else if (!self.loop && self.currentPoint < 0) {
      self.currentPoint = 0;
      self.setNextPositionX(_duration / 3);
    } else {
      self.setNextPositionX(_duration);
    }
  },

  setNextPositionX: function setNextPositionX(duration) {
    var self = this;

    var _duration = duration === undefined ? self._duration : duration;

    self._newL = -self.currentPoint * self._distance - self.initLeft;

    var point;

    if (self.showDot) {
      if (self.currentPoint > self._maxPoint) {
        point = 0;
      } else if (self.currentPoint < 0) {
        point = self._maxPoint;
      } else {
        point = self.currentPoint;
      }

      self.$dots.find('a').removeClass('is-current');
      self.$dots.find('a').eq(point).addClass('is-current');
    }

    if (self.showArrow && self._maxPoint > 0) {
      if (self._maxPoint == self.currentPoint && !self.loop) {
        TweenMax.to(self.$next, this._duration, { autoAlpha: 0, display: 'none' });
        if (self.$prev.css('display') == 'none') {
          TweenMax.to(self.$prev, this._duration, { autoAlpha: 1, display: 'block' });
        }
      } else if (self.currentPoint === 0 && !self.loop) {
        TweenMax.to(self.$prev, this._duration, { autoAlpha: 0, display: 'none' });
        if (self.$next.css('display') == 'none') {
          TweenMax.to(self.$next, this._duration, { autoAlpha: 1, display: 'block' });
        }
      } else {
        if (self.$next.css('display') == 'none') {
          TweenMax.to(self.$next, this._duration, { autoAlpha: 1, display: 'block' });
        }
        if (self.$prev.css('display') == 'none') {
          TweenMax.to(self.$prev, this._duration, { autoAlpha: 1, display: 'block' });
        }
      }
    }

    self.$inner.css('pointer-events', 'none');
    TweenMax.to(self.$inner, _duration, {
      css: { left: self._newL },
      onComplete: function onComplete() {
        self.moveReadyX = false;
        self.scrolling = false;
        self.flag = true;

        self.$inner.css('pointer-events', 'auto');

        if (self.currentPoint > self._maxPoint) {
          self._newL = -self.initLeft;
          self.currentPoint = 0;
          self.$inner.css({
            left: self._newL
          });
        } else if (self.currentPoint < 0) {
          self._newL = -self._maxPoint * self._distance - self.initLeft;
          self.currentPoint = self._maxPoint;
          self.$inner.css({
            left: self._newL
          });
        }

        if (self.auto && self._maxPoint > 0) self.autoPlay();

        if (!self.loop && self.currentPoint == self._maxPoint - 1 && self.directionX > 0) {
          $(window).triggerHandler('carouselEndpoint');
        }
      }
    });
  }
};

function getPage(event, page) {
  return event.changedTouches ? event.changedTouches[0][page] : event[page];
}

function getTriangleSide(x1, y1, x2, y2) {
  var x = x1 - x2;
  var y = y1 - y2;
  var z = Math.sqrt(Math.pow(Math.abs(x), 2) + Math.pow(Math.abs(y), 2));

  return {
    x: x,
    y: y,
    z: z
  };
}

function getAngle(triangle) {
  var cos = Math.abs(triangle.y) / triangle.z;
  var radina = Math.acos(cos);

  return 180 / (Math.PI / radina);
}

module.exports = Carousel;

},{"../_var.js":2}],14:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _browser = require('./global/browser.js');

var _var2 = require('./_var.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

},{"./_var.js":2,"./global/browser.js":7,"events":1}],23:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _var2 = require('./_var.js');

var _carousel = require('./global/carousel.js');

var _carousel2 = _interopRequireDefault(_carousel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

var Top = function (_EventEmitter) {
  _inherits(Top, _EventEmitter);

  function Top() {
    _classCallCheck(this, Top);

    var _this = _possibleConstructorReturn(this, _EventEmitter.call(this));

    _this.Hero = document.querySelector('.tp-Hero');

    if (_this.Hero) {
      _this.initialize();
    }
    return _this;
  }

  Top.prototype.initialize = function initialize() {

    this.strS = ['.js-Top_Item'];
    this.strM = {};
    this.strO = {
      checkInterval: 100,
      liquid: true
    };

    this.heroCarousel = new _carousel2.default('.js-TpHeroCarousel');

  };

  return Top;
}(EventEmitter);

exports.default = Top;

},{"./_var.js":2,"./global/carousel.js":8,"events":1}],29:[function(require,module,exports){
'use strict';

var _browser = require('./_mod/global/browser.js');

var _var2 = require('./_mod/_var.js');

var _top = require('./_mod/top.js');

var _top2 = _interopRequireDefault(_top);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

document.getElementsByTagName('html')[0].setAttribute('class', 'is-jsOn');

if (!_browser._browser.anim) {
  document.getElementsByTagName('html')[0].classList.add('is-browserRegacy');
}

var App = function (_EventEmitter) {
  _inherits(App, _EventEmitter);

  function App() {
    _classCallCheck(this, App);

    var _this = _possibleConstructorReturn(this, _EventEmitter.call(this));

    _this.top = new _top2.default();
    return _this;
  }

  return App;
}(EventEmitter);

document.addEventListener('DOMContentLoaded', function () {
  var app = new App();
}, false);

},{"./_mod/_var.js":2,"./_mod/global/browser.js":7,"./_mod/top.js":23,"events":1}]},{},[29]);
