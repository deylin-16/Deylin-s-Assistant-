import { smsg } from './lib/simple.js';
import { format } from 'util';
import { fileURLToPath } from 'url';
import path, { join } from 'path';
import { unwatchFile, watchFile } from 'fs';
import chalk from 'chalk';
import ws from 'ws';

const isNumber = x => typeof x === 'number' && !isNaN(x);

async function getLidFromJid(id, connection) {
    if (id.endsWith('@lid')) return id;
    const res = await connection.onWhatsApp(id).catch(() => []);
    return res[0]?.lid || id;
}

export async function handler(chatUpdate) {
    this.uptime = this.uptime || Date.now();
    const conn = this;

    if (!chatUpdate || !chatUpdate.messages || chatUpdate.messages.length === 0) {
        return;
    }

    let m = chatUpdate.messages[chatUpdate.messages.length - 1];
    if (!m) return;

    m = smsg(conn, m) || m;
    if (!m) return;

    if (global.db.data == null) {
        await global.loadDatabase();
    }

    conn.processedMessages = conn.processedMessages || new Map();
    const now = Date.now();
    const lifeTime = 9000;

    const id = m.key.id;

    if (conn.processedMessages.has(id) && !m.fromMe) {
        return;
    }

    conn.processedMessages.set(id, now);

    for (const [msgId, time] of conn.processedMessages) {
        if (now - time > lifeTime) {
            conn.processedMessages.delete(msgId);
        }
    }

    try {
        m.exp = 0;
        m.coin = false;

        const senderJid = m.sender;
        const chatJid = m.chat;

        const user = global.db.data.users[senderJid] || {};

        if (typeof global.db.data.users[senderJid] !== 'object') global.db.data.users[senderJid] = {};
        if (user) {
            if (!('exp' in user) || !isNumber(user.exp)) user.exp = 0;
            if (!('coin' in user) || !isNumber(user.coin)) user.coin = 0;
            if (!('muto' in user)) user.muto = false; 
        } else {
            global.db.data.users[senderJid] = { exp: 0, coin: 0, muto: false };
        }

        const detectwhat = m.sender.includes('@lid') ? '@lid' : '@s.whatsapp.net';
        const isROwner = global.owner.map(([number]) => number.replace(/[^0-9]/g, '') + detectwhat).includes(senderJid);
        const isOwner = isROwner || m.fromMe;

        if (m.isBaileys || opts['nyimak']) return;
        if (!isROwner && opts['self']) return;
        if (opts['swonly'] && m.chat !== 'status@broadcast') return;
        if (typeof m.text !== 'string') m.text = '';

        let senderLid = m.sender; 

        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins');
        let usedPrefix = ''; 

        for (const name in global.plugins) {
            const plugin = global.plugins[name];
            if (!plugin || plugin.disabled) continue;

            const __filename = join(___dirname, name);

            if (typeof plugin.all === 'function') {
                try {
                    if (plugin.all.toString().includes('conn.user') && !conn.user) {
                        return 
                    }

                    await plugin.all.call(conn, m, {
                        chatUpdate,
                        __dirname: ___dirname,
                        __filename
                    });
                } catch (e) {
                    if (e instanceof TypeError && e.message.includes('user')) {
                    } else {
                        console.error(`Error en plugin.all de ${name}:`, e);
                    }
                }
            }

            if (!opts['restrict'] && plugin.tags && plugin.tags.includes('admin')) {
                continue;
            }

            if (typeof plugin.before === 'function') {
                const extraBefore = {
                    conn, user: global.db.data.users[m.sender], isROwner, isOwner, chatUpdate, __dirname: ___dirname, __filename
                };
                if (await plugin.before.call(conn, m, extraBefore)) {
                    continue;
                }
            }

            if (typeof plugin !== 'function') continue;

            let noPrefix = m.text.trim();
            if (noPrefix.length === 0) continue; 

            let [command, ...args] = noPrefix.split(/\s+/).filter(v => v);
            command = (command || '').toLowerCase();

            const isAccept = plugin.command instanceof RegExp ?
                plugin.command.test(command) :
                Array.isArray(plugin.command) ?
                    plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) :
                    typeof plugin.command === 'string' ?
                        plugin.command === command :
                        false;

            if (!isAccept) continue;

            noPrefix = m.text.trim().substring(command.length).trim();
            let text = args.join(' ');

            if (noPrefix.length > 0) {
               args = noPrefix.split(/\s+/).filter(v => v);
            } else {
               args = [];
            }

            m.plugin = name;

            const fail = plugin.fail || global.dfail;
            global.comando = command;

            if (plugin.rowner && !isROwner) {
                fail('rowner', m, conn);
                return;
            }
            if (plugin.owner && !isOwner) {
                fail('owner', m, conn);
                return;
            }

            m.isCommand = true;
            const xp = 'exp' in plugin ? parseInt(plugin.exp) : 10;
            m.exp += xp;

            const extra = {
                usedPrefix, noPrefix, args, command, text, conn, user: global.db.data.users[m.sender], isROwner, isOwner, chatUpdate, __dirname: ___dirname, __filename
            };

            try {
                await plugin.call(conn, m, extra);
            } catch (e) {
                m.error = e;
                console.error(`Error de ejecución en plugin ${name}:`, e);
                const errorText = format(e).replace(new RegExp(Object.values(global.APIKeys).join('|'), 'g'), 'Administrador');
                m.reply(errorText);
            } finally {
                if (typeof plugin.after === 'function') {
                    try {
                        await plugin.after.call(conn, m, extra);
                    } catch (e) {
                        console.error(`Error en plugin.after de ${name}:`, e);
                    }
                }
            }
        }

    } catch (e) {
        console.error('Error no capturado en handler:', e);
    } finally {
        if (m) {
            const finalUser = global.db.data.users[m.sender];
            if (finalUser) {
                if (finalUser.muto) {
                    await conn.sendMessage(m.chat, { delete: m.key });
                }
                finalUser.exp = (finalUser.exp || 0) + (m.exp || 0);
                finalUser.coin = (finalUser.coin || 0) - (m.coin ? finalUser.coin * 1 : 0);
            }

            if (m.plugin) {
                const stats = global.db.data.stats;
                const now = Date.now();
                stats[m.plugin] ||= { total: 0, success: 0, last: 0, lastSuccess: 0 };
                const stat = stats[m.plugin];
                stat.total += 1;
                stat.last = now;
                if (!m.error) {
                    stat.success += 1;
                    stat.lastSuccess = now;
                }
            }
        }
    }
}

global.dfail = (type, m, conn) => {
    const messages = {
        rowner: ``,
        owner: `Solo con Deylin-Eliac hablo de eso w.`,
    };
    if (messages[type]) {
        conn.reply(m.chat, messages[type], m);
    }
};

let file = global.__filename(import.meta.url, true);
watchFile(file, async () => {
    unwatchFile(file);
    console.log(chalk.magenta("Se actualizo 'handler.js'"));
    if (global.conns && global.conns.length > 0) {
        const users = global.conns.filter((conn) => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED);
        for (const user of users) {
            user.subreloadHandler(false);
        }
    }
});
