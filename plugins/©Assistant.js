import fetch from 'node-fetch';
import { sticker } from '../lib/sticker.js';

const POLLINATIONS_BASE_URL = 'https://text.pollinations.ai';

export async function before(m, { conn }) {
    if (!conn.user) return true;

    let user = global.db.data.users[m.sender];
    let chat = global.db.data.chats[m.chat];

    let mentionedJidSafe = Array.isArray(m.mentionedJid) ? m.mentionedJid : [];

    let botJid = conn.user.jid;
    let botNumber = botJid.split('@')[0];
    let text = m.text || '';

    // CONDICIÓN DE ACTIVACIÓN: Se activa si hay alguna mención, o si la JID del bot es detectada.
    let isMentionedAtAll = text.trim().startsWith('@') || mentionedJidSafe.length > 0;
    
    // VERIFICACIÓN CLAVE: El bot NO debe responder si se menciona a alguien MÁS y no es el bot.
    if (isMentionedAtAll) {
        
        // El bot fue mencionado (detección oficial)
        let isBotMentioned = mentionedJidSafe.includes(botJid);

        // Si se mencionó a ALGUIEN, pero la lista de menciones NO incluye al bot,
        // Y la mención NO es solo el JID del bot (para evitar falsos positivos).
        if (!isBotMentioned && !text.includes(`@${botNumber}`)) {
            
            // Verificamos si la primera mención en el texto es un JID diferente.
            const firstMentionMatch = text.match(/@(\d+)/);
            if (firstMentionMatch) {
                const mentionedJidNumber = firstMentionMatch[1];
                // Si el número mencionado no es el del bot, SALIMOS.
                if (mentionedJidNumber !== botNumber) {
                    return true; 
                }
            }
        }
        
        // Si la activación pasa los filtros anteriores (es decir, asume que es el bot), continuamos.

    } else {
        // Si no hay mención en absoluto, salimos.
        return true;
    }


    // --- El bot ha sido mencionado. Procedemos a limpiar la consulta. ---

    let query = text;

    // 1. Limpiamos las JIDs mencionadas en la lista.
    for (let jid of mentionedJidSafe) {
        query = query.replace(new RegExp(`@${jid.split('@')[0]}`, 'g'), '').trim();
    }
    
    // 2. Limpiamos cualquier rastro de @ al inicio (maneja el caso de JID oculta o no detectada)
    if (query.startsWith('@')) {
        query = query.replace(/^@\S+\s?/, '').trim();
    }
    
    let username = m.pushName || 'Usuario';

    if (query.length === 0) return false;

    let jijiPrompt = `Eres Jiji, un gato negro sarcástico y leal, como el de Kiki: Entregas a Domicilio. Responde a ${username}: ${query}. 
    
    nota: si vas a resaltar un texto solo usas un * en cada esquina no **.`;

    try {
        conn.sendPresenceUpdate('composing', m.chat);

        const url = `${POLLINATIONS_BASE_URL}/${encodeURIComponent(jijiPrompt)}`;

        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }

        let result = await res.text();

        if (result && result.trim().length > 0) {
            
            result = result.replace(/\*\*(.*?)\*\*/g, '*$1*').trim(); 
            
            result = result.replace(/([.?!])\s*/g, '$1\n\n').trim();

            await conn.reply(m.chat, result, m);
            await conn.readMessages([m.key]);
        } else {
            await conn.reply(m.chat, `🐱 Hmph. La IA no tiene nada ingenioso que decir sobre *eso*.`, m);
        }
    } catch (e) {
        await conn.reply(m.chat, '⚠️ ¡Rayos! No puedo contactar con la nube de la IA. Parece que mis antenas felinas están fallando temporalmente.', m);
    }

    return false;
}
