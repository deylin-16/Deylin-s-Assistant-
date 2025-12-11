import { fileURLToPath } from 'url';
import path, { join } from 'path';
import { unwatchFile, watchFile } from 'fs';
import chalk from 'chalk';
import urlRegex from 'url-regex-safe';

function minimalSmsg(conn, m) {
    if (!m || !m.key || !m.key.remoteJid) return null;
    const botJid = conn.user?.jid || global.conn?.user?.jid || '';
    if (!botJid) return null;
    try {
        m.chat = conn.normalizeJid(m.key.remoteJid);
        m.sender = conn.normalizeJid(m.key.fromMe ? botJid : m.key.participant || m.key.remoteJid);
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.text = m.message?.extendedTextMessage?.text || m.message?.conversation || m.message?.imageMessage?.caption || m.message?.videoMessage?.caption || '';
        m.text = m.text ? m.text.replace(/[\u200e\u200f]/g, '').trim() : '';
        m.isCommand = (global.prefix instanceof RegExp ? global.prefix.test(m.text.trim()[0]) : m.text.startsWith(global.prefix || '!') );
        m.isMedia = !!(m.message?.imageMessage || m.message?.videoMessage || m.message?.audioMessage || m.message?.stickerMessage || m.message?.documentMessage);
        return m;
    } catch (e) {
        return null;
    }
}

async function menu(conn, m, extra) {
    const texto = `Hola, soy el bot Kirito.
    
✅ *¡Comando Ejecutado con Éxito!*
    
El bot ha respondido desde la función aislada.
    
*Tu bot está conectado y el handler funciona.*`;
    
    await conn.reply(m.chat, texto, m);
}

export async function handler(chatUpdate) {
    const conn = this;
    
    try {
        if (!chatUpdate || !chatUpdate.messages || chatUpdate.messages.length === 0) return;
        let m = chatUpdate.messages[chatUpdate.messages.length - 1];
        if (!m || !m.key || !m.message || !m.key.remoteJid) return;
        if (!conn.user?.jid) return; 

        if (m.message) {
            m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message;
        }

        m = minimalSmsg(conn, m); 
        if (!m || !m.chat || !m.sender) return; 
        
        // --- INICIO DE IMPRESIÓN ---
        try {
            const groupMetadata = m.isGroup ? (conn.chats[m.chat] || {}).metadata || await conn.groupMetadata(m.chat).catch(_ => null) || {} : {};
            const senderName = m.isGroup ? m.sender.split('@')[0] : 'N/A'; 
            const chatName = m.isGroup ? (groupMetadata.subject || 'Grupo') : 'Privado';

            const now = new Date();
            const formattedTime = now.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const chatLabel = m.isGroup ? `[G]` : `[P]`;
            let logText = m.text.replace(/\u200e+/g, '');
            logText = logText.replace(urlRegex({ strict: false }), (url) => chalk.blueBright(url));

            const logLine = chalk.bold.hex('#00FFFF')(`[${formattedTime}] `) +
                            chalk.hex('#7FFF00').bold(chatLabel) + ' ' +
                            chalk.hex('#FF4500')(`${chatName ? chatName.substring(0, 15) : 'N/A'}: `) +
                            chalk.hex('#FFFF00')(`${senderName}: `) +
                            (m.isCommand ? chalk.yellow(logText) : logText.substring(0, 60));

            console.log(chalk.bold.green('✅ EVENTO RECIBIDO'));
            console.log(logLine);
            
        } catch (printError) {
            console.error(chalk.red('Error al imprimir mensaje en consola:'), printError);
        }
        // --- FIN DE IMPRESIÓN ---
        
        // Lógica de comando manual para la función de prueba (no requiere DB)
        if (m.isCommand) {
             const command = m.text.toLowerCase().split(/\s+/)[0].replace(global.prefix || '!', '');
             if (command === 'menu') {
                 const usedPrefix = m.text.charAt(0);
                 const extra = { usedPrefix };
                 return await menu(conn, m, extra);
             }
        }
        


    } catch (e) {
        console.error(chalk.bold.bgRed('❌ ERROR CRÍTICO EN HANDLER (CAPTURA GLOBAL) ❌'));
        console.error(e);
    }
}


let file = global.__filename(import.meta.url, true);
watchFile(file, async () => {
    unwatchFile(file);
    console.log(chalk.magenta("Se actualizo 'handler.js'"));
    if (global.reloadHandler) console.log(await global.reloadHandler());
});
