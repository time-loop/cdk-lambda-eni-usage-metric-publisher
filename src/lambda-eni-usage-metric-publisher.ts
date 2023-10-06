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
   * How long to retain logs published to CloudWatch logs.
   * @default aws_logs.RetentionDays.ONE_WEEK
   */
  readonly cloudwatchLogsRetention?: aws_logs.RetentionDays;
  /**
   * The CloudWatch namespace to publish metrics to.
   * @default 'LambdaHyperplaneEniUsage'
   */
  readonly cwNamespace?: string;
  /**
   * Time intervals that Lambda will be triggered to publish metric in CloudWatch.
   * @default 1
   */
  readonly publishFrequency?: number;
  /**
   * List of AWS regions to publish ENI usage metrics for.
   * @default ['us-east-1']
   */
  readonly regions?: string[];
}

/**
 * A construct that creates an AWS Lambda function to publish ENI usage metrics to CloudWatch.
 */
export class LambdaEniUsageMetricPublisher extends Construct {
  readonly publishFrequency: number;
  readonly regions: string[];
  readonly handler: aws_lambda_nodejs.NodejsFunction;
  readonly rule: aws_events.Rule;
  readonly cwNamespace: string;

  /**
   * Creates a new instance of LambdaEniUsageMetricPublisher.
   * @param scope The parent construct.
   * @param id The ID of the construct.
   * @param props The properties of the construct.
   */

  constructor(scope: Construct, id: Namer, props: LambdaEniUsageMetricPublisherProps) {
    super(scope, id.pascal);
    this.publishFrequency = props.publishFrequency ?? 1;
    this.regions = props.regions ?? ['us-east-1'];
    this.cwNamespace = props.cwNamespace ?? 'LambdaHyperplaneEniUsage';
    const myConstruct = this;

    function eniUsageMetricPublisherHandler(handler: string, cwNamespace: string): aws_lambda_nodejs.NodejsFunction {
      const fn = new aws_lambda_nodejs.NodejsFunction(myConstruct, handler, {
        bundling: {
          externalModules: ['aws-lambda'],
          minify: true,
        },
        handler,
        runtime: aws_lambda.Runtime.NODEJS_18_X,
        logRetention: props.cloudwatchLogsRetention ?? aws_logs.RetentionDays.ONE_WEEK,
        memorySize: 512,
        timeout: Duration.seconds(45),
      });

      [
        new aws_iam.PolicyStatement({
          actions: ['ec2:DescribeNetworkInterfaces', 'ec2:DescribeVpcs'],
          resources: ['*'],
        }),
        new aws_iam.PolicyStatement({
          actions: ['cloudwatch:PutMetricData'],
          resources: ['*'],
          conditions: {
            StringEquals: {
              'cloudwatch:namespace': props.cwNamespace ?? cwNamespace,
            },
          },
        }),
      ].forEach((policy) => fn.addToRolePolicy(policy));

      return fn;
    }

    this.handler = eniUsageMetricPublisherHandler('monitor', this.cwNamespace)
      .addEnvironment('REGION_LIST', props.regions?.join(',') ?? this.regions.join(','))
      .addEnvironment('CW_NAMESPACE', props.cwNamespace ?? this.cwNamespace);
    //Review rule name

    this.rule = new aws_events.Rule(this, 'rule', {
      schedule: aws_events.Schedule.rate(Duration.minutes(this.publishFrequency)),
    });
    this.rule.addTarget(new aws_events_targets.LambdaFunction(this.handler));
  }
}
