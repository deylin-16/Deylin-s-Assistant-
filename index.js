process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

import './config.js';
import cfonts from 'cfonts';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { platform } from 'process';
import { tmpdir } from 'os';
import { readdirSync, unlinkSync, existsSync, watch, statSync } from 'fs';
import { join, dirname } from 'path';
import yargs from 'yargs';
import chalk from 'chalk';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import { makeWASocket, protoType, serialize } from './lib/simple.js';
import { Low, JSONFile } from 'lowdb';
import { fetchLatestBaileysVersion, useMultiFileAuthState, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';

const { say } = cfonts;

say('Pikachu Bot ⚡', { font: 'block', align: 'center', colors: ['magentaBright'] });
say('Developed By • Deylin', { font: 'console', align: 'center', colors: ['blueBright'] });

protoType();
serialize();

global.__filename = (pathURL = import.meta.url, rmPrefix = platform !== 'win32') => 
    rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathURL;
global.__dirname = (pathURL) => dirname(global.__filename(pathURL, true));
global.__require = (dir = import.meta.url) => createRequire(dir);

global.opts = yargs(process.argv.slice(2)).exitProcess(false).parse();
global.prefix = /^[#/!⚡.🧃]/;

const dbFile = './lib/database.json';
global.db = new Low(new JSONFile(dbFile));
global.loadDatabase = async () => {
    if (global.db.data !== null) return;
    await global.db.read().catch(() => {});
    global.db.data ||= { users: {}, chats: {}, stats: {}, msgs: {}, sticker: {}, settings: {} };
};
await global.loadDatabase();

const sessionsDir = './sessions';
const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
const msgRetryCounterCache = new NodeCache();
const { version } = await fetchLatestBaileysVersion();

const phoneNumber = '50432955554';  // Tu número fijo
let pairingCodeRequested = false;   // Flag para generar el código solo una vez

const connectionOptions = {
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Pikachu-Bot', 'Chrome', '110.0'],
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    msgRetryCounterCache,
    defaultQueryTimeoutMs: 60000,
    version,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
};

global.conn = makeWASocket(connectionOptions);

conn.ev.on('creds.update', saveCreds);

async function connectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    if (connection === 'open') {
        console.log(chalk.green('⚡ Bot conectado exitosamente 🧃'));
    }

    if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = reason !== 401 && reason !== 428;
        if (shouldReconnect) {
            console.log(chalk.yellow('Reconectando en 5 segundos...'));
            setTimeout(() => reloadHandler(true), 5000);
        } else {
            console.log(chalk.red('Desconectado permanentemente. Borra la carpeta "sessions" y reinicia.'));
        }
    }

    // === Generar código de emparejamiento cuando la conexión está lista ===
    if ((connection === 'connecting' || qr) && !pairingCodeRequested && !existsSync(`${sessionsDir}/creds.json`)) {
        pairingCodeRequested = true;
        console.log(chalk.bold.cyan('\n🧃 Generando código de emparejamiento para: ' + phoneNumber + '\n'));

        try {
            let code = await global.conn.requestPairingCode(phoneNumber);
            code = code.match(/.{1,4}/g)?.join('-') || code;

            console.log(chalk.bold.white.bgMagenta('\n🧃 TU CÓDIGO DE VINCULACIÓN:\n'));
            console.log(chalk.bold.white.bgBlue(`       ${code}       \n`));
            console.log(chalk.yellow('📱 Abre WhatsApp > Ajustes > Dispositivos vinculados > Vincular con número de teléfono'));
            console.log(chalk.yellow('Ingresa el código y espera a que conecte.\n'));
        } catch (error) {
            console.error(chalk.red('Error generando código:', error));
        }
    }
}

conn.ev.on('connection.update', connectionUpdate);

// ... (el resto del código igual: reloadHandler, plugins, clearTmp, etc.)

await reloadHandler();

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);