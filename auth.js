const { Octokit } = require('octokit');
const { createOAuthDeviceAuth } = require('@octokit/auth-oauth-device');

async function login(ctx) {
      const octokit = new Octokit({
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
      return octokit;
}

module.exports = {login};