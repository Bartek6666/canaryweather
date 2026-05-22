#!/usr/bin/env npx ts-node
"use strict";
/**
 * Szybkie zapisywanie pomysłów do Notion (baza Notes)
 *
 * Użycie:
 *   npm run notion:idea "Mój pomysł na nową funkcję"
 *   npm run notion:idea "Pomysł" -- --tags=UX,Mobile
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var client_1 = require("@notionhq/client");
var config_1 = require("./config");
(0, config_1.validateConfig)();
var notion = new client_1.Client({ auth: config_1.NOTION_CONFIG.apiKey });
function addIdea(options) {
    return __awaiter(this, void 0, void 0, function () {
        var projectsResponse, projectId, allTags, tagsProperty, response, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, notion.databases.query({
                            database_id: config_1.NOTION_CONFIG.databases.projects,
                            filter: {
                                property: 'Name',
                                title: { contains: 'Canary Weather' },
                            },
                        })];
                case 1:
                    projectsResponse = _b.sent();
                    projectId = (_a = projectsResponse.results[0]) === null || _a === void 0 ? void 0 : _a.id;
                    allTags = __spreadArray(['Idea'], (options.tags || []), true);
                    tagsProperty = allTags.map(function (tag) { return ({ name: tag }); });
                    return [4 /*yield*/, notion.pages.create({
                            parent: { database_id: config_1.NOTION_CONFIG.databases.notes },
                            properties: __assign({ Name: {
                                    title: [{ text: { content: options.content } }],
                                }, Type: {
                                    select: { name: 'Idea' },
                                }, Tags: {
                                    multi_select: tagsProperty,
                                } }, (projectId && {
                                '📂 Projects': {
                                    relation: [{ id: projectId }],
                                },
                            })),
                        })];
                case 2:
                    response = _b.sent();
                    console.log('💡 Pomysł zapisany!');
                    console.log("   \"".concat(options.content, "\""));
                    console.log("   Tagi: ".concat(allTags.join(', ')));
                    console.log("   Projekt: Canary Weather");
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _b.sent();
                    if (error_1.code === 'validation_error') {
                        console.error('❌ Błąd walidacji Notion:', error_1.message);
                        console.error('');
                        console.error('Sprawdź czy baza Notes ma właściwości:');
                        console.error('  - Name (title)');
                        console.error('  - Type (select z opcją "Idea")');
                        console.error('  - Tags (multi_select)');
                        console.error('  - Project (relation do Projects)');
                    }
                    else {
                        console.error('❌ Błąd:', error_1.message);
                    }
                    process.exit(1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Parsowanie argumentów
var args = process.argv.slice(2);
var ideaContent = args.find(function (arg) { return !arg.startsWith('--'); });
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
var options = { content: ideaContent };
args.forEach(function (arg) {
    if (arg.startsWith('--tags=')) {
        options.tags = arg.split('=')[1].split(',').map(function (t) { return t.trim(); });
    }
});
addIdea(options);
