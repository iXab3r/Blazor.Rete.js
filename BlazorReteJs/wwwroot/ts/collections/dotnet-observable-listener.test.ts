import { DotnetObservableListener } from './dotnet-observable-listener';
import { of, throwError, Subject } from 'rxjs';

describe('DotnetObservableListener', () => {
    let mockDotnetObjectReference: any;
    let listener: DotnetObservableListener<any>;

    beforeEach(() => {
        // Mocking the DotnetObjectReference with jest.fn() to track method calls
        mockDotnetObjectReference = {
            invokeMethodAsync: jest.fn()
        };
    });

    afterEach(() => {
        if (listener) {
            listener.dispose();
        }
    });

    it('should invoke OnNext method when observable emits a value', async () => {
        const observable = of('testValue');
        listener = new DotnetObservableListener(observable, mockDotnetObjectReference);

        await new Promise(resolve => setTimeout(resolve, 50)); // Giving a bit of time for async operations

        expect(mockDotnetObjectReference.invokeMethodAsync).toHaveBeenCalledWith('OnNext', 'testValue');
    });

    it('should invoke OnError method when observable errors out', async () => {
        const observable = throwError('testError');
        listener = new DotnetObservableListener(observable, mockDotnetObjectReference);

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockDotnetObjectReference.invokeMethodAsync).toHaveBeenCalledWith('OnError', 'testError');
    });

    it('should invoke OnCompleted method when observable completes', async () => {
        const observable = of('testValue'); // completes immediately after emitting value
        listener = new DotnetObservableListener(observable, mockDotnetObjectReference);

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockDotnetObjectReference.invokeMethodAsync).toHaveBeenCalledWith('OnCompleted');
    });

    it('should stop listening to observable after dispose is called', async () => {
        const subject = new Subject<string>();
        listener = new DotnetObservableListener(subject, mockDotnetObjectReference);

        listener.dispose();
        subject.next('testValueAfterDispose');

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockDotnetObjectReference.invokeMethodAsync).not.toHaveBeenCalledWith('OnNext', 'testValueAfterDispose');
    });

});

