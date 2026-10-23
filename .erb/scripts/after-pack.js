const fs = require('fs');
const path = require('path');

/** Linux: ставит обёртку запуска вместо исполняемого файла */
exports.default = async function installLinuxLauncher(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  if (electronPlatformName !== 'linux') return;

  const executable = path.join(appOutDir, packager.executableName);
  const launcher = path.join(__dirname, 'linux-launcher.sh');

  fs.renameSync(executable, `${executable}-bin`);
  fs.copyFileSync(launcher, executable);
  fs.chmodSync(executable, 0o755);
};
