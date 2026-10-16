import { Config } from "@remotion/cli/config";

// Chromium pré-instalado (evita o download do Chrome Headless Shell, bloqueado na rede).
// Sobrescreva com a variável de ambiente BROWSER_EXECUTABLE se necessário.
const browser =
  process.env.BROWSER_EXECUTABLE ??
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

Config.setBrowserExecutable(browser);
Config.setChromiumOpenGlRenderer("swangle");
Config.setVideoImageFormat("jpeg");
Config.setStillImageFormat("png");
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);
Config.setConcurrency(2);
Config.setPublicDir("./public");
