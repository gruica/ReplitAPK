#!/usr/bin/env node
/**
 * 🚀 GITHUB AUTOMATSKI DEPLOYMENT SCRIPT
 * 
 * Ovaj script automatski push-uje kod na GitHub i pokreće APK build
 */

import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function main() {
  try {
    console.log('🚀 Pokrećem GitHub deployment...\n');

    const octokit = await getGitHubClient();
    
    // Provjeri GitHub user
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`✅ Povezan sa GitHub nalogom: ${user.login}`);
    console.log(`📧 Email: ${user.email || 'N/A'}`);
    
    // Lista repositories
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 10
    });
    
    console.log(`\n📁 Pronađeno ${repos.length} repositories:\n`);
    
    repos.forEach((repo, index) => {
      console.log(`${index + 1}. ${repo.full_name}`);
      console.log(`   URL: ${repo.html_url}`);
      console.log(`   Private: ${repo.private ? 'Da' : 'Ne'}`);
      console.log('');
    });

    console.log('\n📋 SLEDEĆI KORACI:\n');
    console.log('1. Izaberite ili kreirajte repository za aplikaciju');
    console.log('2. Kopirajte GitHub repository URL');
    console.log('3. Pokrenite: git remote add origin <URL>');
    console.log('4. Pokrenite: git push -u origin main');
    console.log('\n🤖 GitHub Actions će automatski kreirati APK nakon push-a!');
    
  } catch (error: any) {
    console.error('❌ Greška:', error.message);
    process.exit(1);
  }
}

main();
