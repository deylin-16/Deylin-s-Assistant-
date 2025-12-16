import { smsg } from './lib/simple.js';
import { fileURLToPath } from 'url';
import path, { join } from 'path';
import { unwatchFile, watchFile } from 'fs';
import chalk from 'chalk';
import ws from 'ws';

const isNumber = x => typeof x === 'number' && !isNaN(x);

export async function handler(chatUpdate) {
    this.uptime = this.uptime || Date.now();
    const conn = this;

    if (global.db.data == null) await global.loadDatabase();

    if (!chatUpdate?.messages?.length) return;

    let m = chatUpdate.messages[chatUpdate.messages.length - 1];
    if (!m) return;

    m = smsg(conn, m) || m;
    if (!m) return;

    if (m.isBaileys) return;
    if (opts['self'] && !m.fromMe && !global.owner.some(([n]) => m.sender.startsWith(n.replace(/[^0-9]/g, '')))) return;
    if (opts['swonly'] && m.chat !== 'status@broadcast') return;
    if (typeof m.text !== 'string') m.text = '';

    const senderJid = m.sender;
    const chatJid = m.chat;

    let user = global.db.data.users[senderJid];
    if (!user) {
        user = global.db.data.users[senderJid] = { exp: 0, coin: 0, muto: false };
    } else {
        if (!isNumber(user.exp)) user.exp = 0;
        if (!isNumber(user.coin)) user.coin = 0;
        if (!('muto' in user)) user.muto = false;
    }

    const isROwner = global.owner.some(([number]) => senderJid.startsWith(number.replace(/[^0-9]/g, '') + (senderJid.includes('@lid') ? '@lid' : '@s.whatsapp.net')));
    const isOwner = isROwner || m.fromMe;

    m.exp = 0;
    m.coin = false;
    m.isCommand = false;

    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins');

    for (const name in global.plugins) {
        const plugin = global.plugins[name];
        if (!plugin || plugin.disabled) continue;

        const __filename = join(___dirname, name);

        if (typeof plugin.all === 'function') {
            try {
                await plugin.all.call(conn, m, { chatUpdate, __dirname: ___dirname, __filename });
            } catch (e) {
                console.error(`Error en plugin.all de ${name}:`, e);
            }
        }

        if (!opts['restrict'] && plugin.tags?.includes('admin')) continue;

        if (typeof plugin.before === 'function') {
            try {
                if (await plugin.before.call(conn, m, { conn, user, isROwner, isOwner, chatUpdate, __dirname: ___dirname, __filename })) {
                    continue;
                }
            } catch (e) {
                console.error(`Error en plugin.before de ${name}:`, e);
            }
        }

        if (typeof plugin !== 'function') continue;

        const str = m.text.trim();
        if (!str) continue;

        let matched = false;
        let command = '';
        let usedPrefix = '';

        if (plugin.command instanceof RegExp) {
            const match = str.match(plugin.command);
            if (match) {
                matched = true;
                command = match[0].toLowerCase();
                usedPrefix = match[0];
            }
        } else if (Array.isArray(plugin.command)) {
            for (const cmd of plugin.command) {
                if (cmd instanceof RegExp) {
                    const match = str.match(cmd);
                    if (match) {
                        matched = true;
                        command = match[0].toLowerCase();
                        usedPrefix = match[0];
                        break;
                    }
                } else if (str.toLowerCase().startsWith(cmd.toLowerCase())) {
                    matched = true;
                    command = cmd.toLowerCase();
                    usedPrefix = cmd;
                    break;
                }
            }
        } else if (typeof plugin.command === 'string' && str.toLowerCase().startsWith(plugin.command.toLowerCase())) {
            matched = true;
            command = plugin.command.toLowerCase();
            usedPrefix = plugin.command;
        }

        if (!matched) continue;

        const body = str.slice(usedPrefix.length).trim();
        const args = body.split(/\s+/).filter(Boolean);
        const text = args.join(' ');

        m.plugin = name;
        m.isCommand = true;

        const xp = 'exp' in plugin ? Math.max(parseInt(plugin.exp), 0) : 10;
        m.exp += xp;

        if (plugin.rowner && !isROwner) return global.dfail('rowner', m, conn);
        if (plugin.owner && !isOwner) return global.dfail('owner', m, conn);

        const extra = {
            usedPrefix, command, args, text, conn, user, isROwner, isOwner, chatUpdate, __dirname: ___dirname, __filename
        };

        try {
            await plugin.call(conn, m, extra);
        } catch (e) {
            m.error = e;
            console.error(`Error ejecutando plugin ${name}:`, e);
            const safeError = String(e).replace(new RegExp(Object.values(global.APIKeys || {}).join('|'), 'g'), '[KEY]');
            await conn.reply(m.chat, safeError, m).catch(() => {});
        } finally {
            if (typeof plugin.after === 'function') {
                try {
                    await plugin.after.call(conn, m, extra);
                } catch (e) {
                    console.error(`Error en plugin.after de ${name}:`, e);
                }
            }
        }

        return;
    }
}

global.dfail = (type, m, conn) => {
    const msg = {
        rowner: ':v',
        owner: 'v:'
    }[type] || '';
    if (msg) conn.reply(m.chat, msg, m);
};

const file = global.__filename(import.meta.url, true);
watchFile(file, () => {
    unwatchFile(file);
    console.log(chalk.magenta("Se actualizó 'handler.js'"));
    if (global.conns?.length) {
        global.conns
            .filter(c => c.user && c.ws?.socket?.readyState !== ws.CLOSED)
            .forEach(c => c.subreloadHandler?.(false));
    }
});