// const bot = require('./bot');

async function viewIssues(ctx,octokit) {
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
}

// Track user state for creating an issue
// const issueStates = new Map();

// async function createIssue(ctx,octokit) {
//     const userId = ctx.from.id;

//     issueStates.set(userId, { step: 'title', repository: ctx.message.text.split(' ')[1]});
//     console.log(issueStates);
  
//     ctx.reply('Please enter the issue title:');
// }

// bot.on('text', async (ctx) => {
//     const userId = ctx.from.id;
//     const issueState = issueStates.get(userId);

//     if (!issueState) {
//         return;
//     }

//     switch (issueState.step) {
//         case 'title':
//         issueState.title = ctx.message.text;
//         issueState.step = 'description';
//         ctx.reply('Please enter the issue description:');
//         break;

//         case 'description':
//         issueState.description = ctx.message.text;
//         issueState.step = 'labels';
//         ctx.reply('Please enter the issue labels (comma-separated):');
//         break;

//         case 'labels':
//         issueState.labels = ctx.message.text.split(',').map((label) => label.trim());
//         issueState.step = 'assignees';
//         ctx.reply('Please enter the issue assignees (comma-separated GitHub usernames):');
//         break;

//         case 'assignees':
//         issueState.assignees = ctx.message.text.split(',').map((assignee) => assignee.trim());
//         issueState.step = 'create';
//         ctx.reply('Thank you! Creating the issue...');
//         await createGitHubIssue(userId, issueState);
//         issueStates.delete(userId);
//         break;

//         default:
//         ctx.reply('Invalid input. Please start over by using the /createissue command.');
//         break;
//     }
// });

// async function createGitHubIssue(userId, issueState) {
//     try {
//         const [owner, repo] = issueState.repository.split('/');

//         const { data } = await octokit.request('POST /repos/{owner}/{repo}/issues', {
//             owner,
//             repo,
//             title: issueState.title,
//             body: issueState.description,
//             labels: issueState.labels,
//             assignees: issueState.assignees,
//         });

//         bot.telegram.sendMessage(userId, `Issue created successfully! Issue number: ${data.number}`);
//     } catch (error) {
//         console.error('Error creating issue:', error);
//         bot.telegram.sendMessage(userId, 'Failed to create issue. Please try again.');
//     }
// }

module.exports = {viewIssues};