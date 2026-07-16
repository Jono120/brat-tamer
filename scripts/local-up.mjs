#!/usr/bin/env node
/**
 * Bring CareStickers online for local development.
 *
 * Usage:
 *   node scripts/local-up.mjs [target] [options]
 *
 * Targets (default: web):
 *   web      Vite :3000 + API :3001
 *   android  above + Capacitor build, emulator, debug APK install & launch
 *   ios      above + Capacitor iOS build (macOS: pod install + Simulator)
 *   all      web + android (+ ios on macOS)
 *
 * Options:
 *   --skip-build     Skip Capacitor native rebuild (android/ios)
 *   --skip-dev       Assume dev servers are already running
 *   --no-kill        Do not stop processes on ports 3000/3001 first
 *   --avd <name>     Android emulator AVD (default: CareStickers or $ANDROID_AVD)
 *
 * Prerequisites:
 *   - .env.local with Supabase + DATABASE_URL (see .env.example)
 *   - Android: Android SDK, an AVD, JAVA_HOME (Android Studio JBR on Windows)
 *   - iOS: macOS with Xcode, CocoaPods
 *
 * Important: do not export VITE_API_BASE in your shell — each target uses its own
 * .env.capacitor-* file (web uses the Vite proxy; unset VITE_API_BASE).
 */

import { spawn, spawnSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";
import { platform, homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const WEB_PORT = Number(process.env.VITE_PORT || 3000);
const API_PORT = Number(process.env.PORT || 3001);
const APP_ID = "com.carestickers.app";
const DEFAULT_AVD = process.env.ANDROID_AVD || "CareStickers";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const positional = args.filter((a) => !a.startsWith("--"));
const target = positional[0] || "web";
const skipBuild = flags.has("--skip-build");
const skipDev = flags.has("--skip-dev");
const noKill = flags.has("--no-kill");
const avdFlagIdx = args.indexOf("--avd");
const avdName = avdFlagIdx >= 0 ? args[avdFlagIdx + 1] : DEFAULT_AVD;

const VALID_TARGETS = new Set(["web", "android", "ios", "all"]);

function log(msg) {
  console.log(`==> ${msg}`);
}

function warn(msg) {
  console.warn(`!! ${msg}`);
}

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function run(cmd, cmdArgs, opts = {}) {
  const result = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: cleanEnv(),
    ...opts,
  });
  if (result.status !== 0) {
    fail(`Command failed: ${cmd} ${cmdArgs.join(" ")}`);
  }
}

function cleanEnv() {
  const env = { ...process.env };
  delete env.VITE_API_BASE;
  return env;
}

function androidHome() {
  if (process.env.ANDROID_HOME) return process.env.ANDROID_HOME;
  if (process.platform === "win32") {
    return join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
  }
  return join(homedir(), "Library", "Android", "sdk");
}

function javaHome() {
  if (process.env.JAVA_HOME) return process.env.JAVA_HOME;
  if (process.platform === "win32") {
    const studio = "C:\\Program Files\\Android\\Android Studio\\jbr";
    if (existsSync(studio)) return studio;
  }
  return null;
}

function adbPath() {
  const sdk = androidHome();
  const bin = process.platform === "win32" ? "adb.exe" : "adb";
  return join(sdk, "platform-tools", bin);
}

function emulatorPath() {
  const sdk = androidHome();
  const bin = process.platform === "win32" ? "emulator.exe" : "emulator";
  return join(sdk, "emulator", bin);
}

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

