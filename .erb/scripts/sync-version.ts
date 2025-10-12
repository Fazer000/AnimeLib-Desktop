/**
 * Синхронизирует версию из корневого package.json в release/app/package.json
 * Используется при сборке приложения
 */

import fs from 'fs';
import path from 'path';

const rootPackageJsonPath = path.join(__dirname, '../../package.json');
const releasePackageJsonPath = path.join(
  __dirname,
  '../../release/app/package.json',
);

// Читаем версию из корневого package.json
const rootPackageJson = JSON.parse(
  fs.readFileSync(rootPackageJsonPath, 'utf-8'),
);
const { version } = rootPackageJson;

// Читаем release/app/package.json
const releasePackageJson = JSON.parse(
  fs.readFileSync(releasePackageJsonPath, 'utf-8'),
);

// Обновляем версию
releasePackageJson.version = version;

// Также синхронизируем другие поля
releasePackageJson.description = rootPackageJson.description;
releasePackageJson.name = rootPackageJson.name;
releasePackageJson.license = rootPackageJson.license;

// Сохраняем
fs.writeFileSync(
  releasePackageJsonPath,
  `${JSON.stringify(releasePackageJson, null, 2)}\n`,
  'utf-8',
);

console.log(
  `[sync-version] Synchronized version ${version} to release/app/package.json`,
);
console.log(`[sync-version] ✅ Version sync complete!`);
