import { WAMessageStubType } from '@whiskeysockets/baileys'
import fetch from 'node-fetch'

export async function before(m, { conn, participants, groupMetadata }) {
    let botSettings = global.db.data.settings[conn.user.jid] || {}
    if (botSettings.soloParaJid) return
    if (!m.messageStubType || !m.isGroup) return true

    const who = m.messageStubParameters?.[0]
    if (!who) return

    if (m.messageStubType !== WAMessageStubType.GROUP_PARTICIPANT_ADD) return

    const chat = global.db.data.chats[m.chat]
    if (!chat?.welcome || !chat?.customWelcome) return

    const totalMembers = participants.length
    const user = participants.find(p => p.jid === who)
    const mentionListText = `@${who.split('@')[0]}`

    let ppUrl
    const defaultPp = 'https://i.ibb.co/jPSF32Pz/9005bfa156f1f56fb2ac661101d748a5.jpg'

    try {
        ppUrl = await conn.profilePictureUrl(who, 'image')
    } catch {
        ppUrl = defaultPp
    }

    const welcomeText = chat.customWelcome
    let finalCaption = welcomeText.replace(/\\n/g, '\n').replace(/@user/g, mentionListText).trim()

    const jid = m.chat
    const mentionId = who ? [who] : []
    
    let thumbnailBuffer
    try {
        const res = await fetch(ppUrl)
        thumbnailBuffer = await res.buffer()
    } catch {
        const defaultRes = await fetch(defaultPp)
        thumbnailBuffer = await defaultRes.buffer()
    }

    const fullText = `*¡BIENVENIDO!* Ahora somos ${totalMembers} miembros.\n\n` + finalCaption

    await conn.sendMessage(jid, {
        text: fullText,
        contextInfo: {
            mentionedJid: mentionId,
            externalAdReply: {
                title: `¡BIENVENIDO!`,
                body: `Total de miembros: ${totalMembers}`,
                mediaType: 1,
                mediaUrl: ppUrl, 
                sourceUrl: 'https://whatsapp.com', 
                thumbnail: thumbnailBuffer,
                showAdAttribution: false,
                containsAutoReply: true,
                renderLargerThumbnail: true
            }
        }
    }, {
        quoted: null
    })
}
