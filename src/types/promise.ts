export interface Resolable {
    resolve(): void;
    await(): Promise<void>;
    reject(error: Error): void;
}