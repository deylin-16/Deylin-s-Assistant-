import { WAMessageStubType } from '@whiskeysockets/baileys'

export async function before(m, { conn }) {
    if (!m.messageStubType || !m.isGroup) return
    const who = m.messageStubParameters?.[0]
    if (!who) return

    const chat = global.db?.data?.chats?.[m.chat] || {}

    // Detección de Eventos: Incluye Adición Directa (ADD) y Aprobación/Unión (JOIN)
    const isWelcomeEvent = m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_ADD || 
                           m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_JOIN;
                           
    // CONDICIÓN FORZADA: Si se detecta el evento de entrada, ¡ejecutar la bienvenida!
    if (isWelcomeEvent) {

        const mentionListText = `@${who.split("@")[0]}` 
        // Usamos el mensaje personalizado si existe, si no, uno simple.
        let welcomeText = chat.customWelcome || "Bienvenido/a al grupo. Ahora solo enviamos texto."
        
        welcomeText = welcomeText.replace(/\\n/g, '\n')
        let finalCaption = welcomeText.replace(/@user/g, mentionListText) 

        try {
            const messageOptions = {
                mentions: [who]
            }

            // Solo enviamos el texto (resolviendo el error de imagen)
            messageOptions.text = finalCaption

            await conn.sendMessage(m.chat, messageOptions)

        } catch (e) {
            
            // Reporte de error al chat si falla el envío
            const errorMsg = `❌ FALLO AL ENVIAR BIENVENIDA:\nError: ${e.name}: ${e.message}\nVerifica permisos de Admin.`
            
            console.error("ERROR AL ENVIAR BIENVENIDA:", e)
            
            try {
                await conn.sendMessage(m.chat, { text: errorMsg })
            } catch (errorReportingFailed) {
                console.error("FATAL: Falló el envío del mensaje de bienvenida Y el reporte de error.", errorReportingFailed)
            }
        }
    }
}
