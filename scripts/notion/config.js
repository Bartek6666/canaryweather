"use strict";
// Notion API Configuration
// Uzupełnij NOTION_API_KEY w pliku .env
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTION_CONFIG = void 0;
exports.validateConfig = validateConfig;
exports.NOTION_CONFIG = {
    // Twój klucz API z notion.so/my-integrations
    apiKey: process.env.NOTION_API_KEY || '',
    // ID baz danych
    databases: {
        tasks: '32fcf25df26a80b2ad49cda8589feeb3',
        sessions: '32fcf25df26a80d8a107e2e28af0cb99',
        projects: '32fcf25df26a804cbd70eaf4ae572483',
        notes: '32fcf25df26a804b9b70f6593a542080',
    },
};
// Sprawdź czy klucz API jest ustawiony
function validateConfig() {
    if (!exports.NOTION_CONFIG.apiKey) {
        console.error('❌ Brak klucza API Notion!');
        console.error('');
        console.error('Dodaj do pliku .env:');
        console.error('NOTION_API_KEY=secret_twoj_klucz_tutaj');
        console.error('');
        process.exit(1);
    }
}
