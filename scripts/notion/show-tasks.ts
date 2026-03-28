#!/usr/bin/env npx ts-node

/**
 * Pokazuje aktywne zadania z Notion
 *
 * Użycie:
 *   npm run notion:tasks
 */

import 'dotenv/config';
import { Client } from '@notionhq/client';
import { NOTION_CONFIG, validateConfig } from './config';

validateConfig();

const notion = new Client({ auth: NOTION_CONFIG.apiKey });

const statusIcons: Record<string, string> = {
  'Not started': '⬜',
  'In progress': '🔄',
  'Blocked': '🚫',
};

const priorityIcons: Record<string, string> = {
  'Critical': '🔴',
  'High': '🟠',
  'Medium': '🟡',
  'Low': '🟢',
};

async function showTasks() {
  try {
    const response = await notion.databases.query({
      database_id: NOTION_CONFIG.databases.tasks,
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
      const props = (page as any).properties;
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
    console.error('❌ Błąd:', (error as Error).message);
    process.exit(1);
  }
}

showTasks();
