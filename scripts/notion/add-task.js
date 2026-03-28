#!/usr/bin/env node

/**
 * Dodaje nowe zadanie do Notion
 *
 * Użycie:
 *   npm run notion:task "Nazwa zadania"
 *   npm run notion:task "Nazwa zadania" -- --priority=High --type=Bug
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TASKS_DB = '32fcf25df26a80b2ad49cda8589feeb3';
const PROJECTS_DB = '32fcf25df26a804cbd70eaf4ae572483';

if (!NOTION_API_KEY) {
  console.error('❌ Brak klucza API Notion!');
  console.error('Dodaj do pliku .env:');
  console.error('NOTION_API_KEY=secret_twoj_klucz_tutaj');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

async function addTask(name, options = {}) {
  try {
    // Pobierz ID projektu Canary Weather
    const projectsResponse = await notion.databases.query({
      database_id: PROJECTS_DB,
      filter: {
        property: 'Name',
        title: { contains: 'Canary Weather' },
      },
    });

    const projectId = projectsResponse.results[0]?.id;

    const properties = {
      Name: {
        title: [{ text: { content: name } }],
      },
      Status: {
        status: { name: 'Not started' },
      },
      Priority: {
        select: { name: options.priority || 'Medium' },
      },
      Type: {
        select: { name: options.type || 'Feature' },
      },
    };

    if (projectId) {
      properties.Project = {
        relation: [{ id: projectId }],
      };
    }

    if (options.due) {
      properties['Due Date'] = {
        date: { start: options.due },
      };
    }

    await notion.pages.create({
      parent: { database_id: TASKS_DB },
      properties: properties,
    });

    console.log('✅ Zadanie dodane!');
    console.log(`   "${name}"`);
    console.log(`   Priority: ${options.priority || 'Medium'}`);
    console.log(`   Type: ${options.type || 'Feature'}`);

  } catch (error) {
    console.error('❌ Błąd:', error.message);
    process.exit(1);
  }
}

// Parsowanie argumentów
const args = process.argv.slice(2);
const taskName = args.find(arg => !arg.startsWith('--'));

if (!taskName) {
  console.log('Użycie: npm run notion:task "Nazwa zadania"');
  console.log('');
  console.log('Opcje:');
  console.log('  --priority=High     (Critical, High, Medium, Low)');
  console.log('  --type=Bug          (Feature, Bug, Refactor, Chore, Docs)');
  console.log('  --due=2024-12-31    (data w formacie YYYY-MM-DD)');
  process.exit(1);
}

const options = {};

args.forEach(arg => {
  if (arg.startsWith('--priority=')) {
    options.priority = arg.split('=')[1];
  }
  if (arg.startsWith('--type=')) {
    options.type = arg.split('=')[1];
  }
  if (arg.startsWith('--due=')) {
    options.due = arg.split('=')[1];
  }
});

addTask(taskName, options);
