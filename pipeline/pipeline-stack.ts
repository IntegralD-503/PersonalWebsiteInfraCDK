import { SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { PipelineProject, LinuxBuildImage, BuildSpec } from "aws-cdk-lib/aws-codebuild";
import { Artifact, IStage, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, GitHubSourceAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { Construct } from "constructs";
import { PorkchopExpressInfraCdkStack } from "../lib/porkchop_express_infra_cdk-stack";

export class PipelineStack extends Stack {
    private readonly pipeline: Pipeline;
    private readonly cdkBuildOutput: Artifact;
    private readonly porkchopExpressSourceOutput: Artifact;
    private readonly porkchopExpressBuildOutput: Artifact;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);


        this.pipeline = new Pipeline(this, 'PorkchopExpressPipeline', {
            pipelineName: 'PorkchopExpressPipeline',
            crossAccountKeys: false,
            restartExecutionOnUpdate: true
          });
      
          const cdkSourceOutput = new Artifact('PorkchopExpressInfraCDKOutput');
          this.porkchopExpressSourceOutput = new Artifact('PorkchopExpressSourceOutput');
      
          this.pipeline.addStage({
            stageName:'Source',
            actions:[
              new GitHubSourceAction({
                owner: 'IntegralD-503',
                repo: 'PorkchopExpressInfraCDK',
                branch: 'main',
                actionName: 'PorkchopExpressPipeline_Source',
                oauthToken: SecretValue.secretsManager('github-token'),
                output: cdkSourceOutput
              }),
              new GitHubSourceAction({
                owner: 'IntegralD-503',
                repo: 'PorkchopExpressWebsite',
                branch: 'main',
                actionName: 'PorkchopExpress_Source',
                oauthToken: SecretValue.secretsManager('github-token'),
                output: this.porkchopExpressSourceOutput
              })
            ]
          });

          this.cdkBuildOutput = new Artifact("CdkBuildOutput");
          this.porkchopExpressBuildOutput = new Artifact("PorkchopExpressBuildOutput");
      
          this.pipeline.addStage({
            stageName: 'Build',
            actions: [
              new CodeBuildAction({
                actionName: 'CDK_Build',
                input: cdkSourceOutput,
                outputs: [ this.cdkBuildOutput ],
                project: new PipelineProject(this, 'CdkBuildProject', {
                  environment: {
                    buildImage: LinuxBuildImage.AMAZON_LINUX_2_4
                  },
                  buildSpec: BuildSpec.fromSourceFilename('build-specs/cdk-build-spec.yml')
                })
              }),
              new CodeBuildAction({
                actionName: 'PorkchopExpress_Build',
                input: this.porkchopExpressSourceOutput,
                outputs: [ this.porkchopExpressBuildOutput ],
                project: new PipelineProject(this, 'PorkchopExpressBuildProject', {
                  environment: {
                    buildImage: LinuxBuildImage.AMAZON_LINUX_2_4
                  },
                  buildSpec: BuildSpec.fromSourceFilename('build-specs/porkchop-express-build-spec.yml')
                })
              })
            ]
          });

          this.pipeline.addStage({
            stageName: 'Pipeline_Update',
            actions: [
              new CloudFormationCreateUpdateStackAction({
                actionName: 'PorkchopExpressPipeline_Update',
                stackName: 'PorkchopExpressPipelineStack',
                templatePath: this.cdkBuildOutput.atPath('PorkchopExpressPipelineStack.template.json'),
                adminPermissions: true,
              })
            ]
          });
    }
}