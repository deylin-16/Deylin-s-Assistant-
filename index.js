process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

import './config.js';
import cfonts from 'cfonts';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { platform, tmpdir } from 'process';
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
    if (connection === 'open') {
        console.log(chalk.green('⚡ Bot conectado exitosamente'));
    }
    if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = reason !== 401 && reason !== 428;
        if (shouldReconnect) {
            console.log(chalk.yellow('Reconectando en 5 segundos...'));
            setTimeout(() => reloadHandler(true), 5000);
        } else {
            console.log(chalk.red('Desconectado permanentemente. Borra la carpeta sessions y escanea QR.'));
        }
    }
}

let handler = await import('./handler.js');

global.reloadHandler = async function (restartConn = false) {
    try {
        const newHandler = await import(`./handler.js?t=${Date.now()}`);
        handler = newHandler;
    } catch (e) {
        console.error('Error recargando handler:', e);
    }

    if (restartConn) {
        try { global.conn.ws?.close(); } catch {}
        global.conn.ev.removeAllListeners();
        global.conn = makeWASocket(connectionOptions);
        global.conn.ev.on('creds.update', saveCreds);
    }

    // Remover listeners solo si existen
    if (global.conn.handler) {
        global.conn.ev.off('messages.upsert', global.conn.handler);
    }
    if (global.conn.connectionUpdate) {
        global.conn.ev.off('connection.update', global.conn.connectionUpdate);
    }

    global.conn.handler = handler.handler.bind(global.conn);
    global.conn.connectionUpdate = connectionUpdate.bind(global.conn);

    global.conn.ev.on('messages.upsert', global.conn.handler);
    global.conn.ev.on('connection.update', global.conn.connectionUpdate);
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
        }
    }
}
await loadPlugins();

watch(pluginsDir, async (event, filename) => {
    if (!pluginFilter(filename)) return;
    const fullPath = join(pluginsDir, filename);
    if (!existsSync(fullPath)) {
        delete global.plugins[filename];
        return;
    }
    try {
        const module = await import(fullPath + `?t=${Date.now()}`);
        global.plugins[filename] = module.default || module;
        console.log(chalk.cyan(`Plugin actualizado: ${filename}`));
    } catch (e) {
        console.error(`Error recargando plugin ${filename}:`, e);
    }
});

function clearTmp() {
    try {
        const tmpPath = tmpdir();
        const files = readdirSync(tmpPath)
            .filter(f => f.startsWith('whatsapp-') || f.startsWith('baileys-'))
            .filter(f => {
                try {
                    return Date.now() - statSync(join(tmpPath, f)).mtimeMs > 180000;
                } catch { return false; }
            });
        files.forEach(f => unlinkSync(join(tmpPath, f)));
    } catch (e) {}
}

setInterval(clearTmp, 60000 * 4);

setInterval(async () => {
    try {
        if (global.db.data) await global.db.write();
    } catch (e) {}
}, 30000);

await reloadHandler();

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);