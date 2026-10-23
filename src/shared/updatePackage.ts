/** Выбор файла релиза и команд установки для обновления */
import {
  UPDATE_ASSET_PREFIX,
  UPDATE_LINUX_EXECUTABLE,
  UPDATE_PACKAGE_PREFIX,
} from '../constants/update';

/** Вид установки: определяет файл релиза и способ обновления */
export type UpdatePackageKind = 'exe' | 'dmg' | 'appimage' | 'deb' | 'rpm';

/** Команда, которую надо выполнить для установки пакета */
export interface InstallCommand {
  command: string;
  args: string[];
}

/** Какие пакетные менеджеры есть в системе */
export interface PackageManagers {
  dnf: boolean;
  zypper: boolean;
}

/** Вид установки: exe, dmg, AppImage, deb или rpm */
export const resolvePackageKind = (
  platform: string,
  appImagePath: string | undefined,
  packageType: string | null,
): UpdatePackageKind => {
  if (platform === 'win32') return 'exe';
  if (platform === 'darwin') return 'dmg';
  if (appImagePath) return 'appimage';

  const type = packageType?.trim();
  if (type === 'deb' || type === 'rpm') return type;

  return 'appimage';
};

/** Имя файла релиза для этого вида установки */
export const getAssetName = (
  kind: UpdatePackageKind,
  version: string,
): string => {
  switch (kind) {
    case 'deb':
    case 'rpm':
      return `${UPDATE_PACKAGE_PREFIX}-${version}.${kind}`;
    case 'appimage':
      return `${UPDATE_ASSET_PREFIX}-${version}.AppImage`;
    default:
      return `${UPDATE_ASSET_PREFIX}-${version}.${kind}`;
  }
};

/** Ссылка на файл релиза для этой установки */
export const pickAssetUrl = (
  assets: { name?: string; browser_download_url?: string }[],
  kind: UpdatePackageKind,
  version: string,
  repoUrl: string,
): string => {
  const name = getAssetName(kind, version);
  const extension = name.slice(name.lastIndexOf('.'));
  const exact = assets.find((asset) => asset.name === name);
  const sameType = assets.find((asset) =>
    String(asset.name || '').endsWith(extension),
  );
  const url = (exact ?? sameType)?.browser_download_url;

  return url || `${repoUrl}/releases/download/v${version}/${name}`;
};

/** Команда установки deb или rpm через pkexec */
export const buildInstallCommand = (
  kind: UpdatePackageKind,
  filePath: string,
  managers: PackageManagers,
): InstallCommand | null => {
  if (kind === 'deb') {
    return {
      command: 'pkexec',
      args: ['apt-get', 'install', '-y', '--allow-downgrades', filePath],
    };
  }

  if (kind !== 'rpm') return null;

  if (managers.dnf) {
    return { command: 'pkexec', args: ['dnf', 'install', '-y', filePath] };
  }

  if (managers.zypper) {
    return {
      command: 'pkexec',
      args: [
        'zypper',
        '--non-interactive',
        'install',
        '--allow-unsigned-rpm',
        filePath,
      ],
    };
  }

  return { command: 'pkexec', args: ['rpm', '-U', '--replacepkgs', filePath] };
};

/** Путь в одинарных кавычках для shell */
const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, `'\\''`)}'`;

/** Команда ручной установки deb или rpm в терминале */
export const buildManualInstallCommand = (
  kind: UpdatePackageKind,
  filePath: string,
  managers: PackageManagers,
): string | null => {
  const file = shellQuote(filePath);

  if (kind === 'deb') return `sudo apt install ${file}`;
  if (kind !== 'rpm') return null;
  if (managers.dnf) return `sudo dnf install ${file}`;
  if (managers.zypper) {
    return `sudo zypper install --allow-unsigned-rpm ${file}`;
  }

  return `sudo rpm -U ${file}`;
};

/** Аргументы для перезапуска без --no-sandbox */
export const getRelaunchArgs = (argv: string[]): string[] =>
  argv.slice(1).filter((arg) => arg !== '--no-sandbox');

/** Скрипт перезапуска: ждёт выхода процесса $1 и запускает приложение */
const RELAUNCH_SCRIPT = [
  // eslint-disable-next-line no-template-curly-in-string
  'for fd in /proc/$$/fd/*; do fd=${fd##*/}; [ "$fd" -gt 2 ] && eval "exec $fd>&-"; done 2>/dev/null',
  'while kill -0 "$1" 2>/dev/null; do sleep 0.2; done',
  'shift',
  'exec "$@"',
].join('; ');

/** Команда перезапуска на Linux после выхода процесса pid */
export const buildRelaunchCommand = (
  execPath: string,
  args: string[],
  pid: number,
): InstallCommand => ({
  command: '/bin/bash',
  args: ['-c', RELAUNCH_SCRIPT, 'relaunch', String(pid), execPath, ...args],
});

/** Обёртка запуска рядом с бинарником: через неё перезапускают deb и rpm */
export const getLinuxLauncherPath = (execPath: string): string =>
  execPath.replace(/[^/]+$/, UPDATE_LINUX_EXECUTABLE);
