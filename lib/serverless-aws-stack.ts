import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class ServerlessAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fn = new lambda.Function(this, "RestifiedEndpointDev", {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: "lambda.handler",
      code: lambda.Code.fromAsset("dist"),
    });

    const endpoint = new apigw.LambdaRestApi(this, "ApiGwEndpoint", {
      handler: fn,
      restApiName: `RestifiedEndpointDev`,
    });
  }
}
