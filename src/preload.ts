import { contextBridge, ipcRenderer } from "electron";

/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */

contextBridge.exposeInMainWorld("API", {
  scannedBarcode: async (barcode: string, mode: "tab" | "enter" | "open") =>
    ipcRenderer.invoke("scannedBarcode", barcode, mode),
});
