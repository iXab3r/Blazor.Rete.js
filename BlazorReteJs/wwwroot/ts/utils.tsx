export function setProperty(obj: any, propName: string, value: any): void {
    obj[propName] = value;
}

export function getProperty(obj: any, propName: string): any {
    return obj[propName];
}
