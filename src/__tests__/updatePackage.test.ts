import {
  buildInstallCommand,
  buildManualInstallCommand,
  buildRelaunchCommand,
  getAssetName,
  getLinuxLauncherPath,
  getRelaunchArgs,
  pickAssetUrl,
  resolvePackageKind,
} from '../shared/updatePackage';

const REPO = 'https://github.com/Fazer000/AnimeLib-Desktop';

describe('resolvePackageKind', () => {
  it('Windows и macOS определяются по платформе', () => {
    expect(resolvePackageKind('win32', undefined, null)).toBe('exe');
    expect(resolvePackageKind('darwin', undefined, null)).toBe('dmg');
  });

  it('AppImage узнаётся по переменной APPIMAGE', () => {
    expect(resolvePackageKind('linux', '/home/u/App.AppImage', 'deb')).toBe(
      'appimage',
    );
  });

  it('deb и rpm — по файлу package-type, с переводом строки тоже', () => {
    expect(resolvePackageKind('linux', undefined, 'deb')).toBe('deb');
    expect(resolvePackageKind('linux', undefined, 'rpm\n')).toBe('rpm');
  });

  it('без признаков на Linux — AppImage', () => {
    expect(resolvePackageKind('linux', undefined, null)).toBe('appimage');
    expect(resolvePackageKind('linux', undefined, 'pacman')).toBe('appimage');
  });
});

describe('getAssetName', () => {
  it('совпадает с именами файлов из сборки', () => {
    expect(getAssetName('exe', '1.10.0')).toBe(
      'AnimeLib-Desktop-Setup-1.10.0.exe',
    );
    expect(getAssetName('appimage', '1.10.0')).toBe(
      'AnimeLib-Desktop-Setup-1.10.0.AppImage',
    );
    expect(getAssetName('deb', '1.10.0')).toBe('AnimeLib-Desktop-1.10.0.deb');
    expect(getAssetName('rpm', '1.10.0')).toBe('AnimeLib-Desktop-1.10.0.rpm');
  });
});

describe('pickAssetUrl', () => {
  const assets = [
    { name: 'AnimeLib-Desktop-Setup-1.10.0.exe', browser_download_url: 'exe' },
    {
      name: 'AnimeLib-Desktop-Setup-1.10.0.AppImage',
      browser_download_url: 'appimage',
    },
    { name: 'AnimeLib-Desktop-1.10.0.deb', browser_download_url: 'deb' },
    { name: 'AnimeLib-Desktop-1.10.0.rpm', browser_download_url: 'rpm' },
  ];

  it('каждая установка получает свой файл', () => {
    expect(pickAssetUrl(assets, 'exe', '1.10.0', REPO)).toBe('exe');
    expect(pickAssetUrl(assets, 'appimage', '1.10.0', REPO)).toBe('appimage');
    expect(pickAssetUrl(assets, 'deb', '1.10.0', REPO)).toBe('deb');
    expect(pickAssetUrl(assets, 'rpm', '1.10.0', REPO)).toBe('rpm');
  });

  it('переименованный файл того же типа тоже подходит', () => {
    expect(
      pickAssetUrl(
        [{ name: 'animelib_1.10.0_amd64.deb', browser_download_url: 'x' }],
        'deb',
        '1.10.0',
        REPO,
      ),
    ).toBe('x');
  });

  it('без файла в релизе — ссылка по шаблону', () => {
    expect(pickAssetUrl([], 'deb', '1.10.0', REPO)).toBe(
      `${REPO}/releases/download/v1.10.0/AnimeLib-Desktop-1.10.0.deb`,
    );
  });
});

describe('buildInstallCommand', () => {
  const none = { dnf: false, zypper: false };

  it('deb ставится через apt-get под окном пароля', () => {
    expect(buildInstallCommand('deb', '/home/u/a.deb', none)).toEqual({
      command: 'pkexec',
      args: ['apt-get', 'install', '-y', '--allow-downgrades', '/home/u/a.deb'],
    });
  });

  it('rpm — через dnf, затем zypper, иначе rpm', () => {
    expect(
      buildInstallCommand('rpm', '/a.rpm', { dnf: true, zypper: true })
        ?.args[0],
    ).toBe('dnf');
    expect(
      buildInstallCommand('rpm', '/a.rpm', { dnf: false, zypper: true })
        ?.args[0],
    ).toBe('zypper');
    expect(buildInstallCommand('rpm', '/a.rpm', none)?.args[0]).toBe('rpm');
  });

  it('для AppImage и Windows команды нет', () => {
    expect(buildInstallCommand('appimage', '/a', none)).toBeNull();
    expect(buildInstallCommand('exe', 'C:\\a.exe', none)).toBeNull();
  });
});

describe('buildManualInstallCommand', () => {
  const none = { dnf: false, zypper: false };

  it('deb — apt с путём в кавычках', () => {
    expect(
      buildManualInstallCommand(
        'deb',
        '/home/u/Загрузки/AnimeLib-Desktop-1.10.0.deb',
        none,
      ),
    ).toBe("sudo apt install '/home/u/Загрузки/AnimeLib-Desktop-1.10.0.deb'");
  });

  it('rpm — менеджер системы', () => {
    expect(
      buildManualInstallCommand('rpm', '/a.rpm', { ...none, dnf: true }),
    ).toBe("sudo dnf install '/a.rpm'");
    expect(
      buildManualInstallCommand('rpm', '/a.rpm', { ...none, zypper: true }),
    ).toBe("sudo zypper install --allow-unsigned-rpm '/a.rpm'");
    expect(buildManualInstallCommand('rpm', '/a.rpm', none)).toBe(
      "sudo rpm -U '/a.rpm'",
    );
  });

  it('кавычка в пути не ломает команду', () => {
    expect(buildManualInstallCommand('deb', "/home/o'neil/a.deb", none)).toBe(
      "sudo apt install '/home/o'\\''neil/a.deb'",
    );
  });

  it('для AppImage команды нет', () => {
    expect(buildManualInstallCommand('appimage', '/a', none)).toBeNull();
  });
});

describe('getRelaunchArgs', () => {
  it('убирает путь к бинарнику и --no-sandbox, остальное сохраняет', () => {
    expect(
      getRelaunchArgs(['/opt/app-bin', '--no-sandbox', '--foo', 'bar']),
    ).toEqual(['--foo', 'bar']);
  });
});

describe('buildRelaunchCommand', () => {
  it('ждёт выхода процесса и запускает приложение с аргументами', () => {
    const { command, args } = buildRelaunchCommand(
      '/home/u/App.AppImage',
      ['--foo'],
      4242,
    );
    expect(command).toBe('/bin/bash');
    expect(args[1]).toMatch(/exec \$fd>&-/);
    expect(args[1]).toMatch(/kill -0 "\$1"/);
    expect(args.slice(2)).toEqual([
      'relaunch',
      '4242',
      '/home/u/App.AppImage',
      '--foo',
    ]);
  });
});

describe('getLinuxLauncherPath', () => {
  it('ведёт на обёртку запуска рядом с бинарником', () => {
    expect(
      getLinuxLauncherPath('/opt/AnimeLib-Desktop/animelib-desktop-bin'),
    ).toBe('/opt/AnimeLib-Desktop/animelib-desktop');
  });
});
