require('dotenv').config();

const { Telegraf } = require('telegraf');
const { Octokit } = require('octokit');

const {login} = require('./auth');
const {getRepoInfo,getListOfRepos,getCommitHistory} = require('./repo');
const {getCollaborators,addCollaborator,removeCollaborator} = require('./collaborator');
const { viewIssues} = require('./issues');

const botToken = process.env.TELEGRAM_BOT_TOKEN;

const bot = new Telegraf(botToken);
var octokit = new Octokit();

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
\n  /viewissues - View a GitHub issue\
\n\n  /addcollaborator - Add a collaborator to a repository\
\n  /getcollaborators - Get the list of collaborators for a repository\
\n  /removecollaborator - Remove a collaborator from a repository\
\n\nPlease use these commands to interact with the bot. Enjoy!
`;

  ctx.reply(helpMessage);
});


// Authentication
bot.command('login', async (ctx) => {
  octokit = await login(ctx);
});

// Repository Commands
bot.command('repoinfo', async (ctx) => await getRepoInfo(ctx,octokit));
bot.command('listrepos', async (ctx) => await getListOfRepos(ctx,octokit));
bot.command('commithistory', async (ctx) => await getCommitHistory(ctx,octokit));

// Collaborator Commands
bot.command('getcollaborators', async (ctx) => await getCollaborators(ctx,octokit));
bot.command('removecollaborator', async (ctx) => await removeCollaborator(ctx,octokit));
bot.command('addcollaborator', async (ctx) => await addCollaborator(ctx,octokit));

// Issue Commands
bot.command('viewissues', async (ctx) => await viewIssues(ctx,octokit));
// bot.command('createissue', async (ctx) => await createIssue(ctx,octokit));

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

bot.launch();

module.exports = bot;