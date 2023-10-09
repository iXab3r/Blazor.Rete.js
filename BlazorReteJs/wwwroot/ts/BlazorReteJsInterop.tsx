const BlazorReteJsInterop = {
    setObjectProperty: function (obj, propName, value) {
        obj[propName] = value;
    },

    getObjectProperty: function (obj, propName, defaultValue) {
        return obj[propName] ?? defaultValue;
    }
};

// Attach the namespace object to the window for access
(window as any).BlazorReteJsInterop = BlazorReteJsInterop;
