require('dotenv').config();
const { Telegraf } = require('telegraf');
const { Octokit } = require('octokit');
const { createOAuthDeviceAuth } = require('@octokit/auth-oauth-device');

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const githubClientId = process.env.CLIENT_ID;
const githubClientSecret = process.env.CLIENT_SECRET;

const bot = new Telegraf(botToken);
let octokit = new Octokit();

// Inital Setup

bot.start((ctx) => {
  const startMessage = `
  Welcome to our GitHub Bot!\
  \nUse /help to know the services provided by the bot.
  `;
  ctx.reply(startMessage);
});

bot.help((ctx) => {
  const helpMessage = `
  Here are the available commands and their functionalities:\
\n\n  /login - Login to your GitHub account\
\n\n  /repoinfo - Get information about a repository\
\n  /listrepos - Get a list of all your repositories\
\n  /commithistory - Get the commit history of a repository\
\n\n  /createissue - Create a GitHub issue\
\n  /viewissue - View a GitHub issue\
\n\n  /addcollaborator - Add a collaborator to a repository\
\n  /getcollaborators - Get the list of collaborators for a repository\
\n  /removecollaborator - Remove a collaborator from a repository\
\n\nPlease use these commands to interact with the bot. Enjoy!
`;

  ctx.reply(helpMessage);
});


// Authentication

bot.command('login', async (ctx) => {
  octokit = new Octokit({
    authStrategy: createOAuthDeviceAuth,
    auth: {
        clientType: 'o-auth-app',
        clientId: process.env.CLIENT_ID,
        scopes: ['repo'],
        onVerification(verification) {
          ctx.reply(`Open ${verification.verification_uri} \n Enter code: ${verification.user_code}`)
        }
    }
    // auth: process.env.GITHUB_TOKEN
  });
  const {data: user} = await octokit.request('GET /user');
  ctx.reply(`Authenticated as ${user.login}`);
});

// Repository Commands

bot.command('repoinfo', async (ctx) => {
  const repository = ctx.message.text.split(' ')[1];

  if (!repository) {
    ctx.reply('Please provide a repository name or URL. Usage: /repoinfo <repository>');
    return;
  }

  try {
    const [owner, repo] = repository.split('/');
    const { data } = await octokit.request('GET /repos/{owner}/{repo}', {
      owner,
      repo
    });

    const starsCount = data.stargazers_count;
    const forksCount = data.forks_count;
    const openIssuesCount = data.open_issues_count;
    const contributorsCount = await getContributorsCount(data.contributors_url);

    const message = `\
    Repository: ${data.full_name}\
    Stars: ${starsCount}\
    Forks: ${forksCount}\
    Open Issues: ${openIssuesCount}\
    Contributors: ${contributorsCount}\
    `;

    ctx.reply(message);
  } catch (error) {
    console.error('Error fetching repository information:', error);
    ctx.reply('Failed to fetch repository information. Please try again.');
  }
});

bot.command('listrepo', async (ctx) => {
  try {

    const response = await octokit.rest.repos.listForAuthenticatedUser({visibility: 'all'});
    const repositories = response.data;

    let res = "", idx = 1;
    repositories.forEach((repo) => {
        res = res.concat(`${idx}: ${repo.name} \n`);
        idx++;
    });

    if (res.length == 0) res = "No repository exist!"
    ctx.reply(res);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    ctx.reply('Error occured');
  }
});

bot.command('commithistory', async (ctx) => {
  const repository = ctx.message.text.split(' ')[1];

  if (!repository) {
    ctx.reply('Please provide a repository name. Usage: /commithistory <repository>');
    return;
  }

  try {
    const [owner, repo] = repository.split('/');

    const response = await octokit.request('GET /repos/{owner}/{repo}/commits', {
      owner,
      repo,
    });

    const commits = response.data.map((commit) => {
      const author = commit.commit.author.name;
      const message = commit.commit.message;
      const timestamp = commit.commit.author.date;

      return `Author: ${author}\nMessage: ${message}\nTimestamp: ${timestamp}\n---\n`;
    });

    const message = commits.length > 0 ? commits.join('\n') : 'No commit history found.';

    ctx.reply(`Commit history for ${repository}:\n\n${message}`);
  } catch (error) {
    console.error('Error fetching commit history:', error);
    ctx.reply('Failed to fetch commit history. Please try again.');
  }
});

// Issue Commands

// Track user state for creating an issue
const issueStates = new Map();

