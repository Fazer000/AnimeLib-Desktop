/**
 * Какой файл релиза нужен этой установке и как его поставить.
 * Без electron, чтобы проверять тестами.
 */
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

/**
 * Вид установки. На Linux AppImage выдаёт переменная APPIMAGE,
 * deb и rpm — файл resources/package-type от electron-builder
 */
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

/**
 * Ссылка на файл релиза: сначала точное имя, затем любой файл того же
 * типа, иначе ссылка по шаблону имени
 */
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

/**
 * Установка deb или rpm через системное окно пароля (pkexec).
 * null — для этого вида установки команды нет
 */
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

/**
 * Команда для ручной установки в терминале, если окно пароля закрыли.
 * null — пакет ставится не командой
 */
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

/**
 * Аргументы для перезапуска: без --no-sandbox, его снова добавит
 * обёртка запуска, если песочница в системе запрещена
 */
export const getRelaunchArgs = (argv: string[]): string[] =>
  argv.slice(1).filter((arg) => arg !== '--no-sandbox');

/**
 * Скрипт перезапуска: закрывает унаследованные дескрипторы (иначе старый
 * образ AppImage остаётся смонтированным, а сокеты переходят к новой
 * копии), ждёт выхода процесса $1 и запускает приложение
 */
const RELAUNCH_SCRIPT = [
  // ${fd##*/} — подстановка bash, а не шаблон JS
  // eslint-disable-next-line no-template-curly-in-string
  'for fd in /proc/$$/fd/*; do fd=${fd##*/}; [ "$fd" -gt 2 ] && eval "exec $fd>&-"; done 2>/dev/null',
  'while kill -0 "$1" 2>/dev/null; do sleep 0.2; done',
  'shift',
  'exec "$@"',
].join('; ');

/**
 * Перезапуск на Linux через bash, ждущий выхода процесса pid.
 * app.relaunch не годится: его помощник живёт внутри образа AppImage
 * и пропадает вместе с ним, а запуск без ожидания упирается
 * в блокировку единственного экземпляра
 */
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
