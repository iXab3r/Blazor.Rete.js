// wwwroot/ts/BlazorReteJsInterop.tsx
var BlazorReteJsInterop = {
  setObjectProperty: function(obj, propName, value) {
    obj[propName] = value;
  },
  getObjectProperty: function(obj, propName, defaultValue) {
    return obj[propName] ?? defaultValue;
  }
};
window.BlazorReteJsInterop = BlazorReteJsInterop;
//# sourceMappingURL=BlazorReteJsInterop.js.map
