process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

import './config.js';
import { watchFile, unwatchFile } from 'fs';
import cfonts from 'cfonts';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { platform } from 'process';
import * as ws from 'ws';
import { readdirSync, statSync, unlinkSync, existsSync, rmSync, watch, join } from 'path';
import yargs from 'yargs';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { tmpdir } from 'os';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import { makeWASocket, protoType, serialize } from './lib/simple.js';
import { Low, JSONFile } from 'lowdb';
import { fetchLatestBaileysVersion, useMultiFileAuthState, makeCacheableSignalKeyStore, jidNormalizedUser } from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';

const { say } = cfonts;

say('Pikachu Bot ⚡', { font: 'block', align: 'center', colors: ['magentaBright'] });
say('Developed By • Deylin', { font: 'console', align: 'center', colors: ['blueBright'] });

protoType();
serialize();

global.__filename = (pathURL = import.meta.url, rmPrefix = platform !== 'win32') => rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathURL;
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

const connectionOptions = {
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
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
    const { connection, lastDisconnect } = update;
    if (connection === 'connecting') return;
    if (connection === 'open') {
        console.log(chalk.green('⚡ Bot conectado exitosamente'));
    }
    if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = reason !== 401 && reason !== 428;
        if (shouldReconnect) {
            console.log(chalk.yellow('Reconectando...'));
            setTimeout(() => reloadHandler(true), 5000);
        } else {
            console.log(chalk.red('Desconectado permanentemente. Escanea QR de nuevo.'));
        }
    }
}

let handler = await import('./handler.js');
global.reloadHandler = async (restartConn = false) => {
    try {
        const newHandler = await import(`./handler.js?t=${Date.now()}`);
        handler = newHandler;
    } catch (e) { console.error(e); }

    if (restartConn) {
        try { conn.ws.close(); } catch {}
        conn.ev.removeAllListeners();
        global.conn = makeWASocket(connectionOptions);
        conn.ev.on('creds.update', saveCreds);
    }

    conn.ev.off('messages.upsert', conn.handler);
    conn.ev.off('connection.update', conn.connectionUpdate);

    conn.handler = handler.handler.bind(conn);
    conn.connectionUpdate = connectionUpdate;

    conn.ev.on('messages.upsert', conn.handler);
    conn.ev.on('connection.update', conn.connectionUpdate);
};

const pluginsDir = join(dirname(fileURLToPath(import.meta.url)), 'plugins');
const pluginFilter = (f) => /\.js$/.test(f);

global.plugins = {};
async function loadPlugins() {
    for (const file of readdirSync(pluginsDir).filter(pluginFilter)) {
        try {
            const module = await import(join(pluginsDir, file) + `?t=${Date.now()}`);
            global.plugins[file] = module.default || module;
        } catch (e) {
            console.error(`Error cargando plugin ${file}:`, e);
            delete global.plugins[file];
        }
    }
}
await loadPlugins();

watch(pluginsDir, async (event, filename) => {
    if (!pluginFilter(filename)) return;
    const path = join(pluginsDir, filename);
    if (!existsSync(path)) {
        delete global.plugins[filename];
        return;
    }
    try {
        delete require.cache[require.resolve(path)];
        const module = await import(path + `?t=${Date.now()}`);
        global.plugins[filename] = module.default || module;
        console.log(chalk.cyan(`Plugin actualizado: ${filename}`));
    } catch (e) {
        console.error(`Error recargando ${filename}:`, e);
    }
});

function clearTmp() {
    const tmp = join(tmpdir(), 'whatsapp-');
    try {
        const files = readdirSync(tmp).filter(f => Date.now() - statSync(join(tmp, f)).mtimeMs > 180000);
        files.forEach(f => unlinkSync(join(tmp, f)));
    } catch {}
}

setInterval(clearTmp, 60000 * 4);

setInterval(async () => {
    if (global.db.data) await global.db.write().catch(() => {});
}, 30000);

await reloadHandler();

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);