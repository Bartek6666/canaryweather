#!/usr/bin/env node

/**
 * Loguje sesję Claude Code do Notion
 *
 * Użycie:
 *   npm run notion:session "Co zostało zrobione w tej sesji"
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');
const { execSync } = require('child_process');

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const SESSIONS_DB = '32fcf25df26a80d8a107e2e28af0cb99';
const PROJECTS_DB = '32fcf25df26a804cbd70eaf4ae572483';

if (!NOTION_API_KEY) {
  console.error('❌ Brak klucza API Notion!');
  console.error('Dodaj do pliku .env:');
  console.error('NOTION_API_KEY=secret_twoj_klucz_tutaj');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

async function logSession(summary) {
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
      database_id: PROJECTS_DB,
      filter: {
        property: 'Name',
        title: { contains: 'Canary Weather' },
      },
    });

    const projectId = projectsResponse.results[0]?.id;

    // Dzisiejsza data
    const today = new Date().toISOString().split('T')[0];

    const properties = {
      Date: {
        title: [{ text: { content: `${today} - Claude Code Session` } }],
      },
      Summary: {
        rich_text: [{ text: { content: summary } }],
      },
      Commits: {
        rich_text: [{ text: { content: commits } }],
      },
    };

    // Relację do projektu możesz dodać ręcznie w Notion

    await notion.pages.create({
      parent: { database_id: SESSIONS_DB },
      properties: properties,
    });

    console.log('✅ Sesja zapisana!');
    console.log(`   Data: ${today}`);
    console.log(`   Opis: ${summary}`);
    console.log('');
    console.log('   Ostatnie commity:');
    commits.split('\n').forEach(c => console.log(`   - ${c}`));

  } catch (error) {
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
