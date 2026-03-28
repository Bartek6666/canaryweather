#!/usr/bin/env npx ts-node

/**
 * Loguje sesję Claude Code do Notion
 *
 * Użycie:
 *   npm run notion:session "Co zostało zrobione w tej sesji"
 */

import 'dotenv/config';
import { Client } from '@notionhq/client';
import { execSync } from 'child_process';
import { NOTION_CONFIG, validateConfig } from './config';

validateConfig();

const notion = new Client({ auth: NOTION_CONFIG.apiKey });

async function logSession(summary: string) {
  try {
    // Pobierz ostatnie commity
    let commits = '';
    try {
      commits = execSync('git log --oneline -5 --format="%h %s"', { encoding: 'utf-8' }).trim();
    } catch {
      commits = '(brak commitów)';
    }

    // Pobierz ID projektu Canary Weather
    const projectsResponse = await notion.databases.query({
      database_id: NOTION_CONFIG.databases.projects,
      filter: {
        property: 'Name',
        title: { contains: 'Canary Weather' },
      },
    });

    const projectId = projectsResponse.results[0]?.id;

    // Dzisiejsza data
    const today = new Date().toISOString().split('T')[0];

    const response = await notion.pages.create({
      parent: { database_id: NOTION_CONFIG.databases.sessions },
      properties: {
        Date: {
          title: [{ text: { content: `${today} - Claude Code Session` } }],
        },
        Summary: {
          rich_text: [{ text: { content: summary } }],
        },
        Commits: {
          rich_text: [{ text: { content: commits } }],
        },
        ...(projectId && {
          Project: {
            relation: [{ id: projectId }],
          },
        }),
      },
    });

    console.log('✅ Sesja zapisana!');
    console.log(`   Data: ${today}`);
    console.log(`   Opis: ${summary}`);
    console.log('');
    console.log('   Ostatnie commity:');
    commits.split('\n').forEach(c => console.log(`   - ${c}`));

  } catch (error: any) {
    console.error('❌ Błąd:', error.message);
    process.exit(1);
  }
}

// Parsowanie argumentów
const summary = process.argv.slice(2).join(' ');

if (!summary) {
  console.log('Użycie: npm run notion:session "Opis co zostało zrobione"');
  console.log('');
  console.log('Przykład:');
  console.log('  npm run notion:session "Dodano obsługę offline, naprawiono bug z cache"');
  process.exit(1);
}

logSession(summary);
