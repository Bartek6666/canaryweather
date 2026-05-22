#!/usr/bin/env npx ts-node

/**
 * Szybkie zapisywanie pomysłów do Notion (baza Notes)
 *
 * Użycie:
 *   npm run notion:idea "Mój pomysł na nową funkcję"
 *   npm run notion:idea "Pomysł" -- --tags=UX,Mobile
 */

import 'dotenv/config';
import { Client } from '@notionhq/client';
import { NOTION_CONFIG, validateConfig } from './config';

validateConfig();

const notion = new Client({ auth: NOTION_CONFIG.apiKey });

interface IdeaOptions {
  content: string;
  tags?: string[];
}

async function addIdea(options: IdeaOptions) {
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

    // Przygotuj tagi (zawsze dodaj "Idea")
    const allTags = ['Idea', ...(options.tags || [])];
    const tagsProperty = allTags.map(tag => ({ name: tag }));

    const response = await notion.pages.create({
      parent: { database_id: NOTION_CONFIG.databases.notes },
      properties: {
        Name: {
          title: [{ text: { content: options.content } }],
        },
        Type: {
          select: { name: 'Idea' },
        },
        Tags: {
          multi_select: tagsProperty,
        },
        ...(projectId && {
          '📂 Projects': {
            relation: [{ id: projectId }],
          },
        }),
      },
    });

    console.log('💡 Pomysł zapisany!');
    console.log(`   "${options.content}"`);
    console.log(`   Tagi: ${allTags.join(', ')}`);
    console.log(`   Projekt: Canary Weather`);

  } catch (error: any) {
    if (error.code === 'validation_error') {
      console.error('❌ Błąd walidacji Notion:', error.message);
      console.error('');
      console.error('Sprawdź czy baza Notes ma właściwości:');
      console.error('  - Name (title)');
      console.error('  - Type (select z opcją "Idea")');
      console.error('  - Tags (multi_select)');
      console.error('  - Project (relation do Projects)');
    } else {
      console.error('❌ Błąd:', error.message);
    }
    process.exit(1);
  }
}

// Parsowanie argumentów
const args = process.argv.slice(2);
const ideaContent = args.find(arg => !arg.startsWith('--'));

if (!ideaContent) {
  console.log('💡 Notion Ideas - szybkie zapisywanie pomysłów');
  console.log('');
  console.log('Użycie:');
  console.log('  npm run notion:idea "Treść pomysłu"');
  console.log('');
  console.log('Opcje:');
  console.log('  --tags=UX,Mobile    Dodatkowe tagi (rozdzielone przecinkiem)');
  console.log('');
  console.log('Przykłady:');
  console.log('  npm run notion:idea "Widget pogodowy na ekran główny"');
  console.log('  npm run notion:idea "Dark mode" -- --tags=UI,Enhancement');
  process.exit(1);
}

const options: IdeaOptions = { content: ideaContent };

args.forEach(arg => {
  if (arg.startsWith('--tags=')) {
    options.tags = arg.split('=')[1].split(',').map(t => t.trim());
  }
});

addIdea(options);
