import fetch from 'node-fetch';
import { sticker } from '../lib/sticker.js';

const GEMINI_API_KEY = 'AIzaSyD1V090ya1hDnW8ODQwdJ9RG5y8qK_Lmx0';
const MODEL_NAME = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;


let handler = m => m

handler.all = async function (m, { conn }) {
  // --- Inicialización y Filtrado Básico ---
  let user = global.db.data.users[m.sender]
  let chat = global.db.data.chats[m.chat]

  // Configuración de fkontak (Asegúrate de que 'kirito' esté definido globalmente)
  const res = await fetch(`${kirito}/media/images/87411733_k.jpg`);
  const thumb2 = Buffer.from(await res.arrayBuffer());
  const userJid = m.sender;

  const fkontak = {
    key: { fromMe: false, participant: userJid },
    message: {
      imageMessage: {
        mimetype: 'image/jpeg',
        caption: '𝗥𝗘𝗦𝗣𝗨𝗘𝗦𝗧𝗔 > 𝗕𝗢𝗧',
        jpegThumbnail: thumb2
      }
    }
  };

  m.isBot = m.id.startsWith('BAE5') && m.id.length === 16 
          || m.id.startsWith('3EB0') && (m.id.length === 12 || m.id.length === 20 || m.id.length === 22) 
          || m.id.startsWith('B24E') && m.id.length === 20
  if (m.isBot) return 
  
  // Excluye mensajes que tienen prefijos (comandos normales)
  let prefixRegex = new RegExp('^[' + (opts?.prefix || '‎z/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.,\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']')
  if (prefixRegex.test(m.text)) return true

  // --- Lógica de Activación por Mención ---
  const botJid = conn.user.jid;
  // Solo verifica si el bot fue mencionado
  let isMention = m.mentionedJid && m.mentionedJid.includes(botJid); 

  // Condición clave: Solo si el bot es mencionado (@)
  if (!isMention) return 

  // Si pasa la mención, extrae la consulta
  let query = m.text.replace(/@\d+/g, '').trim() || ''
  let username = m.pushName || 'Usuario'

  if (query.length === 0) return 

  await conn.sendPresenceUpdate('composing', m.chat)

  // System Instruction (Personalidad de Jiji)
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
      await conn.reply(m.chat, result, fkontak)
    } else {
      await conn.reply(m.chat, '🐱 Hmph. ¿Acaso me despertaste para preguntar *eso*? Sé más específico.', m)
    }
  } catch (e) {
    console.error(e)
    await conn.reply(m.chat, '⚠️ Ocurrió un error crítico al conectar con Gemini.', m)
  }

  return true
}

export default handler
