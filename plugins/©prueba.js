import { WAMessageStubType } from '@whiskeysockets/baileys'

export async function before(m, { conn, participants, groupMetadata }) {
    if (!m.messageStubType || !m.isGroup) return
    
    const who = m.messageStubParameters?.[0]
    if (!who) return

    // **** CORRECCIÓN CRÍTICA DE JID PARA COMUNIDADES ****
    let fixedWho = who;
    if (fixedWho.endsWith('@lid')) {
        fixedWho = fixedWho.replace('@lid', '@s.whatsapp.net');
    }
    // **************************************************

    let img = 'https://i.ibb.co/Psj3rJmR/Texto-del-p-rrafo-20251206-140954-0000.png'
    const chat = global.db?.data?.chats?.[m.chat] || {}

    const isAdd = m.messageStubType == 27
    const isJoin = m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_JOIN
    
    if (chat.welcome && (isAdd || isJoin)) {

        let ppGroup = null 
        try {
            ppGroup = await conn.profilePictureUrl(m.chat, 'image')
        } catch (e) {
            
        }

        const mentionListText = `@${fixedWho.split("@")[0]}` 
        
        let welcomeText = chat.customWelcome || "hola bienvenido @user"
        
        welcomeText = welcomeText.replace(/\\n/g, '\n')
        let finalCaption = welcomeText.replace(/@user/g, mentionListText) 

        try {
            const messageOptions = {
                // Usamos la JID corregida para la mención
                mentions: [fixedWho] 
            }

            if (typeof ppGroup === 'string' && ppGroup.length > 0) {
                 messageOptions.image = { url: ppGroup }
                 messageOptions.caption = finalCaption
            } else {
                 messageOptions.image = { url: img }
                 messageOptions.caption = finalCaption
            }

            await conn.sendMessage(m.chat, messageOptions)

        } catch (e) {
            
            const errorMsg = `❌ FALLO AL ENVIAR BIENVENIDA:\nError: ${e.name}: ${e.message}\nVerifica que el bot sea Administrador.`
            
            console.error("ERROR AL ENVIAR BIENVENIDA:", e)
            
            try {
                await conn.sendMessage(m.chat, { text: errorMsg })
            } catch (errorReportingFailed) {
                console.error("FATAL: Falló el envío del mensaje de bienvenida Y el reporte de error.", errorReportingFailed)
            }
        }
    }
}
