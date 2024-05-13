import { clickupCdk } from '@time-loop/clickup-projen';
import { JsonPatch, javascript } from 'projen';

const name = 'cdk-lambda-eni-usage-metric-publisher';
const project = new clickupCdk.ClickUpCdkConstructLibrary({
  name,
  author: 'jose-clickup',
  authorAddress: 'jamoroso@clickup.com',
  cdkVersion: '2.105.0',
  defaultReleaseBranch: 'main',
  devDeps: ['@time-loop/clickup-projen', '@aws-cdk/integ-tests-alpha', 'aws-sdk-mock', '@aws-sdk/client-cloudwatch'],
  projenrcTs: true,
  packageManager: javascript.NodePackageManager.PNPM,
  pnpmVersion: '9',
  repositoryUrl: `https://github.com/time-loop/${name}.git`,
  gitignore: ['.vscode/**'],
  bundledDeps: ['aws-sdk'],
  peerDeps: ['multi-convention-namer'],
  experimentalIntegRunner: true,
  // deps: [] /* Runtime dependencies of this module. */,
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});
// Assume the usInfraDev role
const build = project.tryFindObjectFile('.github/workflows/build.yml');
build?.addOverride('jobs.build.permissions', { 'id-token': 'write' });
build?.patch(
  JsonPatch.add('/jobs/build/steps/0', {
    name: 'Configure AWS Credentials',
    uses: 'aws-actions/configure-aws-credentials@v2',
    with: {
      'aws-region': 'us-west-2',
      'role-to-assume': `arn:aws:iam::425845004253:role/${name}-github-actions-role`,
      'role-duration-seconds': 900,
    },
  }),
);
project.synth();
