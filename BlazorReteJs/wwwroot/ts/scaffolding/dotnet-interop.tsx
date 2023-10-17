export interface DotNetHelper {
    invokeMethodAsync<T>(methodName: string, ...args: any[]): Promise<T>;
}