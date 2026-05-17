#!/usr/bin/env node
// Agent JS minimal pour traiter un prompt localement ou via l'API OpenAI
// Usage: node agents/simple_agent.js <template|custom> "votre texte"

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadTemplate(name) {
  const templates = {
    resume: 'Résume le texte suivant en 3 à 5 phrases claires et neutres :\\n\\n{{text}}',
    entities: 'À partir du texte suivant, liste les personnes, organisations, dates et lieux mentionnés sous forme de JSON :\\n\\n{{text}}',
    actions: 'Analyse le texte suivant et propose 5 actions concrètes, classées par priorité et avec des estimations de temps :\\n\\n{{text}}'
  };
  return templates[name] || name;
}

function parseArgs(argv) {
  const options = {
    export: null,
    score: null,
    time: null,
    status: null,
    notes: null,
    student: null,
    checkSheetsAuth: false,
    spreadsheet: null,
    sheetName: null,
  };
  const args = [];
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--export') {
      options.export = argv[i + 1];
      i += 2;
    } else if (arg === '--score') {
      options.score = argv[i + 1];
      i += 2;
    } else if (arg === '--time') {
      options.time = argv[i + 1];
      i += 2;
    } else if (arg === '--status') {
      options.status = argv[i + 1];
      i += 2;
    } else if (arg === '--notes') {
      options.notes = argv[i + 1];
      i += 2;
    } else if (arg === '--student') {
      options.student = argv[i + 1];
      i += 2;
    } else if (arg === '--check-sheets-auth') {
      options.checkSheetsAuth = true;
      i += 1;
    } else if (arg === '--spreadsheet') {
      options.spreadsheet = argv[i + 1];
      i += 2;
    } else if (arg === '--sheet-name') {
      options.sheetName = argv[i + 1];
      i += 2;
    } else {
      args.push(arg);
      i += 1;
    }
  }
  return { args, options };
}

function anonymizeUserInfo(raw) {
  const text = raw || '';
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const ageMatch = text.match(/(\d{1,2})\s*(ans|an)/i);
  const quartierMatch = text.match(/quartier\s+([\w\s\-éèàêôûç]+)/i) || text.match(/(Paris|Lyon|Marseille|Toulouse|Lille|Nice)/i);

  const rawIdSource = emailMatch ? emailMatch[0] : text.slice(0, 60);
  const id = crypto.createHash('sha256').update(rawIdSource).digest('hex').slice(0, 10);
  const ageBracket = ageMatch ? `${Math.floor(ageMatch[1] / 10) * 10}-${Math.floor(ageMatch[1] / 10) * 10 + 9}` : 'xx-xx';
  const quartier = quartierMatch ? (quartierMatch[1] || quartierMatch[0]).trim() : 'quar_unknown';

  return {
    id: `user_${id}`,
    ageBracket,
    quartier: quartier.replace(/\s+/g, '_'),
    anonymizedLabel: `user_${id}_${ageBracket}_${quartier.replace(/\s+/g, '_')}`,
  };
}

