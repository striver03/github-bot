async function getRepoInfo(ctx,octokit) {
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
      const contributorsCount = await getContributorsCount(data.contributors_url,octokit);
  
      const message = `\
      Repository: ${data.full_name}\
      \nStars: ${starsCount}\
      \nForks: ${forksCount}\
      \nOpen Issues: ${openIssuesCount}\
      \nContributors: ${contributorsCount}\
      `;
  
      ctx.reply(message);
    } catch (error) {
      console.error('Error fetching repository information:', error);
      ctx.reply('Failed to fetch repository information. Please try again.');
    }
}

// Helper function to get contributors count
async function getContributorsCount(contributorsUrl,octokit) {
  try {
    const { data } = await octokit.request('GET ' + contributorsUrl);
    return data.length;
  } catch (error) {
    console.error('Error fetching contributors count:', error);
    return 'Unknown';
  }
}

async function getListOfRepos(ctx,octokit) {
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
}

async function getCommitHistory(ctx,octokit) {
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
}

module.exports = {getRepoInfo,getListOfRepos,getCommitHistory};