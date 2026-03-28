#!/usr/bin/env npx ts-node

/**
 * Dodaje nowe zadanie do Notion
 *
 * Użycie:
 *   npm run notion:task "Nazwa zadania"
 *   npm run notion:task "Nazwa zadania" -- --priority=High --type=Bug
 */

import 'dotenv/config';
import { Client } from '@notionhq/client';
import { NOTION_CONFIG, validateConfig } from './config';

validateConfig();

const notion = new Client({ auth: NOTION_CONFIG.apiKey });

interface TaskOptions {
  name: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  type?: 'Feature' | 'Bug' | 'Refactor' | 'Chore' | 'Docs';
  dueDate?: string;
}

async function addTask(options: TaskOptions) {
  try {
    // Pobierz ID projektu Canary Weather
    const projectsResponse = await notion.databases.query({
      database_id: NOTION_CONFIG.databases.projects,
      filter: {
        property: 'Name',
        title: { contains: 'Canary Weather' },
      },
    });

    const projectId = projectsResponse.results[0]?.id;

    const response = await notion.pages.create({
      parent: { database_id: NOTION_CONFIG.databases.tasks },
      properties: {
        Name: {
          title: [{ text: { content: options.name } }],
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
        ...(projectId && {
          Project: {
            relation: [{ id: projectId }],
          },
        }),
        ...(options.dueDate && {
          'Due Date': {
            date: { start: options.dueDate },
          },
        }),
      },
    });

    console.log('✅ Zadanie dodane!');
    console.log(`   "${options.name}"`);
    console.log(`   Priority: ${options.priority || 'Medium'}`);
    console.log(`   Type: ${options.type || 'Feature'}`);

  } catch (error: any) {
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

const options: TaskOptions = { name: taskName };

args.forEach(arg => {
  if (arg.startsWith('--priority=')) {
    options.priority = arg.split('=')[1] as TaskOptions['priority'];
  }
  if (arg.startsWith('--type=')) {
    options.type = arg.split('=')[1] as TaskOptions['type'];
  }
  if (arg.startsWith('--due=')) {
    options.dueDate = arg.split('=')[1];
  }
});

addTask(options);
