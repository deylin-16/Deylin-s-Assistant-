import { createHash } from 'crypto';  
import fetch from 'node-fetch';

const handler = async (m, { conn, usedPrefix, command, args, isOwner, isAdmin, isROwner }) => {
  let chat = global.db.data.chats[m.chat];
  let user = global.db.data.users[m.sender];
  let bot = global.db.data.settings[conn.user.jid] || {};
  let type = command.toLowerCase();
  let isAll = false, isUser = false;
  let isEnable = false;

  switch (type) {
    case 'welcome':
    case 'bv':
    case 'bienvenida':
      if (!m.isGroup) {
       if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      } else if (!isAdmin) {
        global.dfail('admin', m, conn);
        throw false;
      }
      isEnable = chat.welcome = !chat.welcome;
      break;

    case 'antiprivado':
    case 'antipriv':
    case 'antiprivate':
      isAll = true;
      if (!isOwner) {
        global.dfail('rowner', m, conn);
        throw false;
      }
      isEnable = bot.antiPrivate = !bot.antiPrivate;
      break;

    case 'antibot':
    case 'antibots':
      if (m.isGroup) {
        if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      isEnable = chat.antiBot = !chat.antiBot;
      break;

    case 'autoaceptar':
    case 'aceptarauto':
      if (m.isGroup) {
        if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      isEnable = chat.autoAceptar = !chat.autoAceptar;
      break;

    case 'autorechazar':
    case 'rechazarauto':
      if (m.isGroup) {
        if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      isEnable = chat.autoRechazar = !chat.autoRechazar;
      break;

    case 'autoresponder2':
    case 'ar2':
    case 'autorespond2':
      if (!m.isGroup) {
        if (!isOwner) {
          global.dfail('group', m, conn);
          throw false;
        }
      } else if (!isAdmin) {
        global.dfail('admin', m, conn);
        throw false;
      }
      isEnable = chat.autoresponder2 = !chat.autoresponder2;
      break;

    case 'autoresponder':
    case 'autorespond':
      if (!m.isGroup) {
        if (!isOwner) {
          global.dfail('group', m, conn);
          throw false;
        }
      } else if (!isAdmin) {
        global.dfail('admin', m, conn);
        throw false;
      }
      isEnable = chat.autoresponder = !chat.autoresponder;
      break;

    case 'modoadmin':
    case 'soloadmin':
      if (m.isGroup) {
        if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      isEnable = chat.modoadmin = !chat.modoadmin;
      break;

    case 'nsfw':
    case 'nsfwhot':
    case 'nsfwhorny':
      if (!m.isGroup) {
        if (!isOwner) {
          global.dfail('group', m, conn);
          throw false;
        }
      } else if (!isAdmin) {
        global.dfail('admin', m, conn);
        throw false;
      }
      isEnable = chat.nsfw = !chat.nsfw;
      break;

    case 'antidelete': 
    case 'antieliminar': 
    case 'delete':
      if (m.isGroup) {
        if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      isEnable = chat.delete = !chat.delete;
      break;


    case 'detect':
    case 'configuraciones':
    case 'avisodegp':
      if (!m.isGroup) {
        if (!isOwner) {
          global.dfail('group', m, conn);
          throw false;
        }
      } else if (!isAdmin) {
        global.dfail('admin', m, conn);
        throw false;
      }
      isEnable = chat.detect = !chat.detect;
      break;

    case 'antilink':
      if (m.isGroup) {
        if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      isEnable = chat.antiLink = !chat.antiLink;
      break;
        case 'antidelete': 

      case 'justbot':
      case 'solonumero':
        isAll = true;
        if (!isOwner) {
          global.dfail('owner', m, conn);
          throw false;
        }
        if (!bot.soloParaJid) {
          bot.soloParaJid = m.sender;
          isEnable = true;
        } else {
          bot.soloParaJid = false;
          isEnable = false;
        }
        break;
  }

  conn.reply(m.chat, `${emoji} La función *${type}* se *${isEnable ? 'activó' : 'desactivó'}* ${isAll ? 'para este Bot' : isUser ? '' : 'para este chat'}`, m, rcanal);
};

handler.help = [
  'welcome', 'bv', 'bienvenida',
  'antiprivado', 'antipriv', 'antiprivate',
  'antibot', 'antibots',
  'autoaceptar', 'aceptarauto',
  'autorechazar', 'rechazarauto',
  'autoresponder', 'autorespond',
  'autoresponder2', 'autorespond2', 'ar2',
  'modoadmin', 'soloadmin',
  'nsfw', 'nsfwhot', 'nsfwhorny',
  'antidelete', 'antieliminar', 'delete',
  'jadibotmd', 'modejadibot',
  'detect', 'configuraciones', 'avisodegp',
  'antilink',
  'justbot', 'solonumero'
]

handler.tags = ['nable']

handler.command = [
  'welcome', 'bv', 'bienvenida',
  'antiprivado', 'antipriv', 'antiprivate',
  'antibot', 'antibots',
  'autoaceptar', 'aceptarauto',
  'autorechazar', 'rechazarauto',
  'autoresponder', 'autorespond',
  'autoresponder2', 'autorespond2', 'ar2',
  'modoadmin', 'soloadmin',
  'nsfw', 'nsfwhot', 'nsfwhorny',
  'antidelete', 'antieliminar', 'delete',
  'jadibotmd', 'modejadibot',
  'detect', 'configuraciones', 'avisodegp',
  'antilink',
  'justbot', 'solonumero'
]
export default handler
