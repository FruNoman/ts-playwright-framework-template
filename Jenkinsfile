// Jenkins job <project>-ui-tests (ONBOARD: the name) — Pipeline from SCM, a read-only deploy key. A thin wrapper over one command:
// `npx playwright test` on the agent's Node (NodeJS tool node-24), browsers in the host's
// playwright run-server (docker-compose.playwright.yml, same version as @playwright/test).
// No secrets: the tests' logins are test data (resources/data).
pipeline {
  agent any
  tools { nodejs 'node-24' }
  options {
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '30'))
    timestamps()
  }
  parameters {
    string(name: 'TEST_ENV', defaultValue: 'dev', description: 'resources/env/<name>.json')
    string(name: 'TESTS_THREADS', defaultValue: '2', description: 'Playwright workers')
    string(name: 'BROWSER_CONNECT_URL', defaultValue: 'ws://host.docker.internal:3000/',
           description: 'playwright run-server on the Docker host')
    string(name: 'GREP', defaultValue: '', description: 'optional: only tests whose title matches')
  }
  environment {
    CI = 'true'
    RUNNER = 'server'
    TEST_ENV = "${params.TEST_ENV}"
    TESTS_THREADS = "${params.TESTS_THREADS}"
    PLAYWRIGHT_SERVER_URL = "${params.BROWSER_CONNECT_URL}"
  }
  stages {
    stage('Install') {
      steps { sh 'node --version && npm ci' }
    }
    stage('Check') {
      steps { sh 'npm run check' }
    }
    stage('Test') {
      steps {
        sh 'npx playwright test ${GREP:+--grep "$GREP"}'
      }
    }
  }
  post {
    always {
      junit testResults: 'build/test-results/junit.xml', allowEmptyResults: true
      publishHTML(target: [reportDir: 'build/reports/html', reportFiles: 'index.html',
                           reportName: 'Playwright report', keepAll: true,
                           alwaysLinkToLastBuild: true, allowMissing: true])
      archiveArtifacts artifacts: 'build/test-results/artifacts/**', allowEmptyArchive: true
    }
  }
}
