import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Namer } from 'multi-convention-namer';
import { LambdaEniUsageMetricPublisher, LambdaEniUsageMetricPublisherProps } from '../src';

let app: App;
let stack: Stack;

let template: Template;
let defaultLambdaEniUsageMetricPublisherProps: LambdaEniUsageMetricPublisherProps;
let lambdaEniUsageMetricPublisher: LambdaEniUsageMetricPublisher;

const publishFrequency2 = 1;

const createLambdaEniUsageMetricPublisher = function (props?: LambdaEniUsageMetricPublisherProps) {
  lambdaEniUsageMetricPublisher = new LambdaEniUsageMetricPublisher(stack, new Namer(['test']), {
    ...defaultLambdaEniUsageMetricPublisherProps,
    ...props,
  });
  template = Template.fromStack(stack);
  // annotations = Annotations.fromStack(stack);
};

describe('LambdaEniUsageMetricPublisher', () => {
  describe('default', () => {
    beforeAll(() => {
      app = new App();
      stack = new Stack(app, 'test');
      defaultLambdaEniUsageMetricPublisherProps = { publishFrequency: publishFrequency2 };
    });
    it('creates resources', () => {
      createLambdaEniUsageMetricPublisher(defaultLambdaEniUsageMetricPublisherProps);
      template.resourceCountIs('AWS::Lambda::Function', 2);
      expect(lambdaEniUsageMetricPublisher.publishFrequency).toEqual(1);
    });
  });
});
