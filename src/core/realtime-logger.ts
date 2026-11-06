import { LogLevel, type ILogger } from '@microsoft/signalr';

/**
 * Messages SignalR logs as errors when a connection is stopped on purpose while it is still
 * starting: leaving a page, a reload, or React mounting an effect twice in development. Nothing
 * failed, but every reload printed a red "Failed to start the connection: Error: The connection
 * was stopped during negotiation." in the console.
 */
const INTENTIONAL_STOP = [
  /stopped during negotiation/i,
  /stopped before the hub handshake/i,
  /connection was stopped before/i,
];

/** The Warning-level logger the hubs used before, minus the intentional-stop noise. */
export const signalRLogger: ILogger = {
  log(level, message) {
    if (level < LogLevel.Warning) return;
    if (INTENTIONAL_STOP.some((pattern) => pattern.test(message))) return;
    if (level >= LogLevel.Error) console.error(`[SignalR] ${message}`);
    else console.warn(`[SignalR] ${message}`);
  },
};
