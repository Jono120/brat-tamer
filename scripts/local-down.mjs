#!/usr/bin/env node
/**
 * Stop local CareStickers dev servers, Android emulator, and the native app.
 *
 * Usage: node scripts/local-down.mjs
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const WEB_PORT = Number(process.env.VITE_PORT || 3000);
const API_PORT = Number(process.env.PORT || 3001);
const APP_ID = "com.carestickers.app";

function log(msg) {
  console.log(`==> ${msg}`);
}

function killPort(port) {
  try {
    if (platform() === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (!line.includes("LISTENING")) continue;
        const pid = line.trim().split(/\s+/).pop();
        if (pid && pid !== "0") pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          log(`Stopped port ${port} (PID ${pid})`);
        } catch {
          /* ignore */
        }
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
        stdio: "ignore",
        shell: true,
      });
      log(`Cleared port ${port}`);
    }
  } catch {
    /* free */
  }
}

function adbPath() {
  const sdk =
    process.env.ANDROID_HOME ||
    (platform() === "win32"
      ? join(process.env.LOCALAPPDATA || "", "Android", "Sdk")
      : join(homedir(), "Library", "Android", "sdk"));
  const bin = platform() === "win32" ? "adb.exe" : "adb";
  return join(sdk, "platform-tools", bin);
}

function killProjectNode() {
  try {
    if (platform() === "win32") {
      const procs = execSync(
        `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'carestickers|vite --port=3000|tsx watch server' } | Select-Object -ExpandProperty ProcessId`,
        { encoding: "utf8", shell: "powershell.exe" },
      );
      for (const pid of procs.split(/\r?\n/).filter(Boolean)) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          log(`Stopped node PID ${pid}`);
        } catch {
          /* ignore */
        }
      }
    } else {
      execSync(
        `pkill -f "vite.*3000|tsx watch server|concurrently.*vite" 2>/dev/null || true`,
        { stdio: "ignore", shell: true },
      );
    }
  } catch {
    /* none */
  }
}

log("Stopping CareStickers local stack…");

killPort(WEB_PORT);
killPort(API_PORT);
killProjectNode();

const adb = adbPath();
if (existsSync(adb)) {
  spawnSync(adb, ["shell", "am", "force-stop", APP_ID], { stdio: "ignore" });
  spawnSync(adb, ["emu", "kill"], { stdio: "ignore" });
  log("Stopped Android app and emulator");
}

if (platform() === "darwin") {
  try {
    execSync("xcrun simctl shutdown booted 2>/dev/null || true", {
      stdio: "ignore",
      shell: true,
    });
    log("Shut down iOS Simulator");
  } catch {
    /* ignore */
  }
}

log("All local instances stopped.");
