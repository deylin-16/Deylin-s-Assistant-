import fetch from 'node-fetch';
import { sticker } from '../lib/sticker.js';

const POLLINATIONS_BASE_URL = 'https://text.pollinations.ai';

export async function before(m, { conn }) {
    if (!conn.user) return true;
    
    if (!Array.isArray(m.mentionedJid)) {
        m.mentionedJid = m.mentionedJid ? [m.mentionedJid] : [];
    }
    
    let user = global.db.data.users[m.sender];
    let chat = global.db.data.chats[m.chat];
    
    m.isBot =
        (m.id.startsWith('BAE5') && m.id.length === 16) ||
        (m.id.startsWith('3EB0') && m.id.length === 12) ||
        (m.id.startsWith('3EB0') && (m.id.length === 20 || m.id.length === 22)) ||
        (m.id.startsWith('B24E') && m.id.length === 20);
    if (m.isBot) return true;

    let prefixRegex = new RegExp('^[' + (opts['prefix'] || '‎z/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.,\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']');
    if (prefixRegex.test(m.text)) return true;

    if (m.sender.includes('bot') || m.sender.includes('Bot')) {
        return true;
    }

    if (m.mentionedJid.includes(conn.user.jid)) {
        
        if (
            m.text.includes('PIEDRA') ||
            m.text.includes('PAPEL') ||
            m.text.includes('TIJERA') ||
            m.text.includes('menu') ||
            m.text.includes('estado') ||
            m.text.includes('bots') ||
            m.text.includes('serbot') ||
            m.text.includes('jadibot') ||
            m.text.includes('Video') ||
            m.text.includes('Audio') ||
            m.text.includes('audio')
        ) return true;
        
        let botJid = conn.user.jid;
        let botNumber = botJid.split('@')[0];
        let text = m.text || '';
        
        let query = text.replace(new RegExp(`@${botNumber}`, 'g'), '').trim() || ''
        query = query.replace(/@\w+\s?/, '').trim() || ''
        let username = m.pushName || 'Usuario'

        if (query.length === 0) return false;

        let jijiPrompt = `Eres Jiji, un gato negro sarcástico y leal. Responde a ${username}: ${query}`;

        try {
            conn.sendPresenceUpdate('composing', m.chat);
            
            const url = `${POLLINATIONS_BASE_URL}/${encodeURIComponent(jijiPrompt)}`;

            const res = await fetch(url);
            
            if (!res.ok) {
                throw new Error(`Error HTTP: ${res.status}`);
            }

            const result = await res.text();

            if (result && result.trim().length > 0) {
                await conn.reply(m.chat, result.trim(), m);
                await conn.readMessages([m.key]);
            } else {
                await conn.reply(m.chat, `🐱 Hmph. La IA no tiene nada ingenioso que decir sobre *eso*.`, m);
            }
        } catch (e) {
            await conn.reply(m.chat, '⚠️ ¡Rayos! No puedo contactar con la nube de la IA. Parece que mis antenas felinas están fallando temporalmente.', m);
        }

        return false;
    }
    
    return true;
}
