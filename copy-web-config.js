import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copiar web.config
const sourceWebConfig = path.resolve(__dirname, "web.config");
const destinationWebConfig = path.resolve(__dirname, "dist", "web.config");

fs.copyFileSync(sourceWebConfig, destinationWebConfig);

console.log("web.config copiado correctamente a dist/");
