"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var import_child_process = require("child_process");
var disposables = [];
var powershellProcess = null;
var lastPlayTime = 0;
var platform2 = os.platform();
function activate(context) {
  console.log("Terminal Error Sound extension activated");
  if (platform2 === "win32") {
    startPowershellProcess();
  }
  const shellExecutionEndListener = vscode.window.onDidEndTerminalShellExecution((event) => {
    const config = vscode.workspace.getConfiguration("faaaaahbyrp");
    const enabled = config.get("enabled", true);
    if (!enabled) {
      return;
    }
    if (event.exitCode !== void 0 && event.exitCode !== 0) {
      playErrorSound(context, config);
    }
  });
  disposables.push(shellExecutionEndListener);
  context.subscriptions.push(...disposables);
}
function playErrorSound(context, config) {
  const useSystemBeep = config.get("useSystemBeep", false);
  const customSoundFile = config.get("soundFile", "");
  if (useSystemBeep) {
    playSystemBeep();
  } else {
    const soundPath = customSoundFile || getDefaultSoundPath(context);
    playSoundFile(soundPath);
  }
}
function getDefaultSoundPath(context) {
  return path.join(context.extensionPath, "sounds", "error.mp3");
}
function playSystemBeep() {
  let command;
  if (platform2 === "win32") {
    command = `powershell -Command "[console]::Beep(800, 200)"`;
  } else if (platform2 === "darwin") {
    command = `afplay /System/Library/Sounds/Basso.aiff`;
  } else {
    command = `paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || echo -e '\\a'`;
  }
  (0, import_child_process.exec)(command, (error) => {
    if (error) {
      console.error("Failed to play system beep:", error);
    }
  });
}
function startPowershellProcess() {
  if (powershellProcess) {
    return;
  }
  powershellProcess = (0, import_child_process.spawn)(
    "powershell",
    ["-NoProfile", "-NoLogo", "-Command", "-"],
    { stdio: ["pipe", "pipe", "pipe"], windowsHide: true }
  );
  powershellProcess.stdin?.write("Add-Type -AssemblyName presentationCore\n");
  powershellProcess.stdin?.write(
    "$global:player = New-Object System.Windows.Media.MediaPlayer\n"
  );
  powershellProcess.on("exit", () => {
    powershellProcess = null;
  });
}
function playSoundFile(soundPath) {
  const now = Date.now();
  if (now - lastPlayTime < 500) {
    return;
  }
  lastPlayTime = now;
  if (platform2 === "win32") {
    const escapedPath = soundPath.replace(/\\/g, "\\\\").replace(/'/g, "''");
    if (powershellProcess && powershellProcess.stdin) {
      powershellProcess.stdin.write(
        `$global:player.Stop(); $global:player.Open([System.Uri]'${escapedPath}'); $global:player.Play()
`
      );
    } else {
      playSystemBeep();
    }
  } else if (platform2 === "darwin") {
    (0, import_child_process.exec)(`afplay "${soundPath}" &`, (error) => {
      if (error) {
        console.error("Failed to play sound on macOS:", error);
        playSystemBeep();
      }
    });
  } else {
    (0, import_child_process.exec)(
      `paplay "${soundPath}" 2>/dev/null || aplay "${soundPath}" &`,
      (error) => {
        if (error) {
          console.error("Failed to play sound on Linux:", error);
          playSystemBeep();
        }
      }
    );
  }
}
function deactivate() {
  disposables.forEach((d) => d.dispose());
  disposables = [];
  if (powershellProcess) {
    powershellProcess.stdin?.write("exit\n");
    powershellProcess.kill();
    powershellProcess = null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
