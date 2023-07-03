export function debugLog(...args: any[]): void {
  const debug = process.env.DEBUG_MODE === "true";
  if (debug) {
    console.log("DEBUG:",...args);
  }
}
