import {Observable, Subscription} from 'rxjs';
import {DotNetObjectReference} from "../scaffolding/dot-net-object-reference";
import * as log from 'loglevel';

export class DotnetObservableListener<T> {
    private readonly anchors: Subscription = new Subscription();
    private readonly logger: log.Logger = log.getLogger(DotnetObservableListener.name);

    constructor(observable: Observable<T>, listener: DotNetObjectReference) {
        this.logger.setLevel(log.levels.INFO);
        this.anchors.add(observable.subscribe(async event => {
            this.logger.debug(`Raising Observable OnNext: ${JSON.stringify(event)}`);
            await listener.invokeMethodAsync("OnNext", event)
            this.logger.debug(`Raised Observable OnNext: ${JSON.stringify(event)}`);
        }, async error => {
            this.logger.debug(`Raising Observable OnError: ${JSON.stringify(error)}`);
            await listener.invokeMethodAsync("OnError", error)
            this.logger.debug(`Raised Observable OnError: ${JSON.stringify(error)}`);
        }, async () => {
            this.logger.debug(`Raising Observable OnCompleted`);
            await listener.invokeMethodAsync("OnCompleted");
            this.logger.debug(`Raised Observable OnCompleted`);
        }));
    }

    // Dispose method to allow the listener to be cleaned up
    dispose(): void {
        this.logger.debug('Disposing dotnet listener');
        this.anchors.unsubscribe();
        this.logger.debug('Disposed dotnet listener');
    }
}