bot.command('createissue', async (ctx) => {
  const userId = ctx.from.id;

  issueStates.set(userId, { step: 'title', repository: ctx.message.text.split(' ')[1]});
  console.log(issueStates);

  ctx.reply('Please enter the issue title:');
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const issueState = issueStates.get(userId);

  if (!issueState) {
    return;
  }

  switch (issueState.step) {
    case 'title':
      issueState.title = ctx.message.text;
      issueState.step = 'description';
      ctx.reply('Please enter the issue description:');
      break;

    case 'description':
      issueState.description = ctx.message.text;
      issueState.step = 'labels';
      ctx.reply('Please enter the issue labels (comma-separated):');
      break;

    case 'labels':
      issueState.labels = ctx.message.text.split(',').map((label) => label.trim());
      issueState.step = 'assignees';
      ctx.reply('Please enter the issue assignees (comma-separated GitHub usernames):');
      break;

    case 'assignees':
      issueState.assignees = ctx.message.text.split(',').map((assignee) => assignee.trim());
      issueState.step = 'create';
      ctx.reply('Thank you! Creating the issue...');
      await createGitHubIssue(userId, issueState);
      issueStates.delete(userId);
      break;

    default:
      ctx.reply('Invalid input. Please start over by using the /createissue command.');
      break;
  }
});

async function createGitHubIssue(userId, issueState) {
  try {
    const [owner, repo] = issueState.repository.split('/');

    const { data } = await octokit.request('POST /repos/{owner}/{repo}/issues', {
      owner,
      repo,
      title: issueState.title,
      body: issueState.description,
      labels: issueState.labels,
      assignees: issueState.assignees,
    });

    bot.telegram.sendMessage(userId, `Issue created successfully! Issue number: ${data.number}`);
  } catch (error) {
    console.error('Error creating issue:', error);
    bot.telegram.sendMessage(userId, 'Failed to create issue. Please try again.');
  }
}

// Helper function to get contributors count
async function getContributorsCount(contributorsUrl) {
  try {
    const { data } = await octokit.request('GET ' + contributorsUrl);
    return data.length;
  } catch (error) {
    console.error('Error fetching contributors count:', error);
    return 'Unknown';
  }
}

// View issues of a repository
bot.command('viewissues', async (ctx) => {
  const repository = ctx.message.text.split(' ')[1];

  if (!repository) {
    ctx.reply('Please provide a repository name or URL. Usage: /viewissues <repository>');
    return;
  }

  try {
    const [ owner, repo ] = repository.split('/');

    const { data } = await octokit.request('GET /repos/{owner}/{repo}/issues', {
      owner,
      repo,
    });

    if (data.length === 0) {
      ctx.reply('No issues found for the repository.');
      return;
    }

    const issues = data.map((issue) => {
      const issueTitle = issue.title;
      const issueUrl = issue.html_url;
      const issueNumber = issue.number;

      return `Issue #${issueNumber}: [${issueTitle}](${issueUrl})`;
    });

    const message = issues.join('\n');
    ctx.reply(`Issues for repository ${repository}:\n\n${message}`);
  } catch (error) {
    console.error('Error fetching issues:', error);
    ctx.reply('Failed to fetch issues. Please try again.');
  }
});

// Collaborator Commands

bot.command('addcollaborator', async (ctx) => {
  const [repository, collaborator, permission] = ctx.message.text.split(' ').slice(1);

  if (!repository || !collaborator || !permission) {
    ctx.reply(
      'Please provide repository, collaborator, and permission. Usage: /addcollaborator <repository> <collaborator> <permission>'
    );
    return;
  }

  try {
    const [owner, repo] = repository.split('/');

    await octokit.request('PUT /repos/{owner}/{repo}/collaborators/{username}', {
      owner,
      repo,
      username: collaborator,
      permission,
    });

    ctx.reply(`${collaborator} has been added as a collaborator to ${repository} with ${permission} permission.`);
  } catch (error) {
    console.error('Error adding collaborator:', error);
    ctx.reply('Failed to add collaborator. Please try again.');
  }
});

bot.command('removecollaborator', async (ctx) => {
  const [repository, collaborator] = ctx.message.text.split(' ').slice(1);

  if (!repository || !collaborator) {
    ctx.reply('Please provide repository and collaborator. Usage: /removecollaborator <repository> <collaborator>');
    return;
  }

  try {
    const [owner, repo] = repository.split('/');

    await octokit.request('DELETE /repos/{owner}/{repo}/collaborators/{username}', {
      owner,
      repo,
      username: collaborator,
    });

    ctx.reply(`${collaborator} has been removed as a collaborator from ${repository}.`);
  } catch (error) {
    console.error('Error removing collaborator:', error);
    ctx.reply('Failed to remove collaborator. Please try again.');
  }
});

bot.command('getcollaborators', async (ctx) => {
  const repository = ctx.message.text.split(' ')[1];

  if (!repository) {
    ctx.reply('Please provide a repository name. Usage: /getcollaborators <repository>');
    return;
  }

  try {
    const [owner, repo] = repository.split('/');

    const { data } = await octokit.request('GET /repos/{owner}/{repo}/collaborators', {
      owner,
      repo,
    });

    const collaborators = data.map((collaborator) => collaborator.login);
    const message = `Collaborators for repository ${repository}:\n\n${collaborators.join('\n')}`;

    ctx.reply(message);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    ctx.reply('Failed to fetch collaborators. Please try again.');
  }
});

bot.launch();