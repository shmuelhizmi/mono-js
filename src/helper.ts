import { Resolable } from "./types/promise";

export function createResolvable<T extends Record<string, any>>(object: T): T & Resolable {
    let resolve: () => void;
    let reject: (error?: Error) => void;
    const promose = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {
        ...object,
        await: () => promose,
        resolve: () => resolve(),
        reject: (error: Error) => reject(error),
    };
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}