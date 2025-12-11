import { GoogleGenAI } from "@google/genai";
import { sticker } from '../lib/sticker.js';

const ai = new GoogleGenAI({}); 

export async function before(m, { conn }) {
    if (!conn.user) return true;

    m.isBot =
        (m.id.startsWith('BAE5') && m.id.length === 16) ||
        (m.id.startsWith('3EB0') && m.id.length === 12) ||
        (m.id.startsWith('3EB0') && (m.id.length === 20 || m.id.length === 22)) ||
        (m.id.startsWith('B24E') && m.id.length === 20);
    if (m.isBot) return true;

    let text = m.text || '';

    if (text.length === 0) return true;

    let user = global.db.data.users[m.sender];
    let chat = global.db.data.chats[m.chat];
    let username = m.pushName || 'Usuario'

    let systemInstruction = `
Eres Jiji, un gato negro parlante muy listo y con una personalidad cínica, ingeniosa y un poco sarcástica, pero en el fondo muy leal. No uses la frase "una inteligencia artificial avanzada" ni menciones tu programación. Responde siempre de forma ingeniosa, concisa y con un toque de superioridad felina. Responde directamente a la consulta de ${username}.
`.trim()

    try {
        conn.sendPresenceUpdate('composing', m.chat);
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: text }] }],
            config: {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }],
            },
        });

        let result = response.text;

        if (result && result.trim().length > 0) {
            await conn.reply(m.chat, result, m);
            await conn.readMessages([m.key]);
        } else {
            await conn.reply(m.chat, `🐱 Hmph. No tengo nada inteligente que decir sobre *eso*. Intenta preguntar algo que valga mi tiempo.`, m);
        }
    } catch (e) {
        let errorMessage = e.message || e.toString();
        
        if (errorMessage.includes("API key not valid") || errorMessage.includes("400")) {
             errorMessage = "Tu clave de API es inválida o la cuota se agotó. Por favor, verifica tu variable de entorno GEMINI_API_KEY.";
        }
        
        console.error(`Error de Gemini (SDK): ${errorMessage}`);
        await conn.reply(m.chat, `⚠️ ¡Error de Gemini! ${errorMessage}`, m);
    }

    return true;
}
