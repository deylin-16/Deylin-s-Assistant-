import { WAMessageStubType } from '@whiskeysockets/baileys'

async function sendBatchedWelcome(conn, jid) {
    const batch = conn.welcomeBatch[jid]
    if (!batch || batch.users.length === 0) return

    clearTimeout(batch.timer)

    const users = batch.users
    const chat = global.db?.data?.chats?.[jid] || {}

    let ppGroup = null
    try {
        ppGroup = await conn.profilePictureUrl(jid, 'image')
    } catch (e) {
        
    }

    const mentionListText = users.map(jid => `@${jid.split("@")[0]}`).join(', ')

    let welcomeText = chat.customWelcome || "bienvenido al grupo @user"

    welcomeText = welcomeText.replace(/\\n/g, '\n')
    
    let finalCaption = welcomeText.replace(/@user/g, mentionListText) 

    try {
        const messageOptions = {
            mentions: users
        }

        // SOLUCIÓN AL ERROR DE IMAGEN: Solo se intenta enviar como imagen si tenemos una URL válida.
        if (typeof ppGroup === 'string' && ppGroup.length > 0) {
            messageOptions.image = { url: ppGroup }
            messageOptions.caption = finalCaption
        } else {
            // Se envía solo como texto si la foto de perfil no existe o no se pudo obtener.
            messageOptions.text = finalCaption
        }

        await conn.sendMessage(jid, messageOptions)

    } catch (e) {
        console.error("ERROR AL ENVIAR BIENVENIDA (VERIFICAR PERMISOS DEL BOT O FALLA DE CONEXIÓN):", e)
    }

    delete conn.welcomeBatch[jid]
}


export async function before(m, { conn }) {
    if (!m.messageStubType || !m.isGroup) return
    const who = m.messageStubParameters?.[0]
    if (!who) return

    const chat = global.db?.data?.chats?.[m.chat] || {}

    // DETECCIÓN DE EVENTOS: Incluye el evento de adición y el de unión/aprobación.
    const isWelcomeEvent = m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_ADD || 
                           m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_JOIN;
                           
    // La bienvenida está activa a menos que se haya desactivado explícitamente.
    if (isWelcomeEvent && chat.welcome !== false) {

        conn.welcomeBatch = conn.welcomeBatch || {}
        const jid = m.chat

        if (!conn.welcomeBatch[jid]) {
            conn.welcomeBatch[jid] = { users: [], timer: null }
        }

        if (conn.welcomeBatch[jid].timer) {
            clearTimeout(conn.welcomeBatch[jid].timer)
        }

        if (!conn.welcomeBatch[jid].users.includes(who)) {
            conn.welcomeBatch[jid].users.push(who)
        }

        conn.welcomeBatch[jid].timer = setTimeout(() => {
            sendBatchedWelcome(conn, jid)
        }, 5000)

    }
}
