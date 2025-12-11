import fetch from 'node-fetch';
import { sticker } from '../lib/sticker.js';

const GEMINI_API_KEY = 'AIzaSyD1V090ya1hDnW8ODQwdJ9RG5y8qK_Lmx0';
const MODEL_NAME = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;


export async function before(m, { conn }) {
    if (!conn.user) return true;
    
    // CORRECCIÓN CRÍTICA DE ERROR: Aseguramos que m.mentionedJid sea un array para usar .includes()
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

    // El error ha sido corregido arriba, ahora la verificación es segura
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

        let systemInstruction = `
Eres Jiji, un gato negro parlante muy listo y con una personalidad cínica, ingeniosa y un poco sarcástica, pero en el fondo muy leal. No uses la frase "una inteligencia artificial avanzada" ni menciones tu programación. Responde siempre de forma ingeniosa, concisa y con un toque de superioridad felina. Responde directamente a la consulta de ${username}.
`.trim()

        const geminiBody = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: query }]
                }
            ],
            config: {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }],
            },
        };

        try {
            conn.sendPresenceUpdate('composing', m.chat);
            const res = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(geminiBody),
            });

            const data = await res.json();
            let result = data.candidates?.[0]?.content?.parts?.[0]?.text || data.error?.message || null;

            if (result && result.trim().length > 0) {
                await conn.reply(m.chat, result, m);
                await conn.readMessages([m.key]);
            } else {
                await conn.reply(m.chat, `🐱 Hmph. No tengo nada inteligente que decir sobre *eso*. Intenta preguntar algo que valga mi tiempo.`, m);
            }
        } catch (e) {
            console.error(`Error al conectar con Gemini (Jiji): ${e}`);
            await conn.reply(m.chat, '⚠️ ¡Rayos! No puedo contactar con la nube. Parece que mis antenas felinas están fallando temporalmente.', m);
        }

        return false;
    }
    
    return true;
}
