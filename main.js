import "./dict/mod.js";

import prepare from "./dict/utils/prepare.js";
import feature from "./feature.js";

let m_cache = new Map();

async function main() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState("./tmp");
        const { version } = await fetchLatestBaileysVersion();

        const socket = makeWASocket({
            version,
            auth: state,
            logger: new Pino({ level: "silent" }),
            browser: Browsers.windows("Edge"),
            keepAliveIntervalMs: 30_000,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: false,
            defaultQueryTimeoutMs: undefined
        });

        if (!state.creds.registered) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const code = await socket.requestPairingCode(config["bot.phone"].replace(/\D/g, ""));
            console.log(`Code: ${code.match(/.{1,4}/g)?.join("-")}`);
        }

        socket.ev.on("creds.update", saveCreds);

        socket.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
            if (connection === "close") {
                const disconnectCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = disconnectCode !== DisconnectReason.loggedOut;

                if (shouldReconnect) {
                    setTimeout(() => {
                        main();
                    }, 2000);
                }
            }
        });

        socket.ev.on("messages.upsert", async ({ messages }) => {
            for (const m of messages) {
                if (!m.message) continue;

                prepare(socket, m);

                if (config["autoread.status"] === "on" && m.jid === "status@broadcast") {
                    socket.readMessages([m.key]);
                }

                if (config["autoread.message"] === "on" && m.jid !== "status@broadcast") {
                    socket.readMessages([m.key]);
                }

                if (!m.fromMe && !m.jid.endsWith("@g.us")) {
                    m_cache.set(m.key.id, {
                        body: m.body,
                        msg: m,
                        image: m.isImage
                            ? await m.getBuffer()
                            : false
                    })
                }

                for (const [url] of m.body.matchAll(/https?:\/\/(?:vt|vm|www)?\.?tiktok\.com\/[^\s]+/gi)) {
                    try {
                        const { data } = await got.get(`https://tikwm.com/api/?url=${url}&hd=1`).json();

                        if (Array.isArray(data?.images) && data.images.length) {
                            for (const image of data.images) {
                                await m.reply_m({
                                    image: {
                                        url: image
                                    }
                                });
                            }
                            continue;
                        }

                        const video_url = data?.hdplay || data?.play;

                        if (video_url) {
                            await m.reply_m({
                                video: {
                                    url: video_url
                                },
                                mimeType: "video/mp4"
                            });
                        }
                    }

                    catch (e) {
                        m.reply(e.message);
                    }
                }

                feature(socket, m);
            }
        });

        socket.ev.on("messages.update", async updates => {
            await Promise.all(updates
                .filter(u => u.update.message === null)
                .map(async u => {
                    const cache = m_cache.get(u.key.id);
                    if (!cache) return;

                    if (cache.image) {
                        await socket.sendMessage(u.key.remoteJid, {
                            image: cache.image,
                            caption: cache.body || ""
                        }, { quoted: cache.msg });
                    } else if (cache.body && !cache.image) {
                        await socket.sendMessage(u.key.remoteJid,{ text: cache.body }, { quoted: cache.msg });
                    }
                })
            );
        });
    }

    catch (error) {
        console.log(`[ERROR][main.js]: ${error.message || error}`);
    }
}

main();