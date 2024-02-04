import {Observable} from 'rxjs';
import {Change, ListChangeReason, ObservableCollection} from './observable-collection';
import {DotnetObservableListener} from "./dotnet-observable-listener";
import {DotNetObjectReference} from "../scaffolding/dot-net-object-reference";

export class RxObservableCollection<T> extends ObservableCollection<T> {
    asObservable(): Observable<Change<T>> {
        return new Observable<Change<T>>(subscriber => {
            const items: T[] = this.getItems();
            if (items.length > 0) {
                subscriber.next(new Change<T>(ListChangeReason.AddRange, items))
            }
            const listener = (event: Change<T>) => subscriber.next(event);
            this.addListener(listener);

            return () => {
                this.removeListener(listener);
            };
        });
    }
    
    listenDotnet(listener: DotNetObjectReference) : DotnetObservableListener<Change<T>>{
        return new DotnetObservableListener<Change<T>>(this.asObservable(), listener);
    }
}

