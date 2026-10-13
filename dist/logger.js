export const consoleLogger = {
    log: message => console.log(message),
    warn: message => console.warn(message)
};
export const silentLogger = {
    log: () => { },
    warn: () => { }
};
