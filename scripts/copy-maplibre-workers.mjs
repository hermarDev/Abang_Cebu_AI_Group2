import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const sourceDir = fileURLToPath(
  new URL("../node_modules/maplibre-gl/dist/", import.meta.url),
);
const outputDir = fileURLToPath(new URL("../public/maplibre-gl/", import.meta.url));
const workers = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

await mkdir(outputDir, { recursive: true });
await Promise.all(
  workers.map((worker) =>
    copyFile(join(sourceDir, worker), join(outputDir, worker)),
  ),
);
const licensePath = join(outputDir, "LICENSE.txt");
await copyFile(
  fileURLToPath(new URL("../node_modules/maplibre-gl/LICENSE.txt", import.meta.url)),
  licensePath,
);
console.log(`Copied ${workers.length} MapLibre worker assets and license to public/maplibre-gl/`);
