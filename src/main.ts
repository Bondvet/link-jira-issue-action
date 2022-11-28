import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
    const projectKeys = core.getInput('project-keys').split(',')
        .map(key => key.trim().toUpperCase())
        .filter(key => !!key);

    if (projectKeys.length === 0) {
        core.setFailed('please provide a comma separated list of project keys to use')
    }

    const payload = JSON.stringify(github.context.payload, undefined, 2);
    console.log(`the event payload: ${payload}`);

    console.log(`project key: ${JSON.stringify(projectKeys, undefined, 2)}`)
}

run();
