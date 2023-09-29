import { join } from 'path';
import {
  aws_iam,
  aws_lambda,
  aws_lambda_nodejs,
  aws_events,
  aws_events_targets,
  aws_logs,
  Duration,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Namer } from 'multi-convention-namer';

export interface LambdaEniUsageMetricPublisherProps {
  /**
   * Time intervals that Lambda will be triggered to publish metric in CloudWatch.
   * @default 1
   */
  readonly publishFrequency?: number;
}

/**
 * LambdaEniUsageMetricPublisher is a construct that creates a Lambda function that publishes ENI usage metric to CloudWatch.
 * The Lambda function is triggered by an EventBridge rule according to the publishFrequency prop.
 * @constructor
 * @param {Construct} scope - the parent Construct instantiating this construct.
 * @param {Namer} id - the unique identifier for this construct.
 * @param {LambdaEniUsageMetricPublisherProps} props - the properties for this construct.
 * @param {number} [props.publishFrequency=1] - the time intervals that Lambda will be triggered to publish metric in CloudWatch.
 */
export class LambdaEniUsageMetricPublisher extends Construct {
  readonly publishFrequency?: number;
  readonly handler: aws_lambda_nodejs.NodejsFunction;
  readonly rule: aws_events.Rule;

  constructor(scope: Construct, id: Namer, props: LambdaEniUsageMetricPublisherProps) {
    super(scope, id.pascal);

    // CDK code that creates the Lambda function, the EventBridge rul that triggers this according the publishFrequency prop. The lambda function will publish the metric to CloudWatch.
    const myConstruct = this;
    this.publishFrequency = props.publishFrequency;
    function eniUsageMetricPublisherHandler(handler: string): aws_lambda_nodejs.NodejsFunction {
      const fn = new aws_lambda_nodejs.NodejsFunction(myConstruct, `EniUsageMetricPublisher${handler}`, {
        bundling: {
          externalModules: ['aws-lambda'], // Lambda is just types
          minify: true,
        },
        entry: join(__dirname, 'lambda.eni-usage-metric-publisher.ts'),
        handler,
        runtime: aws_lambda.Runtime.NODEJS_14_X,
        logRetention: aws_logs.RetentionDays.ONE_WEEK,
        memorySize: 512,
        tracing: aws_lambda.Tracing.ACTIVE,
      });

      [
        new aws_iam.PolicyStatement({
          actions: ['ec2:DescribeNetworkInterfaces'],
          resources: ['*'],
        }),
        new aws_iam.PolicyStatement({
          actions: ['cloudwatch:PutMetricData'],
          resources: ['*'],
        }),
      ].forEach((policy) => fn.addToRolePolicy(policy));

      return fn;
    }
    this.handler = eniUsageMetricPublisherHandler('handler');
    this.rule = new aws_events.Rule(this, 'Rule', {
      schedule: aws_events.Schedule.rate(Duration.minutes(this.publishFrequency ?? 1)),
    });

    this.rule.addTarget(new aws_events_targets.LambdaFunction(this.handler));
  }
}
