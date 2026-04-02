import { clickupCdk } from '@time-loop/clickup-projen';
import { JsonPatch } from 'projen';
import { IntegTestResources } from './test/utils/integ-tests-types';

const name = 'cdk-lambda-eni-usage-metric-publisher';
const cdkVersion = '2.189.0';
const project = new clickupCdk.ClickUpCdkConstructLibrary({
  name,
  author: 'jose-clickup',
  authorAddress: 'jamoroso@clickup.com',
  cdkVersion,
  defaultReleaseBranch: 'main',
  experimentalIntegRunner: true,
  gitignore: ['.vscode/**'],
  projenrcTs: true,
  repositoryUrl: `https://github.com/time-loop/${name}.git`,
  bundledDeps: ['@aws-sdk/client-cloudwatch', '@aws-sdk/client-ec2'],
  devDeps: [
    '@time-loop/clickup-projen',
    `@aws-cdk/integ-runner@${cdkVersion}`,
    `@aws-cdk/integ-tests-alpha@${cdkVersion}-alpha.0`,
    'aws-sdk-client-mock',
  ],
  peerDeps: ['multi-convention-namer'],
});

project.npmrc.addConfig('node-linker', 'hoisted'); // PNPM support for bundledDeps https://pnpm.io/npmrc#node-linker

// Pin integ packages to match cdkVersion; experimentalIntegRunner hardcodes @latest which causes
// decorator incompatibilities when the latest version's peer dep exceeds the pinned aws-cdk-lib.
project.tryFindObjectFile('package.json')?.addOverride('pnpm.overrides.@aws-cdk/integ-runner', cdkVersion);
project.tryFindObjectFile('package.json')?.addOverride('pnpm.overrides.@aws-cdk/integ-tests-alpha', `${cdkVersion}-alpha.0`);

// Assume the usInfraDev role
const build = project.tryFindObjectFile('.github/workflows/build.yml');
build?.addOverride('jobs.build.permissions', { 'id-token': 'write' });
build?.patch(
  JsonPatch.add('/jobs/build/steps/0', {
    name: 'Configure AWS Credentials',
    uses: 'aws-actions/configure-aws-credentials@v2',
    with: {
      'aws-region': IntegTestResources.AWS_REGION,
      'role-to-assume': `arn:aws:iam::${IntegTestResources.AWS_ACCOUNT}:role/${name}-github-actions-role`,
      'role-duration-seconds': 900,
    },
  }),
);
project.synth();
