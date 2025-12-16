import fetch from "node-fetch";
import yts from "yt-search";
import Jimp from "jimp";
import axios from "axios";
// import crypto from "crypto"; // Ya no necesario, pero se deja el import si lo quieres usar después

async function resizeImage(buffer, size = 300) {
  const image = await Jimp.read(buffer);
  return image.resize(size, size).getBufferAsync(Jimp.MIME_JPEG);
}

// Se mantiene la funcionalidad básica de savetube para utilidades (isUrl, youtube id)
const utils = {
  isUrl: (str) => {
    try {
      new URL(str);
      return /youtube.com|youtu.be/.test(str);
    } catch (_) {
      return false;
    }
  },
  youtube: (url) => {
    const patterns = [
      /youtube.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtu.be\/([a-zA-Z0-9_-]{11})/
    ];
    for (let pattern of patterns) {
      if (pattern.test(url)) return url.match(pattern)?.[1] || null;
    }
    return null;
  }
};


const handler = async (m, { conn, text, command, usedPrefix }) => {
  await m.react("🔎");
  if (!text?.trim()) {
    return conn.reply(m.chat, "Dame el link de YouTube, el nombre de la canción/video, o un término de búsqueda para Audius.", m);
  }

  // --- Lógica de Audius (Nuevo) ---
  if (command === 'audius') {
    await m.react("🎵");
    
    const audiusOptions = {
      method: 'GET',
      // Codifica el texto para que sea seguro en la URL
      url: `https://discoveryprovider.audius.co/v1/users/search?query=${encodeURIComponent(text.trim())}&app_name=WHATSAPP_BOT`,
    };

    try {
      const response = await axios.request(audiusOptions);
      
      const users = response.data?.data;

      if (!users || users.length === 0) {
        return m.reply(`❌ No se encontraron usuarios en Audius para la búsqueda: **${text}**`);
      }

      // Construye el mensaje con la información de los primeros usuarios
      let msg = `✅ **Resultados de Usuarios de Audius** (Búsqueda: ${text})\n\n`;
      
      users.slice(0, 5).forEach((user, index) => {
        msg += `*${index + 1}. ${user.name || user.handle}* (@${user.handle})\n`;
        msg += `   Seguidores: ${user.follower_count?.toLocaleString() || 0}\n`;
        msg += `   ID: ${user.id}\n`;
        msg += `   Bio: ${user.bio ? user.bio.substring(0, 50) + '...' : 'N/A'}\n\n`;
      });
      
      return conn.reply(m.chat, msg, m);

    } catch (error) {
      console.error("❌ Error en la API de Audius:", error.response?.data || error.message);
      return m.reply(`❌ Ocurrió un error al buscar en Audius: ${error.message}`);
    }
    
  } 
  
  // --- Lógica de YouTube/CoolGuruji (Existente) ---
  else if (["mp3", "play"].includes(command)) {
    
    let url, title, thumbnail, author, vistas, timestamp, ago, videoId;

    if (utils.isUrl(text)) {
      videoId = utils.youtube(text);
      if (!videoId) return m.reply("❌ No se pudo obtener el ID del video de la URL.");
      
      const search = await yts({ videoId: videoId });
      url = text;
      title = search.title || "Desconocido";
      thumbnail = search.thumbnail;
      author = search.author;
      vistas = search.views?.toLocaleString?.() || "Desconocido";
      timestamp = search.timestamp;
      ago = search.ago;
    } else {
      const search = await yts.search({ query: text, pages: 1 });
      if (!search.videos.length) return m.reply("❌ No se encontró nada con ese nombre.");
      const videoInfo = search.videos[0];
      url = videoInfo.url;
      videoId = utils.youtube(url);
      if (!videoId) return m.reply("❌ No se pudo obtener el ID del video de la búsqueda.");
      
      title = videoInfo.title;
      thumbnail = videoInfo.thumbnail;
      author = videoInfo.author;
      vistas = videoInfo.views?.toLocaleString?.() || "Desconocido";
      timestamp = videoInfo.timestamp;
      ago = videoInfo.ago;
    }

    const thumbResized = await resizeImage(await (await fetch(thumbnail)).buffer(), 300);

    await m.react("🎧");
    
    const options = {
      method: 'GET',
      url: 'https://coolguruji-youtube-to-mp3-download-v1.p.rapidapi.com/',
      params: { id: videoId },
      headers: {
          'x-rapidapi-key': 'TU_CLAVE_DE_RAPIDAPI_AQUÍ', // ¡REEMPLAZAR!
          'x-rapidapi-host': 'coolguruji-youtube-to-mp3-download-v1.p.rapidapi.com'
      }
    };
    
    let dlUrl;
    try {
      const response = await axios.request(options);
      
      dlUrl = response.data.link || response.data.downloadUrl; 
      
      if (!dlUrl) {
          return m.reply("❌ La API de descarga no devolvió un enlace MP3.");
      }
    } catch (error) {
      console.error("❌ Error en RapidAPI:", error.response?.data || error.message);
      return m.reply(`❌ Error al obtener el MP3: ${error.message}`);
    }

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: dlUrl },
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`,
        contextInfo: {
            externalAdReply: {
              title: title,
              body: `${author.name} | ${ago}`,
              mediaType: 2, 
              previewType: 'PHOTO', 
              thumbnail: thumbResized, 
              sourceUrl: url,
            }
        }
      },
      { quoted: m }
    );
  }
};

handler.command = ['mp3', 'play', 'audius']; // Agregamos 'audius' al array de comandos
handler.rowner = true;

export default handler;
