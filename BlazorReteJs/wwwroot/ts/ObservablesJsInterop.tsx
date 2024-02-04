// noinspection JSUnusedGlobalSymbols called from .NET

import {DotnetObservableListener} from "./collections/dotnet-observable-listener";
import {DotNetObjectReference} from "./scaffolding/dot-net-object-reference";
import {Observable, Subscription} from 'rxjs';

const ObservablesJsInterop = {
    createObservableListener: createObservableListener
};

function createObservableListener<T>(observable: Observable<T>, listener: DotNetObjectReference): DotnetObservableListener<T> {
    return new DotnetObservableListener(observable, listener);
}

// Attach the namespace object to the window for access
(window as any).ObservablesJsInterop = ObservablesJsInterop;
