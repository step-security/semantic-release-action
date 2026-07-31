const axios = require('axios');
const fs = require('fs');
const core = require('@actions/core');
const {
  handleBranchesOption,
  handleDryRunOption,
  handleCiOption,
  handleExtends,
  handleTagFormat,
  handleRepositoryUrlOption,
} = require('./handleOptions');
const setUpJob = require('./setUpJob.task');
const installSpecifyingVersionSemantic = require('./installSpecifyingVersionSemantic.task');
const preInstall = require('./preInstall.task');
const cleanupNpmrc = require('./cleanupNpmrc.task');
const windUpJob = require('./windUpJob.task');
const inputs = require('./inputs.json');

async function validateSubscription() {
  let repoPrivate;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    const payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    repoPrivate = payload?.repository?.private;
  }

  const upstream = 'cycjimmy/semantic-release-action';
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl = 'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions';
  core.info('');
  core.info('[1;36mStepSecurity Maintained Action[0m');
  core.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false) core.info('[32m✓ Free for public repositories[0m');
  core.info(`[36mLearn more:[0m ${docsUrl}`);
  core.info('');
  if (repoPrivate === false) return;

  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const body = { action: action || '' };
  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl;

  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body,
      { timeout: 3000 }
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      core.error('[1;31mThis action requires a StepSecurity subscription for private repositories.[0m');
      core.error(`[31mLearn how to enable a subscription: ${docsUrl}[0m`);
      process.exit(1);
    }
    core.info('Timeout or API not reachable. Continuing to next step.');
  }
}

/**
 * Release main task
 * @returns {Promise<void>}
 */
const release = async () => {
  await validateSubscription();

  if (core.getInput(inputs.working_directory)) {
    process.chdir(core.getInput(inputs.working_directory));
  }
  await setUpJob();
  await installSpecifyingVersionSemantic();
  await preInstall(core.getInput(inputs.extra_plugins));
  await preInstall(core.getInput(inputs.extends));

  if (core.getInput(inputs.unset_gha_env) === 'true') {
    core.debug('Unset GITHUB_ACTIONS environment variable');
    delete process.env.GITHUB_ACTIONS;
  }

  const semanticRelease = await import('semantic-release');
  const result = await semanticRelease.default({
    ...handleBranchesOption(),
    ...handleDryRunOption(),
    ...handleCiOption(),
    ...handleExtends(),
    ...handleTagFormat(),
    ...handleRepositoryUrlOption()
  });

  await cleanupNpmrc();
  await windUpJob(result);
};

core.debug('Initialization successful');
release().catch(core.setFailed);
