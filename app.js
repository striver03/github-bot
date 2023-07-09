require('dotenv').config();
const {Octokit} = require('octokit');
const {createOAuthDeviceAuth} = require('@octokit/auth-oauth-device');

const octokit = new Octokit({
    authStrategy: createOAuthDeviceAuth,
    auth: {
        clientType: 'o-auth-app',
        clientId: process.env.CLIENT_ID,
        scopes: ['repo'],
        onVerification(verification) {
            console.log('Open %s', verification.verification_uri);
            console.log('Enter code %s', verification.user_code);
        }
    }
});

async function getAllRepos() {
    try {
        const response = await octokit.rest.repos.listForAuthenticatedUser({
            visibility: 'all',
        });

        const repositories = response.data;

        repositories.forEach((repo) => {
            console.log(repo.name);
        });

        return repositories;
    } catch (error) {
        console.error('Error fetching repositories:', error);
        throw new Error('Failed to fetch repositories.');
    }
}

async function getRepoOfUser() {
    try {
        const response = await octokit.rest.repos.listForUser({username: 'striver03'});
        const repositories = response.data;
        repositories.forEach((repo) => {
            console.log(repo.name);
        });
    } catch (error) {
        console.error('Error fetching repositories:', error);
        throw new Error('Failed to fetch repositories.');
    }
}

async function fetchRepositoryInfo(owner,repo) {
    try {
        const octokit = new Octokit();
        // Fetch repository information using the GitHub API
        const response = await octokit.request('GET /repos/{owner}/{repo}', {
            owner: 'striver03',
            repo: '2043_game',
            headers: {
            'X-GitHub-Api-Version': '2022-11-28'
            },
        }
    );
      const info = response.data;
      console.log(info);
      return info;
    } catch (error) {
      console.error('Error fetching repository information:', error);
      throw new Error('Failed to fetch repository information.');
    }
  }


async function run() {
    const {data: user} = await octokit.request('GET /user');
    console.log(`Authenticated as ${user.login}`);
    // getAllRepos();
    // getRepoOfUser();
    fetchRepositoryInfo(user.login.toString,'2043_game');
}
run();