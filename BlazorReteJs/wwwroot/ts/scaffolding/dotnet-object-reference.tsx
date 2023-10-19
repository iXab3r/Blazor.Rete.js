export interface DotnetObjectReference {
    invokeMethodAsync<T>(methodName: string, ...args: any[]): Promise<T>;
}