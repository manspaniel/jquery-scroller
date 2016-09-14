This barebones little jQuery plugin adds easily horizontal and vertical scrolling, with support for touch/mouse dragging. By default, it modifies the `scrollTop` and `scrollLeft` values of an element, however it can be configured to use `top` and `left` CSS values instead, so that you can emulate scrolling on absolutely positioned elements :)

BYO jQuery, and no dependencies.

# Installation

To install, you can simply include the main script in your header, after jQuery has been included.

If you're using Webpack/Browserify, you can just do

```
npm install jquery-scroller
```

If you're `require`ing the module, you'll want to do:

```
const jQuery = require('jquery')
require('jquery-scroller')(jQuery)
```

# Usage

## Basic Usage

HTML:
```html
<div id="scroller">
  <ul>
    <li>Apple</li>
    <li>Apple</li>
    <li>Apple</li>
    <li>Apple</li>
    <li>Apple</li>
    <li>Orange</li>
    <li>Orange</li>
    <li>Orange</li>
    <li>Orange</li>
    <li>Orange</li>
  </ul>
</div>
```

CSS:
```less
#scroller {
  overflow: auto;     // Hidden also works!
}
```

JS:
```js
$("#scroller").scroller({
  mode: "scroll",
  axis: "y"
})
```