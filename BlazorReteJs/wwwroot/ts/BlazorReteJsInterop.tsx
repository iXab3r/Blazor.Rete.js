// noinspection JSUnusedGlobalSymbols called from .NET

const BlazorReteJsInterop = {
    setObjectField: function (obj, propName, value) {
        obj[propName] = value;
    },

    getObjectField: function (obj, propName, defaultValue) {
        return obj[propName] ?? defaultValue;
    }
};

// Attach the namespace object to the window for access
(window as any).BlazorReteJsInterop = BlazorReteJsInterop;


