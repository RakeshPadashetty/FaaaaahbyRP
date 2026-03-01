import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import { exec, spawn } from "child_process";

let disposables: vscode.Disposable[] = [];
let powershellProcess: ReturnType<typeof spawn> | null = null;
let lastPlayTime = 0;
const platform = os.platform();
export function activate(context: vscode.ExtensionContext) {
  console.log("Terminal Error Sound extension activated"); // Start persistent PowerShell process for fast sound playback (Windows only)
  if (platform === "win32") {
    startPowershellProcess();
  }
  const shellExecutionEndListener =
    vscode.window.onDidEndTerminalShellExecution((event) => {
      const config = vscode.workspace.getConfiguration("faaaaahbyrp");
      const enabled = config.get<boolean>("enabled", true);
      if (!enabled) {
        return;
      }
      if (event.exitCode !== undefined && event.exitCode !== 0) {
        playErrorSound(context, config);
      }
    });
  disposables.push(shellExecutionEndListener);
  context.subscriptions.push(...disposables);
}
function playErrorSound(
  context: vscode.ExtensionContext,
  config: vscode.WorkspaceConfiguration,
): void {
  const useSystemBeep = config.get<boolean>("useSystemBeep", false);
  const customSoundFile = config.get<string>("soundFile", "");
  if (useSystemBeep) {
    playSystemBeep();
  } else {
    const soundPath = customSoundFile || getDefaultSoundPath(context);
    playSoundFile(soundPath);
  }
}
function getDefaultSoundPath(context: vscode.ExtensionContext): string {
  return path.join(context.extensionPath, "sounds", "error.mp3");
}
function playSystemBeep(): void {
  let command: string;
  if (platform === "win32") {
    command = `powershell -Command "[console]::Beep(800, 200)"`;
  } else if (platform === "darwin") {
    command = `afplay /System/Library/Sounds/Basso.aiff`;
  } else {
    command = `paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || echo -e '\\a'`;
  }
  exec(command, (error) => {
    if (error) {
      console.error("Failed to play system beep:", error);
    }
  });
}
function startPowershellProcess(): void {
  if (powershellProcess) {
    return;
  }
  powershellProcess = spawn(
    "powershell",
    ["-NoProfile", "-NoLogo", "-Command", "-"],
    { stdio: ["pipe", "pipe", "pipe"], windowsHide: true },
  ); // Preload the assembly
  powershellProcess.stdin?.write("Add-Type -AssemblyName presentationCore\n");
  powershellProcess.stdin?.write(
    "$global:player = New-Object System.Windows.Media.MediaPlayer\n",
  );
  powershellProcess.on("exit", () => {
    powershellProcess = null;
  });
}
function playSoundFile(soundPath: string): void {
  // Debounce - ignore if played within last 500ms
  const now = Date.now();
  if (now - lastPlayTime < 500) {
    return;
  }
  lastPlayTime = now;
  if (platform === "win32") {
    // Windows: Use persistent PowerShell process
    const escapedPath = soundPath.replace(/\\/g, "\\\\").replace(/'/g, "''");
    if (powershellProcess && powershellProcess.stdin) {
      powershellProcess.stdin.write(
        `$global:player.Stop(); $global:player.Open([System.Uri]'${escapedPath}'); $global:player.Play()\n`,
      );
    } else {
      playSystemBeep();
    }
  } else if (platform === "darwin") {
    // macOS: Use afplay (fast, built-in)
    exec(`afplay "${soundPath}" &`, (error) => {
      if (error) {
        console.error("Failed to play sound on macOS:", error);
        playSystemBeep();
      }
    });
  } else {
    // Linux: Use paplay or aplay
    exec(
      `paplay "${soundPath}" 2>/dev/null || aplay "${soundPath}" &`,
      (error) => {
        if (error) {
          console.error("Failed to play sound on Linux:", error);
          playSystemBeep();
        }
      },
    );
  }
}
export function deactivate() {
  disposables.forEach((d) => d.dispose());
  disposables = [];
  if (powershellProcess) {
    powershellProcess.stdin?.write("exit\n");
    powershellProcess.kill();
    powershellProcess = null;
  }
}
