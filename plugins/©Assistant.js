import fetch from 'node-fetch';
import { sticker } from '../lib/sticker.js';

const GEMINI_API_KEY = 'AIzaSyD1V090ya1hDnW8ODQwdJ9RG5y8qK_Lmx0';
const MODEL_NAME = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;


let handler = m => m

handler.all = async function (m, { conn }) {

  if (!conn.user) return
  
  m.isBot = m.id.startsWith('BAE5') && m.id.length === 16 
          || m.id.startsWith('3EB0') && (m.id.length === 12 || m.id.length === 20 || m.id.length === 22) 
          || m.id.startsWith('B24E') && m.id.length === 20
  if (m.isBot) return 
  
  let prefixRegex = new RegExp('^[' + (opts?.prefix || '‎z/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.,\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']')
  if (prefixRegex.test(m.text)) return true

  const botJid = conn.user.jid;
  const botNumber = botJid.split('@')[0];
  
  let isMentionByText = m.text && new RegExp(`@${botNumber}`, 'g').test(m.text);
  let isMentionByJid = m.mentionedJid && m.mentionedJid.includes(botJid);

  if (!isMentionByText && !isMentionByJid) return 

  let query = m.text.replace(new RegExp(`@${botNumber}`, 'g'), '').trim() || ''
  query = query.replace(/@\w+\s?/, '').trim() || ''
  let username = m.pushName || 'Usuario'

  if (query.length === 0) return 

  await conn.sendPresenceUpdate('composing', m.chat)

  // -----------------------------------------------------------
  // PRUEBA DE RESPUESTA PREDEFINIDA SIN API DE GEMINI
  // -----------------------------------------------------------
  if (query.toLowerCase().includes('hola')) {
      await conn.reply(m.chat, `¡Hmph, ${username}! Te he oído. Prueba de mención exitosa.`, m)
      return true
  } else {
      await conn.reply(m.chat, `¡Gato detectado! Escribiste: "${query}". Prueba de mención OK, pero necesito que digas 'Hola' para confirmar la respuesta predefinida.`, m)
      return true
  }
  // -----------------------------------------------------------
  
}

export default handler
