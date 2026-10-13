interface BeforeParseEvent {
    filename: string;
    source: string;
}
export declare const handlers: {
    beforeParse(event: BeforeParseEvent): void;
};
export {};
