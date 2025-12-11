import { watchFile, unwatchFile } from 'fs' 
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import fs from 'fs'
import cheerio from 'cheerio'
import fetch from 'node-fetch'
import axios from 'axios'
import moment from 'moment-timezone' 


global.owner = [
  [ '50432955554', 'Eliac', true ]
]; 

global.cheerio = cheerio
global.fs = fs
global.fetch = fetch
global.axios = axios
global.moment = moment 

let Names = [
    'ᴊɪᴊɪ - ᴀssɪsᴛᴀɴᴛ', 
    '𝕵𝖎𝖏𝖎 - 𝕬𝖘𝖘𝖎𝖘𝖙𝖆𝖓𝖙', 
    '🄹🄸🄹🄸 - 🄰🅂🅂🄸🅂🅃🄰🄽🅃', 
    '𝒥𝒾𝒿𝒾 - 𝒜𝓈𝓈𝒾𝓈𝓉𝒶𝓃𝓉', 
    '🅹🅸🅹🅸 - 🄰🅂🅂🄸🅂🅃🄰🅽🆃', 
    '𝐉𝐢𝐣𝐢 - 𝐀𝐬𝐬𝐢𝐬𝐭𝐚𝐧𝐭', 
    'Ⓙⓘⓙⓘ - Ⓐⓢⓢⓘⓢⓣⓐⓝⓣ', 
    '𝙹𝙸𝙹𝙸 - 𝙰𝚂𝚂𝙸𝚂𝚃𝙰𝙽𝚃', 
    '¡ſıſı - ʇuɐʇsıssɐ', 
    'J I J I - A S S I S T A N T', 
];

let randomIndex = Math.floor(Math.random() * Names.length);
global.bot = Names[randomIndex];

  





let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  import(`${file}?update=${Date.now()}`)
})