function exportToCsv(row, filename) {
  const header = ['ID', 'date', 'module', 'score quiz', 'temps passé', 'statut', 'zone notes'];
  const filePath = path.resolve(process.cwd(), filename);
  const exists = fs.existsSync(filePath);
  const csvLine = [
    row.id,
    row.date,
    row.module,
    row.score ?? '',
    row.time ?? '',
    row.status ?? '',
    row.notes ? row.notes.replace(/"/g, '""') : ''
  ].map(field => `"${field}"`).join(',');

  if (!exists) {
    fs.writeFileSync(filePath, `${header.map(h => `"${h}"`).join(',')}\n${csvLine}\n`, 'utf8');
  } else {
    fs.appendFileSync(filePath, `${csvLine}\n`, 'utf8');
  }
  return filePath;
}

function printSheetsImportExample(filename) {
  console.log(`\n--- Exemple d'import Google Sheets ---\n`);
  console.log(`1) Importez le fichier CSV dans Google Sheets via Fichier > Importer > Télécharger.`);
  console.log(`2) Utilisez ensuite une formule de suivi par module, par exemple :`);
  console.log(`   =QUERY({C2:C, D2:D, E2:E}, "select Col1, avg(Col2) where Col1 is not null group by Col1 label avg(Col2) 'Score moyen'", 0)`);
  console.log(`3) Pour un taux de réussite moyen par module :`);
  console.log(`   En B2 : =UNIQUE(C2:C)`);
  console.log(`   En C2 : =ARRAYFORMULA(IF(B2:B="","",COUNTIFS(C:C,B2:B,E:E,"réussi")/COUNTIF(C:C,B2:B)))`);
  console.log(`4) Le fichier créé est : ${filename}`);
}

async function getSheetsAuthClient() {
  const { google } = require('googleapis');
  let auth;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE) {
    auth = new google.auth.GoogleAuth({
      keyFilename: process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else {
    throw new Error('Veuillez définir GOOGLE_SERVICE_ACCOUNT_JSON ou GOOGLE_SERVICE_ACCOUNT_KEYFILE dans .env');
  }
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

function getSpreadsheetId(options) {
  return options.spreadsheet || process.env.SHEETS_SPREADSHEET_ID;
}

async function checkSheetsAuth(options) {
  const spreadsheetId = getSpreadsheetId(options);
  if (!spreadsheetId) {
    throw new Error('Aucun SHEETS_SPREADSHEET_ID trouvé. Utilisez --spreadsheet ou définissez SHEETS_SPREADSHEET_ID.');
  }
  const sheets = await getSheetsAuthClient();
  const result = await sheets.spreadsheets.get({ spreadsheetId, fields: 'spreadsheetId,properties(title)' });
  console.log('✅ Authentification Google Sheets OK');
  console.log(`Spreadsheet ID: ${result.data.spreadsheetId}`);
  console.log(`Titre: ${result.data.properties?.title}`);
}

async function ensureSheetHeader(sheets, spreadsheetId, sheetName, headerRow) {
  const range = `${sheetName}!A1:G1`;
  try {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const values = response.data.values || [];
    if (values.length === 0 || values[0].length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headerRow],
        },
      });
    }
  } catch (err) {
    if (err.code === 404) {
      throw new Error(`Onglet ou feuille introuvable: ${sheetName}`);
    }
    throw err;
  }
}

async function appendToSheet(row, options) {
  const spreadsheetId = getSpreadsheetId(options);
  if (!spreadsheetId) {
    throw new Error('Aucun ID de feuille de calcul défini. Utilisez --spreadsheet ou SHEETS_SPREADSHEET_ID.');
  }
  const sheetName = options.sheetName || process.env.SHEETS_SHEET_NAME || 'Sheet1';
  const sheets = await getSheetsAuthClient();
  await ensureSheetHeader(sheets, spreadsheetId, sheetName, ['ID', 'date', 'module', 'score quiz', 'temps passé', 'statut', 'zone notes']);
  const values = [[row.id, row.date, row.module, row.score, row.time, row.status, row.notes]];
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:G`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values,
    },
  });
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}

function simulateLLM(prompt) {
  // Simule un retour d'IA pour test local.
  // Si le prompt est structuré et demande un JSON (mode quiz), renvoyer un JSON d'exemple valide
  try {
    if (prompt && prompt.messages) {
      const userMsg = prompt.messages.find(m => m.role === 'user')?.content || '';
      if (/Génère un quiz/i.test(userMsg)) {
        const themeMatch = userMsg.match(/sur "([^"]+)"/) || userMsg.match(/sur ([^\"]+)/);
        const theme = (themeMatch && themeMatch[1]) ? themeMatch[1].trim() : 'thème inconnu';
        const quiz = [
          {
            question: `Qu'est-ce qu'un volcan actif ? (sur ${theme})`,
            options: { A: 'Un mont inactif', B: 'Une montagne qui émet des coulées de lave', C: 'Un type de nuage', D: 'Un lac'},
            réponse_correcte: 'B',
            explication: 'Un volcan actif peut émettre de la lave, des cendres ou des gaz.'
          },
          {
            question: `Quelle est la principale cause d'une éruption volcanique ?`,
            options: { A: 'Mouvements tectoniques', B: 'Pluie abondante', C: 'Érosion', D: 'Activité humaine'},
            réponse_correcte: 'A',
            explication: "Les mouvements des plaques tectoniques provoquent la montée du magma vers la surface."
          },
          {
            question: `Quel est un signe précurseur d'une éruption ?`,
            options: { A: 'Séismes locaux', B: 'Froid soudain', C: 'Augmentation des oiseaux', D: 'Baisse du niveau de la mer'},
            réponse_correcte: 'A',
            explication: 'Les séismes locaux peuvent indiquer le mouvement du magma sous la surface.'
          }
        ];
        return JSON.stringify({ theme, questions: quiz }, null, 2);
      }
    }
  } catch (e) {
    // ignore et tomberas en fallback
  }

  return `SIMULATION LLM RESPONSE:\nPrompt reçu:\n${typeof prompt === 'string' ? prompt : JSON.stringify(prompt, null, 2)}\\n\\n(Clé OPENAI_API_KEY non fournie — utiliser .env pour la config)`;
}

