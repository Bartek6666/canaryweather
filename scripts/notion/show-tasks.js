#!/usr/bin/env node

/**
 * Pokazuje aktywne zadania z Notion
 *
 * Użycie:
 *   npm run notion:tasks
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TASKS_DB = '32fcf25df26a80b2ad49cda8589feeb3';

if (!NOTION_API_KEY) {
  console.error('❌ Brak klucza API Notion!');
  console.error('Dodaj do pliku .env:');
  console.error('NOTION_API_KEY=secret_twoj_klucz_tutaj');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

const statusIcons = {
  'Not started': '⬜',
  'In progress': '🔄',
  'Blocked': '🚫',
};

const priorityIcons = {
  'Critical': '🔴',
  'High': '🟠',
  'Medium': '🟡',
  'Low': '🟢',
};

async function showTasks() {
  try {
    const response = await notion.databases.query({
      database_id: TASKS_DB,
      filter: {
        property: 'Status',
        status: { does_not_equal: 'Done' },
      },
      sorts: [
        { property: 'Priority', direction: 'ascending' },
      ],
    });

    if (response.results.length === 0) {
      console.log('✨ Brak aktywnych zadań!');
      return;
    }

    console.log('📋 Aktywne zadania:\n');

    response.results.forEach((page, index) => {
      const props = page.properties;
      const name = props.Name?.title?.[0]?.plain_text || '(bez nazwy)';
      const status = props.Status?.status?.name || '-';
      const priority = props.Priority?.select?.name || '-';
      const type = props.Type?.select?.name || '-';

      const statusIcon = statusIcons[status] || '⬜';
      const priorityIcon = priorityIcons[priority] || '⚪';

      console.log(`${index + 1}. ${statusIcon} ${name}`);
      console.log(`   ${priorityIcon} ${priority} | ${type}`);
      console.log('');
    });

    console.log(`Razem: ${response.results.length} zadań`);

  } catch (error) {
    console.error('❌ Błąd:', error.message);
    process.exit(1);
  }
}

showTasks();
