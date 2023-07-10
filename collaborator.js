async function getCollaborators(ctx,octokit) {
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
}

async function addCollaborator(ctx,octokit) {
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
}

async function removeCollaborator(ctx,octokit) {
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
}

module.exports = {getCollaborators,addCollaborator,removeCollaborator};