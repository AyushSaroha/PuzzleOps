pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    parameters {
        booleanParam(
            name: 'PROVISION_INFRASTRUCTURE',
            defaultValue: false,
            description: 'Create or update the CloudFormation stack before deploying.'
        )
        string(
            name: 'AWS_REGION',
            defaultValue: 'ap-south-1',
            description: 'AWS region for the PuzzleOps CloudFormation stack.'
        )
        string(
            name: 'STACK_NAME',
            defaultValue: 'puzzleops-stack',
            description: 'CloudFormation stack name.'
        )
        string(
            name: 'EC2_KEY_NAME',
            defaultValue: 'puzzleops-key',
            description: 'Existing EC2 key-pair name, not the local .pem file path.'
        )
        string(
            name: 'JENKINS_SSH_CIDR',
            defaultValue: '',
            description: 'Public Jenkins-server IP in CIDR form, for example 203.0.113.10/32.'
        )
        string(
            name: 'NOTIFICATION_EMAIL',
            defaultValue: '',
            description: 'Optional email address for CloudWatch alarms. You must confirm the SNS email.'
        )
        string(
            name: 'AWS_CREDENTIALS_ID',
            defaultValue: 'aws-puzzleops',
            description: 'Jenkins Username/Password credential: AWS access key ID / secret access key.'
        )
        string(
            name: 'EC2_SSH_CREDENTIAL_ID',
            defaultValue: 'puzzleops-ec2-key',
            description: 'Jenkins SSH Username with private key credential for ec2-user.'
        )
    }

    triggers {
        githubPush()
    }

    environment {
        DEPLOY_HOST = ''
        EC2_USER = 'ec2-user'
        REMOTE_DIR = '/usr/share/nginx/html'
    }

    stages {
        stage('Validate source') {
            steps {
                sh '''
                    set -eu
                    test -f src/index.html
                    test -f src/style.css
                    test -f src/script.js
                    test -f infra/template.yaml
                    test -f scripts/deploy.sh
                    npm ci
                    npm run lint
                    npm test
                '''
            }
        }

        stage('Provision EC2 and CloudWatch') {
            when {
                expression { return params.PROVISION_INFRASTRUCTURE }
            }
            steps {
                script {
                    if (!params.JENKINS_SSH_CIDR?.trim()) {
                        error('JENKINS_SSH_CIDR is required when provisioning infrastructure.')
                    }
                }
                withCredentials([usernamePassword(
                    credentialsId: params.AWS_CREDENTIALS_ID,
                    usernameVariable: 'AWS_ACCESS_KEY_ID',
                    passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                )]) {
                    sh '''
                        set -eu
                        bash scripts/deploy.sh \
                            --stack-name "$STACK_NAME" \
                            --region "$AWS_REGION" \
                            --key-name "$EC2_KEY_NAME" \
                            --ssh-cidr "$JENKINS_SSH_CIDR" \
                            --notification-email "$NOTIFICATION_EMAIL" >/dev/null
                    '''
                }
            }
        }

        stage('Resolve deployment host') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: params.AWS_CREDENTIALS_ID,
                    usernameVariable: 'AWS_ACCESS_KEY_ID',
                    passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                )]) {
                    script {
                        env.DEPLOY_HOST = sh(
                            script: '''
                                aws cloudformation describe-stacks \
                                    --region "$AWS_REGION" \
                                    --stack-name "$STACK_NAME" \
                                    --query "Stacks[0].Outputs[?OutputKey=='WebsiteIP'].OutputValue" \
                                    --output text \
                                    --no-cli-pager
                            ''',
                            returnStdout: true
                        ).trim()
                    }
                }
                script {
                    if (!env.DEPLOY_HOST || env.DEPLOY_HOST == 'None') {
                        error('CloudFormation did not return a WebsiteIP. Run once with PROVISION_INFRASTRUCTURE enabled.')
                    }
                }
            }
        }

        stage('Wait for Nginx') {
            steps {
                sshagent(credentials: [params.EC2_SSH_CREDENTIAL_ID]) {
                    sh '''
                        set -eu
                        for attempt in $(seq 1 48); do
                            if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new \
                                "$EC2_USER@$DEPLOY_HOST" 'sudo systemctl is-active --quiet nginx'; then
                                exit 0
                            fi
                            echo "Waiting for Nginx on EC2 (attempt $attempt/48)..."
                            sleep 10
                        done
                        echo 'Nginx did not become ready in time.' >&2
                        exit 1
                    '''
                }
            }
        }

        stage('Deploy website') {
            steps {
                sshagent(credentials: [params.EC2_SSH_CREDENTIAL_ID]) {
                    sh '''
                        set -eu
                        ssh -o StrictHostKeyChecking=accept-new \
                            "$EC2_USER@$DEPLOY_HOST" 'rm -rf /tmp/puzzleops && mkdir -p /tmp/puzzleops'
                        scp -o StrictHostKeyChecking=accept-new -r src/. \
                            "$EC2_USER@$DEPLOY_HOST:/tmp/puzzleops/"
                        ssh -o StrictHostKeyChecking=accept-new \
                            "$EC2_USER@$DEPLOY_HOST" \
                            "sudo find '$REMOTE_DIR' -mindepth 1 -maxdepth 1 -exec rm -rf {} + && \
                             sudo cp -a /tmp/puzzleops/. '$REMOTE_DIR/' && \
                             sudo chown -R root:root '$REMOTE_DIR' && \
                             sudo nginx -t && \
                             sudo systemctl reload nginx"
                    '''
                }
            }
        }

        stage('Verify deployment') {
            steps {
                sh '''
                    set -eu
                    curl --fail --silent --show-error --retry 12 --retry-delay 5 \
                        --output /dev/null "http://$DEPLOY_HOST/"
                    echo "PuzzleOps deployed successfully: http://$DEPLOY_HOST/"
                '''
            }
        }
    }

    post {
        success {
            echo 'PuzzleOps Jenkins → EC2 deployment completed.'
        }
        failure {
            echo 'Pipeline failed. Review the Jenkins Console Output.'
        }
    }
}
