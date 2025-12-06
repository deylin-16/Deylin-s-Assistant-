import { WAMessageStubType } from '@whiskeysockets/baileys'

export async function before(m, { conn }) {
    if (!m.messageStubType || !m.isGroup) return
    
    // Nos enfocamos solo en el evento que sabemos que se dispara: 27 (ADD)
    const isAdd = m.messageStubType == 27 
    
    if (isAdd) {
        
        const who = m.messageStubParameters?.[0]
        const paramsList = JSON.stringify(m.messageStubParameters)

        const report = `🚨 *DIAGNÓSTICO DEL USUARIO APROBADO (COMUNIDAD)* 🚨
        
*Tipo de Evento Detectado:* GROUP_PARTICIPANT_ADD (27)
*Valor de 'who' (Parámetro [0]):* ${who || 'ERROR: No se detectó el JID'}
*Estructura Completa de Parámetros:* ${paramsList || 'N/A'}
        
⚠️ *Instrucción:* Por favor, copia el valor de '*Valor de 'who' (Parámetro [0]):*' y envíamelo. (Debería ser un número@s.whatsapp.net)`

        try {
            await conn.sendMessage(m.chat, { text: report })
        } catch (e) {
            console.error("ERROR AL ENVIAR REPORTE DE DIAGNÓSTICO (WHO):", e)
        }
    }
}
