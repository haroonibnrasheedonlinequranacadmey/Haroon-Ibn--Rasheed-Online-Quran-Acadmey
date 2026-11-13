const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const ACADEMY_URL = "https://haroonibnrasheedonlinequranacadmey.github.io/Haroon-Ibn--Rasheed-Online-Quran-Acadmey/";
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 850, minWidth: 900, minHeight: 650,
    title: "Haroon Ibn Rasheed Online Quran Academy",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadURL(ACADEMY_URL);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") && !url.includes("haroonibnrasheedonlinequranacadmey.github.io")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}
app.whenReady().then(() => { createWindow(); app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
