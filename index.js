/**
 * By Daniel Lever - daniel@ed.com.au
 */
var install = (function ($) {

	/*
	 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
	 */
	window.requestAnimFrame = (function () {
		return  window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function (callback) {
				window.setTimeout(callback, 1000 / 30);
			};
	})();
	
	var AXIS_X = 1;
	var AXIS_Y = 2;
	
	var MODE_SCROLL = 1;
	var MODE_POSITION = 2;
	
	$.fn.disableScroll = function() {
		
		return this.each(function() {
			
			var handleWheel = function(e) {
				e.stopPropagation();
				e.preventDefault();
			};
			
			$(this).bind("mousewheel", handleWheel);
			$(this).bind("DOMMouseScroll", handleWheel);
			
		});
		
	};
	
	$.fn.scroller = function(options) {
		
		var args = arguments;
		
		var returnValue;
		
		this.each(function(index) {
			
			var scroller = $.data(this, 'scroller');
			
			// Have specified a method to call
			if(typeof args[0] == 'string') {
				
				if(!scroller) {
					throw new Error("Called scroller method '"+args[0]+"' before actually initializing one.");
				} else if (args[0] in scroller === false) {
					throw new Error("Attempted to call invalid scroller method '"+args[0]+"'");
				} else {
					var methodArgs = Array.prototype.slice.call(args, 1);
					returnValue = scroller[args[0]].apply(scroller, methodArgs);
				}
				
			} else if(options === undefined || typeof options == 'object') {
				
				// Supplied options
				if(!scroller) {
					// No scroller, so create one
					createScroller($(this), options || {});
				} else {
					// Scroller already exists, just update it's options
					scroller.options(options);
				}
				
			}
			
			
		});
		
		return returnValue === undefined ? this : returnValue;
		
	};
	
	var createScroller = function(scrollEl, options) {
		
		// Options
		options = jQuery.extend({
			
			// Elements
			receiver: scrollEl,
			content: scrollEl,
			frame: scrollEl,
			
			// Options
			axis: 'y',					// either X or Y
			mode: 'scroll',				// either 'scroll', 'position' or 'none'
			mousewheel: true,			// Enable/disable mouse wheel scrolling
			mouseDrag: false,			// Allow mouse dragging (click/drag)
			touchDrag: true,			// Mouse dragging, but with touch only
			autostartTouch: true,		// Set this to `false` if you'd like to manually call `touchStart(e)`
			friction: 0.9,				// higher number means faster slow down
			stepSize: 1,				// step size
			minMovement: 0.1,			// minimum velocity before actually moving. 0.1 is a sensible default
			
			// State
			disabled: false,
			
			// Callbacks
			getCurrentPosition: null,	// Should return a number less than zero, the current scroll offset
			getContentSize: null,		// Should return a number - the size of the scrollable content
			getFrameSize: null,			// Should return a number - the size of the scrollable area,
			
			// Events
			update: null,				// Called every time the scroll position changes. First argument is the scroll offset in pixels, second argument is the scroll progress (between 0 and 1)
			
		}, options);
		
		// Runtime vars
		var running = false,
			
			currentPos = 0,
			targetPos = 0,
			lastPos = 0,
			
			minScroll = 0,
			maxScroll = 0,
			
			direction,
			velocity = 0,
			
			contentSize = 0,
			frameSize = 0,
			
			axisID = (options.axis == 'x' && AXIS_X) || (options.axis == 'y' && AXIS_Y),
			modeID = (options.mode == 'scroll' && MODE_SCROLL) || (options.mode == 'position' && MODE_POSITION),
			
			isDragging = false,
			dragStartTimer = 0,
			dragStartWaiting = false,
			dragStartPos = 0,
			dragStartPagePos = 0,
			lastDragPos = 0,
			dragSpeed = 0;
		
		var updateScrollTarget = function(delta) {
			
			targetPos += delta;
			velocity += (targetPos - lastPos) * options.stepSize;
			
			lastPos = targetPos;
			
		};
		
		var render = function(force) {
			if(velocity < -(options.minMovement) || velocity > options.minMovement || force) {
				
				updateScrollSize();
				
				currentPos = (currentPos + velocity);
				if(maxScroll > 0) {
					// Content is smaller than scrollable area
					currentPos = 0;
					velocity = 0;
				} else if(currentPos < maxScroll) {
					// Have scrolled too far forward
					velocity = 0;
					currentPos = maxScroll;
				} else if (currentPos > minScroll) {
					// Scrolled too far backward
					velocity = 0;
					currentPos = minScroll;
				}
				
				if(modeID == MODE_SCROLL) {
					if(axisID == AXIS_Y) {
						options.frame.scrollTop(-currentPos);
					} else if(axisID == AXIS_X) {
						options.frame.scrollLeft(-currentPos);
					}
				} else if(modeID == MODE_POSITION) {
					if(axisID == AXIS_Y) {
						options.content.css('top', currentPos+'px');
					} else if(axisID == AXIS_X) {
						options.content.css('left', currentPos+'px');
					}
				}
				
				if(options.update) {
					options.update(currentPos, currentPos/maxScroll || 0, maxScroll);
				}
				
				// Apply friction
				velocity *= options.friction;
			}
		};
		
		// Updates internal value of current position
		var updatePosition = function() {
			if(modeID == MODE_SCROLL) {
				if(axisID == AXIS_Y) {
					currentPos = -options.frame.scrollTop();
				} else if(axisID == AXIS_X) {
					currentPos = -options.frame.scrollLeft();
				}
			} else if(modeID == MODE_POSITION) {
				if(axisID == AXIS_Y) {
					currentPos = parseFloat(options.content[0].style.top) || 0;
				} else if(axisID == AXIS_X) {
					currentPos = parseFloat(options.content[0].style.left) || 0;
				}
			}
		};
		
		var animateLoop = function() {
			if(!running) return;
			requestAnimFrame(animateLoop);
			render();
		};
		
		var handleWheel = function(e) {
			
			if(options.disabled) return;
			
			e.stopPropagation();
			e.preventDefault();
			
			var evt = e.originalEvent;
		   
			var delta = evt.detail ? evt.detail * -1 : evt.wheelDelta / 40;
			var dir = delta < 0 ? -1 : 1;
			if(dir != direction) {
				velocity = 0;
				direction = dir;
			}
			
			// Update currentPos in case user has scrolled with scroll bar
			updatePosition();
			
			// Update scroll target based on delta
			updateScrollTarget(delta);
			
		};
		
		var updateScrollSize = function() {
			
			// Get frame size
			if(options.getFrameSize) {
				
				// Custom frame size callback
				frameSize = options.getFrameSize();
				
			} else {
				
				// Get frame frame el
				if(axisID == AXIS_Y) {
					frameSize = options.frame[0].clientHeight;
				} else if(axisID == AXIS_X) {
					frameSize = options.frame[0].clientWidth;
				}
				
			}
			
			// Get content size
			if(options.getContentSize) {
				
				// Custom content size callback
				contentSize = options.getContentSize();
				
			} else if(modeID == MODE_SCROLL) {
				
				// Get native scroll size of the frame el
				if(axisID == AXIS_Y) {
					contentSize = options.frame[0].scrollHeight;
				} else if(axisID == AXIS_X) {
					contentSize = options.frame[0].scrollWidth;
				}
				
			} else if(modeID == MODE_POSITION) {
				
				// Get the width or height of the content el
				if(axisID == AXIS_Y) {
					contentSize = options.content[0].clientHeight;
				} else if(axisID == AXIS_X) {
					contentSize = options.content[0].clientWidth;
				}
				
			}
			
			maxScroll = -(contentSize - frameSize);
			
		};
		
		// Bind mousewheel events
		if(options.mousewheel === true) {
			options.receiver.bind("mousewheel", handleWheel);
			options.receiver.bind("DOMMouseScroll", handleWheel);

			updatePosition();
			
			targetPos = lastPos = currentPos;
			
			updateScrollSize();
			
			if(options.remove) {
				running = false;
				options.receiver.unbind("mousewheel", handleWheel);
				options.receiver.unbind("DOMMouseScroll", handleWheel);
			} else if(!running) {
				running = true;
				animateLoop();
			}
			
		}
		
		var eventAxis = options.axis == 'y' ? 'pageY' : 'pageX';
		
		var touchStartFunc;
		if(options.touchDrag && ('ontouchstart' in window)) {
			touchStartFunc = function(e) {
				if(e.originalEvent.touches) {
					var touch = e.originalEvent.touches[0];
					isDragging = true;
					dragStartPagePos = touch[eventAxis];
					dragStartPos = currentPos;
					lastDrag = 0;
					dragSpeed = 0;
				}
			};
			options.receiver.bind("touchstart", function(e) {
				if(options.disabled) return;
				if(options.autostartTouch) {
					// e.preventDefault();
					// e.stopPropagation();
					dragStartWaiting = e;
					dragStartTimer = setTimeout(function() {
						touchStartFunc(e);
					}, 200);
				}
			});
			
			$(window).bind("touchend touchcancel touchleave", function(e) {
				if(dragStartWaiting) {
					dragStartWaiting = false;
					clearInterval(dragStartTimer);
				}
				if(isDragging) {
					e.preventDefault();
					e.stopPropagation();
					isDragging = false;
					velocity = -dragSpeed;
					dragSpeed = 0;
				}
			}).bind("touchmove", function(e) {
				if(dragStartWaiting) {
					touchStartFunc(dragStartWaiting);
					dragStartWaiting = false;
					clearInterval(dragStartTimer);
				}
				if(isDragging) {
					var touch = e.originalEvent.touches[0];
					dragSpeed = lastDragPos - touch[eventAxis];
					lastDragPos = touch[eventAxis];
					currentPos = dragStartPos - (dragStartPagePos - touch[eventAxis]);
					render(true);
				}
			});
		}
		
		var mouseStartFunc;
		if(options.mouseDrag) {
			mouseStartFunc = function(e) {
				if(e.pageX || e.pageY) {
					isDragging = true;
					dragStartPagePos = e[eventAxis];
					dragStartPos = currentPos;
					lastDrag = 0;
					dragSpeed = 0;
				}
			};
			options.receiver.bind("mousedown", function(e) {
				if(options.autostartTouch) {
					e.preventDefault();
					e.stopPropagation();
					mouseStartFunc(e);
				}
			});
			
			$(window).bind("mouseup", function(e) {
				e.preventDefault();
				e.stopPropagation();
				isDragging = false;
				velocity = -dragSpeed;
				dragSpeed = 0;
			}).bind("mousemove", function(e) {
				if(isDragging) {
					dragSpeed = lastDragPos - e[eventAxis];
					lastDragPos = e[eventAxis];
					currentPos = dragStartPos - (dragStartPagePos - e[eventAxis]);
					render(true);
				}
			});
		}
		
		var scroller = {
			refresh: function() {
				updatePosition();
				render(true);
        animateLoop();
			},
			disable: function() {
				options.disabled = true;
			},
			enable: function() {
				options.disabled = false;
			},
			startTouch: function(e) {
				if(touchStartFunc) touchStartFunc(e);
				if(mouseStartFunc) touchStartFunc(e);
			},
			destroy: function() {
				options.disabled = true;
				$.data(scrollEl[0], 'scroller', null);
			},
			getScrollSize: function() {
				updateScrollSize();
				return {contentSize: contentSize, frameSize: frameSize, currentPos: currentPos};
			}
		};
		
		window.scroller = scroller;
		
		$.data(scrollEl[0], 'scroller', scroller);
		
	};

});

if(typeof jQuery === "object") {
  install(jQuery);
} else if(typeof module === "object") {
  module.exports = install;
}