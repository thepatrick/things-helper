import { keyboard } from "@nut-tree/nut-js";
import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from "electron";
import * as path from "path";

async function createWindow() {
  const preloadScriptPath = path.join(__dirname, "preload.js");

  const mainWindow = new BrowserWindow({
    width: 150,
    height: 200,
    show: false,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      contextIsolation: true,
      preload: preloadScriptPath,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.session.on(
    "select-serial-port",
    (event, portList, webContents, callback) => {
      //Add listeners to handle ports being added or removed before the callback for `select-serial-port`
      //is called.
      mainWindow.webContents.session.on("serial-port-added", (event, port) => {
        console.log("serial-port-added FIRED WITH", port);
        //Optionally update portList to add the new port
      });

      mainWindow.webContents.session.on(
        "serial-port-removed",
        (event, port) => {
          console.log("serial-port-removed FIRED WITH", port);
          //Optionally update portList to remove the port
        }
      );

      event.preventDefault();
      if (portList && portList.length > 0) {
        callback(portList[0].portId);
      } else {
        callback(""); //Could not find any matching devices
      }
    }
  );

  mainWindow.webContents.session.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      if (permission === "serial" && details.securityOrigin === "file:///") {
        return true;
      }

      return false;
    }
  );

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === "serial" && details.origin === "file://") {
      return true;
    }

    return false;
  });

  await mainWindow.loadFile(path.join(__dirname, "../index.html"));

  keyboard.config.autoDelayMs = 0;

  ipcMain.handle(
    "scannedBarcode",
    async function toMain(
      _event,
      barcode: string,
      mode: "tab" | "enter" | "open"
    ) {
      switch (mode) {
        case "enter":
          keyboard.type(`${barcode}\n`);
          break;
        case "tab":
          keyboard.type(`${barcode}\t`);
          break;
        case "open":
          console.log(
            "tell browser to open",
            `https://things.p2.network/hardware/bytag?assetTag=${encodeURIComponent(
              barcode
            )}`
          );
      }
    }
  );

  // mainWindow.webContents.openDevTools();

  await mainWindow.webContents.executeJavaScript(`testIt();`, true);
}

Menu.setApplicationMenu(null);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  // if (process.platform !== "darwin") {
  app.quit();
  // }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
