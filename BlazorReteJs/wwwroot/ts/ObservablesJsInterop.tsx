import {DotnetObservableListener} from "./collections/dotnet-observable-listener";
import {DotnetObjectReference} from "./scaffolding/dotnet-object-reference";
import {Observable, Subscription} from 'rxjs';

const ObservablesJsInterop = {
    createObservableListener: createObservableListener
};

function createObservableListener<T>(observable: Observable<T>, listener: DotnetObjectReference): DotnetObservableListener<T> {
    return new DotnetObservableListener(observable, listener);
}

// Attach the namespace object to the window for access
(window as any).ObservablesJsInterop = ObservablesJsInterop;
