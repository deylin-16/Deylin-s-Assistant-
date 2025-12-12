import fetch from 'node-fetch';
import { sticker } from '../lib/sticker.js';

const POLLINATIONS_BASE_URL = 'https://text.pollinations.ai';

export async function before(m, { conn }) {
    if (!conn.user) return true;
    
    // Preparación de variables de mensaje
    let user = global.db.data.users[m.sender];
    let chat = global.db.data.chats[m.chat];
    
    // Detección de JIDs seguras para evitar errores de propiedad
    let mentionedJidSafe = Array.isArray(m.mentionedJid) ? m.mentionedJid : [];
    
    let botJid = conn.user.jid;
    let botNumber = botJid.split('@')[0];
    let text = m.text || '';
    
    // ----------------------------------------------------------------
    // VERIFICACIÓN CRÍTICA: DOBLE DETECCIÓN DE MENCIÓN
    // ----------------------------------------------------------------
    // 1. Detección oficial (usando mentionedJidSafe.includes)
    // 2. Detección de texto (buscando el número del bot en el texto del mensaje)
    
    let isBotExplicitlyMentioned = mentionedJidSafe.includes(botJid) || text.includes(`@${botNumber}`);

    // Si no está mencionado explícitamente, no hacemos nada y salimos.
    if (!isBotExplicitlyMentioned) {
        return true;
    }
    
    // El bot ha sido mencionado, procedemos a limpiar la consulta.
    let query = text.replace(new RegExp(`@${botNumber}`, 'g'), '').trim() || ''
    query = query.replace(/@\w+\s?/, '').trim() || ''
    let username = m.pushName || 'Usuario'

    // FILTRO FINAL: Evitar peticiones vacías
    if (query.length === 0) return false;

    // Ejecución de la IA
    let jijiPrompt = `Eres Jiji, un gato negro sarcástico y leal, como el de Kiki: Entregas a Domicilio. Responde a ${username}: ${query}`;

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
        // En lugar de console.error, usamos reply para saber qué pasó
        await conn.reply(m.chat, '⚠️ ¡Rayos! No puedo contactar con la nube de la IA. Parece que mis antenas felinas están fallando temporalmente.', m);
    }

    // Detenemos la ejecución de otros comandos/plugins
    return false;
}
