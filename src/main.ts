import * as core from "@actions/core";
import * as github from "@actions/github";

type ClientType = ReturnType<typeof github.getOctokit>;

function getHeadBranch(): string {
  const pullRequest = github.context.payload.pull_request;

  if (pullRequest) {
    return pullRequest.head.ref;
  }

  throw new Error("github.context.payload.pull_request is empty");
}

function testBranchName(branchName: string, projectKey: string): string | null {
  const match = branchName.match(
    /^\w+\/(?<project>[A-Za-z0-9]+)-(?<issue>\d+)-/
  );

  if (match) {
    const { project, issue } = match.groups ?? {};

    if (project?.toUpperCase() === projectKey && issue) {
      return [project.toUpperCase(), issue].join("-");
    }
  }

  return null;
}

function getPrNumber(): number {
  const pullRequest = github.context.payload.pull_request;

  if (pullRequest) {
    return pullRequest.number;
  }

  throw new Error("github.context.payload.pull_request is empty");
}

async function addIssueLink(issueKey: string): Promise<void> {
  const token = core.getInput("repo-token", { required: true });
  const prNumber = getPrNumber();
  const client: ClientType = github.getOctokit(token);
  const { data: pullRequest } = await client.rest.pulls.get({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: prNumber,
  });

  const body = pullRequest.body ?? "";

  if (body.includes(issueKey)) {
    console.log(`pr #${prNumber} already contains link to ${issueKey}`);
    return;
  }

  console.log(`adding link to ${issueKey} to PR #${prNumber}`);
  const domain = core.getInput("jira-domain", { required: false });
  const issueLink = domain
    ? `[${issueKey}](https://${domain}/browse/${issueKey})`
    : issueKey;

  await client.rest.pulls.update({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: prNumber,
    body: `Jira: ${issueLink}\n\n${body}`,
  });
}

async function run() {
  const projectKeys = core
    .getInput("project-keys", { required: true })
    .split(",")
    .map((key) => key.trim().toUpperCase())
    .filter((key) => !!key);

  if (projectKeys.length === 0) {
    core.setFailed(
      "please provide a comma separated list of project keys to use"
    );
  }

  const branchName = getHeadBranch();

  for (const projectKey of projectKeys) {
    const issue = testBranchName(branchName, projectKey);

    if (issue) {
      console.log(`found issue: ${issue}. project key: ${projectKey}`);

      await addIssueLink(issue);
      return;
    }
  }

  console.log(`no issue key found for project keys ${projectKeys.join(", ")}`);
}

run();
