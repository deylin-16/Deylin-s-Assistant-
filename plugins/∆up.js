import { execSync } from 'child_process';

let handler = async (m, { conn, args }) => { 
    try { 
      //  await conn.reply(m.chat, '⏳ Actualizando el bot, por favor espere...', m);

        const output = execSync('git pull' + (args.length ? ' ' + args.join(' ') : '')).toString();
        let response = output.includes('Already up to date') 
            ? ' Sistema ya está actualizado.' 
            : ` Cambió reciente \n\n\n${output}`;

        await conn.reply(m.chat, response, m);

    } catch (error) { 
        try { 
            const status = execSync('git status --porcelain').toString().trim(); 
            if (status) { 
                const conflictedFiles = status.split('\n').filter(line => 
                    !line.includes('botSession/') && 
                    !line.includes('.cache/') && 
                    !line.includes('tmp/')
                ); 

                if (conflictedFiles.length > 0) { 
                    const conflictMsg = `⚠️ Conflictos detectados en los siguientes archivos:\n\n` +
                        conflictedFiles.map(f => '• ' + f.slice(3)).join('\n') +
                        `\n\n🔹 Para solucionar esto, reinstala el bot o actualiza manualmente.`;

                    return await conn.reply(m.chat, conflictMsg, m); 
                } 
            } 
        } catch (statusError) { 
            console.error(statusError); 
        }

        await conn.reply(m.chat, `❌ Error al actualizar: ${error.message || 'Error desconocido.'}`, m);
    } 
};

handler.command = ['π']

handler.rowner = true;

export default handler;