async function callLLM(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    return simulateLLM(prompt);
  }

  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    // Support both plain prompt string and structured request { messages, response_format }
    let resp;
    if (typeof prompt === 'string') {
      resp = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
      });
    } else if (prompt && prompt.messages) {
      const req = {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: prompt.messages,
        max_tokens: prompt.max_tokens || 800,
      };
      if (prompt.response_format) req.response_format = prompt.response_format;
      resp = await client.chat.completions.create(req);
    } else {
      throw new Error('Format de prompt non supporté pour callLLM');
    }

    const text = resp?.choices?.[0]?.message?.content ?? resp?.choices?.[0]?.text ?? JSON.stringify(resp, null, 2);
    return text;
  } catch (err) {
    console.error("Erreur lors de l'appel à l'API LLM:", err?.message || err);
    throw err;
  }
}

async function main() {
  const { args, options } = parseArgs(process.argv.slice(2));
  if (options.checkSheetsAuth) {
    try {
      await checkSheetsAuth(options);
      process.exit(0);
    } catch (err) {
      console.error('Échec de l’authentification Sheets :', err.message || err);
      process.exit(1);
    }
  }

  if (args.length < 2) {
    console.error('Usage: node agents/simple_agent.js <template|custom> <text> [--export csv|sheets] [--score 85] [--time 12] [--status réussi] [--notes "commentaires"] [--student "Nom email quartier age"] [--spreadsheet ID] [--sheet-name Sheet1]');
    process.exit(2);
  }

  const templateArg = args[0];
  const text = args.slice(1).join(' ');
  const template = loadTemplate(templateArg);

  // Support special 'quiz' mode that builds structured messages and requests JSON
  let prompt;
  if (templateArg === 'quiz') {
    const theme = text || 'thème inconnu';
    prompt = {
      messages: [
        { role: 'system', content: "Tu es un assistant pédagogique. Réponds UNIQUEMENT en JSON valide, sans texte avant ni après." },
        { role: 'user', content: `Génère un quiz de 3 questions sur "${theme}" avec pour chaque : question, options (A,B,C,D), réponse_correcte, explication.` }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800
    };
  } else {
    prompt = template.replace('{{text}}', text);
  }

  try {
    const response = await callLLM(prompt);
    console.log('\n--- RÉPONSE (brute) ---\n');
    console.log(response);

    let parsed = null;
    if (templateArg === 'quiz') {
      try {
        parsed = JSON.parse(response);
        console.log('\n--- QUIZ PARSÉ ---\n');
        console.log(parsed);
      } catch (e) {
        console.warn('Impossible de parser la réponse JSON du LLM :', e.message);
      }
    }

    if (options.export === 'csv' || options.export === 'sheets') {
      const studentData = anonymizeUserInfo(options.student || text);
      const row = {
        id: studentData.anonymizedLabel,
        date: new Date().toISOString(),
        module: templateArg === 'quiz' ? (parsed?.theme || text || 'module inconnu') : templateArg,
        score: options.score ?? '',
        time: options.time ?? '',
        status: options.status ?? '',
        notes: options.notes ?? (parsed ? `Quiz généré pour le thème ${parsed.theme || text}` : `Source: ${text}`),
      };

      if (options.export === 'csv') {
        const filename = 'quiz_results.csv';
        const filePath = exportToCsv(row, filename);
        console.log(`\n✅ Export CSV généré : ${filePath}`);
      } else {
        const spreadsheetUrl = await appendToSheet(row, options);
        console.log(`\n✅ Export réel vers Google Sheets effectué : ${spreadsheetUrl}`);
        console.log(`Onglet: ${options.sheetName || process.env.SHEETS_SHEET_NAME || 'Sheet1'}`);
      }
    }
  } catch (err) {
    console.error('Échec de la requête LLM. Voir erreur ci-dessus.');
    process.exit(1);
  }
}

if (require.main === module) main();