function killPort(port) {
  try {
    if (process.platform === "win32") {
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
          log(`Stopped process on port ${port} (PID ${pid})`);
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
    /* port likely free */
  }
}

async function waitForApi(timeoutMs = 60_000) {
  const url = `http://127.0.0.1:${API_PORT}/api/health`;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json();
        if (body?.ok) return;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  fail(`API did not become healthy at ${url} within ${timeoutMs / 1000}s`);
}

let devChild = null;

function startDevServers() {
  log(`Starting dev servers (web :${WEB_PORT}, API :${API_PORT})…`);
  devChild = spawn("npm", ["run", "dev"], {
    cwd: ROOT,
    env: cleanEnv(),
    detached: true,
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  devChild.unref();
}

function adb(args) {
  const adbBin = adbPath();
  if (!existsSync(adbBin)) fail(`adb not found at ${adbBin}. Set ANDROID_HOME.`);
  const result = spawnSync(adbBin, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { status: result.status ?? 1, stdout: result.stdout || "", stderr: result.stderr || "" };
}

function hasEmulatorDevice() {
  const { stdout } = adb(["devices"]);
  return stdout.split(/\r?\n/).some((l) => l.startsWith("emulator-") && l.includes("device"));
}

function startEmulator() {
  const emu = emulatorPath();
  if (!existsSync(emu)) fail(`emulator not found at ${emu}`);
  log(`Starting Android emulator (${avdName})…`);
  const child = spawn(emu, ["-avd", avdName, "-no-snapshot-load", "-no-metrics"], {
    detached: true,
    stdio: "ignore",
    shell: false,
  });
  child.unref();
}

async function waitForEmulator(timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (hasEmulatorDevice()) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  fail("Emulator did not come online in time");
}

async function ensureDev() {
  if (skipDev) {
    log("Skipping dev server start (--skip-dev)");
    await waitForApi(10_000);
    return;
  }

  if (!noKill) {
    if (await portInUse(WEB_PORT)) killPort(WEB_PORT);
    if (await portInUse(API_PORT)) killPort(API_PORT);
    await new Promise((r) => setTimeout(r, 1500));
  }

  if ((await portInUse(API_PORT)) && (await portInUse(WEB_PORT))) {
    log("Ports already in use — reusing existing dev servers");
  } else {
    startDevServers();
  }

  await waitForApi();
  log(`API healthy at http://localhost:${API_PORT}/api/health`);
}

async function upWeb() {
  log(`Web app: http://localhost:${WEB_PORT}`);
}

async function upAndroid() {
  if (!skipBuild) {
    log("Building Capacitor bundle for Android (http://10.0.2.2:3001)…");
    run("npm", ["run", "build:cap:local"]);
  }

  if (!hasEmulatorDevice()) {
    startEmulator();
    await waitForEmulator();
  } else {
    log("Android emulator already running");
  }

  const jh = javaHome();
  const gradleEnv = cleanEnv();
  if (jh) gradleEnv.JAVA_HOME = jh;

  log("Building debug APK…");
  const gradleCmd = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  const gradleResult = spawnSync(gradleCmd, ["assembleDebug"], {
    cwd: join(ROOT, "android"),
    stdio: "inherit",
    shell: process.platform === "win32",
    env: gradleEnv,
  });
  if (gradleResult.status !== 0) fail("Gradle assembleDebug failed");

  const apk = join(ROOT, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
  if (!existsSync(apk)) fail(`APK not found: ${apk}`);

  log("Installing and launching app…");
  const install = adb(["install", "-r", apk]);
  if (install.status !== 0) fail(`adb install failed: ${install.stderr}`);

  adb(["shell", "am", "start", "-n", `${APP_ID}/.MainActivity`]);
  log("CareStickers running on Android emulator");
}

async function upIos() {
  if (process.platform !== "darwin") {
    warn("iOS Simulator requires macOS + Xcode. Skipping simulator launch.");
    if (!skipBuild) {
      log("Building Capacitor bundle for iOS (http://localhost:3001)…");
      run("npm", ["run", "build:cap:ios-local"]);
    }
    log("On a Mac, run: cd ios/App && pod install && cd ../.. && npm run cap:open:ios");
    return;
  }

  if (!skipBuild) {
    log("Building Capacitor bundle for iOS (http://localhost:3001)…");
    run("npm", ["run", "build:cap:ios-local"]);
  }

  const podfileLock = join(ROOT, "ios", "App", "Podfile.lock");
  if (!existsSync(podfileLock)) {
    log("Running pod install…");
    run("pod", ["install"], { cwd: join(ROOT, "ios", "App") });
  }

  const xcodebuild = spawnSync("xcodebuild", ["-version"], { encoding: "utf8" });
  if (xcodebuild.status !== 0) {
    warn("xcodebuild not available. Open Xcode manually: npm run cap:open:ios");
    return;
  }

  log("Building and launching iOS Simulator…");
  const workspace = join(ROOT, "ios", "App", "App.xcworkspace");
  run("xcodebuild", [
    "-workspace",
    workspace,
    "-scheme",
    "App",
    "-configuration",
    "Debug",
    "-destination",
    "generic/platform=iOS Simulator",
    "-derivedDataPath",
    join(ROOT, "ios", "App", "build"),
    "build",
  ]);

  const appPath = join(
    ROOT,
    "ios",
    "App",
    "build",
    "Build",
    "Products",
    "Debug-iphonesimulator",
    "App.app",
  );

  if (!existsSync(appPath)) {
    warn(`Built app not found at ${appPath}`);
    log("Open in Xcode instead: npm run cap:open:ios");
    return;
  }

  spawnSync("xcrun", ["simctl", "boot", "booted"], { stdio: "ignore" });
  run("xcrun", ["simctl", "install", "booted", appPath]);
  run("xcrun", ["simctl", "launch", "booted", APP_ID]);
  log("CareStickers running on iOS Simulator");
}

function printHelp() {
  console.log(`CareStickers local development launcher

Usage:
  node scripts/local-up.mjs [target] [options]

Targets:
  web       Start Vite + API (default)
  android   Start dev servers + Android emulator + debug APK
  ios       Start dev servers + iOS build (+ Simulator on macOS)
  all       web + android (+ ios on macOS)

Options:
  --skip-build   Skip Capacitor native rebuild
  --skip-dev     Assume dev servers already running
  --no-kill      Do not free ports 3000/3001 before starting
  --avd <name>   Android AVD name (default: ${DEFAULT_AVD})

Examples:
  npm run local:up
  npm run local:up:android
  node scripts/local-up.mjs all --skip-build

Stop everything:
  npm run local:down
`);
}

async function main() {
  if (flags.has("--help") || flags.has("-h")) {
    printHelp();
    return;
  }

  if (!VALID_TARGETS.has(target)) {
    fail(`Unknown target "${target}". Use: web | android | ios | all`);
  }

  if (!existsSync(join(ROOT, ".env.local")) && !existsSync(join(ROOT, ".env"))) {
    warn("No .env.local or .env found — copy .env.example and configure Supabase + DATABASE_URL");
  }

  const wantsWeb = target === "web" || target === "all";
  const wantsAndroid = target === "android" || target === "all";
  const wantsIos = target === "ios" || target === "all";

  await ensureDev();

  if (wantsWeb) await upWeb();
  if (wantsAndroid) await upAndroid();
  if (wantsIos) await upIos();

  console.log("");
  log("Done.");
  if (!skipDev) {
    console.log(`  Web:     http://localhost:${WEB_PORT}`);
    console.log(`  API:     http://localhost:${API_PORT}/api/health`);
    console.log("  Stop:    npm run local:down");
  }
  if (wantsAndroid) {
    console.log("  Android: sign in with a hosted Supabase account (not local seed password)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
