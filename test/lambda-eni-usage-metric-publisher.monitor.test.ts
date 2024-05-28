import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { DescribeNetworkInterfacesCommand, DescribeVpcsCommand, EC2Client } from '@aws-sdk/client-ec2';

import { mockClient } from 'aws-sdk-client-mock';
import { monitor } from '../src/lambda-eni-usage-metric-publisher.monitor';

const cwMock = mockClient(CloudWatchClient);
const ec2Mock = mockClient(EC2Client);

beforeEach(() => {
  process.env.REGION_LIST = 'us-east-1';
  process.env.CW_NAMESPACE = 'test-namespace';
  cwMock.reset();
  ec2Mock.reset();

  cwMock.on(PutMetricDataCommand).resolves({});
  ec2Mock.on(DescribeVpcsCommand).resolves({ Vpcs: [{ VpcId: 'vpc-123' }] });
  ec2Mock
    .on(DescribeNetworkInterfacesCommand)
    .resolves({ NetworkInterfaces: [{ VpcId: 'vpc-123' }, { VpcId: 'vpc-123' }] });
});

// Silence log output
(['log', 'error'] as jest.FunctionPropertyNames<Required<Console>>[]).forEach((func) =>
  jest.spyOn(console, func).mockImplementation(() => {}),
);

describe('monitor', () => {
  it('should publish metric data to CloudWatch', async () => {
    const result = await monitor();
    expect(result).toEqual([{ region: 'us-east-1', vpcId: 'vpc-123', count: 2 }]);
  });

  it('should throw an error if REGION_LIST environment variable is not set', async () => {
    delete process.env.REGION_LIST;
    process.env.CW_NAMESPACE = 'test-namespace';

    await expect(monitor()).rejects.toThrow('REGION_LIST environment variable not set');
  });

  it('should throw an error if CW_NAMESPACE environment variable is not set', async () => {
    process.env.REGION_LIST = 'us-east-1';
    delete process.env.CW_NAMESPACE;

    await expect(monitor()).rejects.toThrow('CW_NAMESPACE environment variable not set');
  });

  it('should log "No results to publish" if there are no results', async () => {
    ec2Mock.reset();
    ec2Mock.on(DescribeVpcsCommand).resolves({ Vpcs: [{ VpcId: 'vpc-123' }] });
    ec2Mock.on(DescribeNetworkInterfacesCommand).resolves({ NetworkInterfaces: [] });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const result = await monitor();

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('No results to publish');

    consoleSpy.mockRestore();
  });

  it('should throw an error if there is an error publishing metric data', async () => {
    cwMock.reset();
    cwMock.on(PutMetricDataCommand).callsFake(() =>
      Promise.reject({
        code: '1',
        message: 'Intentional mock failure',
        time: new Date(),
        name: 'MockECSAWSError',
      }),
    );

    await expect(monitor()).rejects.toBeDefined();
  });
});
