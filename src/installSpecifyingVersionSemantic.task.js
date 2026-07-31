const path = require('path');
const core = require('@actions/core');
const { execFile } = require('child_process');
const { promisify } = require('util');
const inputs = require('./inputs.json');

const execFileAsync = promisify(execFile);

module.exports = async () => {
  const semantic_version = core.getInput(inputs.semantic_version);

  const pkg = semantic_version
    ? `semantic-release@${semantic_version}`
    : 'semantic-release';

  const { stdout, stderr } = await execFileAsync('npm', ['install', pkg, '--no-audit', '--silent'], {
    cwd: path.resolve(__dirname, '..')
  });
  core.debug(stdout);
  core.error(stderr);
};
