# PuzzleOps: Jenkins, EC2, and CloudWatch

This project deploys the static PuzzleOps website from GitHub to Nginx on one Amazon Linux 2023 EC2 instance. Jenkins provisions the AWS stack when requested, deploys the files in `src/`, and checks the public website. CloudWatch collects Nginx logs, memory, and disk metrics and creates CPU, memory, and disk alarms.

It deliberately has no SonarQube, Trivy, Docker, or Docker Hub step.

## Architecture

```text
GitHub push → Jenkins → EC2 (Nginx serves src/) → public website
                    └→ CloudFormation creates EC2, IAM, logs, SNS, alarms
EC2 → CloudWatch Logs (/puzzleops/nginx) and PuzzleOps metrics
```

## Repository files

- `Jenkinsfile` — validates, optionally provisions AWS, deploys to Nginx, and verifies the site.
- `infra/template.yaml` — CloudFormation for the VPC, EC2, Elastic IP, Nginx, CloudWatch Agent, log group, SNS topic, and alarms.
- `scripts/deploy.sh` — creates or updates the CloudFormation stack and returns the website IP.
- `src/` — files copied to `/usr/share/nginx/html` on EC2.

## One-time AWS preparation

1. Select your AWS region, for example `ap-south-1` (Mumbai).
2. In EC2, create a key pair named `puzzleops-key`. Download its `.pem` file and keep it private. It is already ignored by Git.
3. Install Jenkins on a separate Linux server or use an existing Linux Jenkins agent. It needs `git`, Node.js, npm, OpenSSH client, curl, Bash, and AWS CLI v2.
4. Give the Jenkins AWS identity permission to create the resources in `infra/template.yaml`. For a learning project, `AdministratorAccess` works; for real use, create a least-privilege CloudFormation deployment policy.

## Configure Jenkins credentials

In **Manage Jenkins → Credentials → System → Global credentials**, add:

1. A **Username with password** credential with ID `aws-puzzleops`:
   - Username: AWS access key ID
   - Password: AWS secret access key
2. An **SSH Username with private key** credential with ID `puzzleops-ec2-key`:
   - Username: `ec2-user`
   - Private key: the contents of the `puzzleops-key.pem` file

Install the Git, GitHub, Pipeline, SSH Agent, and Credentials Binding plugins. Do not install SonarQube Scanner or Trivy for this pipeline.

## Create the Jenkins job

1. Create a **Pipeline** job named `PuzzleOps-CI-CD`.
2. Set **Definition** to **Pipeline script from SCM**, choose Git, enter this repository URL, use branch `*/main`, and set script path to `Jenkinsfile`.
3. Click **Build with Parameters** for the first build.
4. Set `PROVISION_INFRASTRUCTURE` to `true`.
5. Set `JENKINS_SSH_CIDR` to the public IP of the Jenkins server with `/32`, such as `203.0.113.10/32`. This is the only address allowed to SSH into the web server.
6. Check that `EC2_KEY_NAME` matches the AWS key pair. Optionally set `NOTIFICATION_EMAIL`, then confirm the AWS SNS confirmation email.
7. Run the build. It creates/updates the stack, waits for Nginx, deploys the website, and prints its public URL.

For later GitHub-triggered builds, leave `PROVISION_INFRASTRUCTURE` as `false`. Jenkins reads the Elastic IP from the existing CloudFormation stack and only deploys the website.

## Enable automatic GitHub builds

In the GitHub repository, create a webhook:

```text
http://YOUR_JENKINS_PUBLIC_IP:8080/github-webhook/
```

Select `application/json` and **Just the push event**. Jenkins must be reachable from GitHub. Use HTTPS and restrict access to Jenkins before exposing it outside a lab environment.

## Manual infrastructure command

Run this from a Linux Jenkins agent, AWS CloudShell, WSL, or Git Bash after configuring AWS credentials:

```bash
bash scripts/deploy.sh \
  --stack-name puzzleops-stack \
  --region ap-south-1 \
  --key-name puzzleops-key \
  --ssh-cidr YOUR_JENKINS_PUBLIC_IP/32 \
  --notification-email you@example.com
```

The command outputs the Elastic IP only after CloudFormation finishes. Do not set the SSH CIDR to `0.0.0.0/0`.

## Verify in AWS

- Open the URL printed by Jenkins; the puzzle should load.
- In CloudWatch Logs, open `/puzzleops/nginx` to see `access` and `error` logs.
- In CloudWatch Metrics, open the `PuzzleOps` namespace for `mem_used_percent` and `disk_used_percent`.
- In CloudWatch Alarms, check the CPU, memory, and disk alarms. SNS email notifications work only after confirmation.

## Local validation

```bash
npm ci
npm run lint
npm test
```

## Important cost and security notes

The CloudFormation stack creates a running EC2 instance, Elastic IP, log storage, and alarms that can incur AWS charges. Delete the stack when your work is finished:

```bash
aws cloudformation delete-stack --stack-name puzzleops-stack --region ap-south-1
aws cloudformation wait stack-delete-complete --stack-name puzzleops-stack --region ap-south-1
```

Do not commit the `.pem` private key, AWS access keys, or Jenkins credentials.
