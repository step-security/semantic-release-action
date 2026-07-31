const path = require('path');
const core = require('@actions/core');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

module.exports = async extras => {
  if (!extras) {
    return Promise.resolve();
  }

  const packages = extras
    .split(/[\n\r]+/)
    .map(p => p.trim())
    .filter(Boolean);

  const silentArgs = process.env.RUNNER_DEBUG === '1' ? [] : ['--silent'];

  const { stdout, stderr } = await execFileAsync('npm', ['install', ...packages, '--no-audit', ...silentArgs], {
    cwd: path.resolve(__dirname, '..')
  });
  core.debug(stdout);
  core.error(stderr);
};
