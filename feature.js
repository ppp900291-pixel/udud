import "./dict/mod.js";

const themes = [
    "white", "black", "charcoal", "slate",
    "ice", "brat", "neon", "lime",
    "mint", "crimson", "coral", "ruby",
    "maroon", "rose", "pink", "bubblegum",
    "peach", "lavender", "purple", "grape", 
    "indigo", "midnight", "navy", "sky",
    "cyan", "teal", "forest", "emerald",
    "olive", "orange", "amber", "gold",
    "chocolate", "coffee", "sand"
];

export default async function feature(socket, m) {
    try {
        if (["rvo", "pret", "dor"].some(v => m.body.includes(v))) {
            if (!m.fromMe || !m.isQuoted || !m.isMedia) return;

            const buffer = await m.getBuffer();

            await m.reply_m({
                [m.type]: buffer,
                mimetype: m.media.mimetype,
                caption: m.media.caption || undefined
            });
        }

        if (!(config["prefix.cmd"].some(v => m.body.startsWith(v)))) return;

        switch (m.command) {
            case "menu":
            case "help": {
                const name = m.pushName || "User";
                const botName = config["bot.name"];

                const menu = [
                    `╭━━━〔 *${botName}* 〕━━━╮`,
                    `┃  Hello, *${name}* 👋`,
                    `┃  Welcome to *${botName}*`,
                    `┃`,
                    `┣━━〔 *MEDIA* 〕`,
                    `┃  › .toimg`,
                    `┃  › .scanqr`,
                    `┃  › .ocr`,
                    `┃  › .sticker`,
                    `┃  › .brat`,
                    `┃  › .bratvid`,
                    `┃  › .watermark`,
                    `┃`,
                    `┣━━〔 *UTILITY* 〕`,
                    `┃  › .jid`,
                    `┃  › .translate`,
                    `┃`,
                    `┣━━〔 *DOWNLOADER* 〕`,
                    `┃  › .tiktok`,
                    `┃  › .facebook`,
                    `┃`,
                    `╰━━━━━━━━━━━━━━━━━━╯\n`,
                    `  ◦ Prefix  : ${config["prefix.cmd"][0]}`,
                    `  ◦ Status  : Online`,
                    `  ◦ User    : ${name}`
                ].join("\n");

                m.reply(menu);
                break;
            }

            case "jid": {
                if (!m.text?.trim()) {
                    return m.reply(
                        "Usage:\n" +
                        ".jid 628123456789\n" +
                        ".jid https://wa.me/628123456789\n" +
                        ".jid https://chat.whatsapp.com/xxxx"
                    );
                }

                const input = m.text.trim();

                try {
                    let number = input
                        .replace(/^https?:\/\/wa\.me\//i, "")
                        .replace(/[^\d]/g, "");

                    if (/^\d{8,15}$/.test(number)) {
                        const jid = `${number}@s.whatsapp.net`;

                        return m.reply(
                            `╭─〔 *JID INFO* 〕\n` +
                            `│\n` +
                            `│  Type   : *PRIVATE*\n` +
                            `│  Number : *+${number}*\n` +
                            `│  JID    : \`${jid}\`\n` +
                            `│\n` +
                            `╰──────────────`
                        );
                    }

                    if (/chat\.whatsapp\.com\//i.test(input)) {
                        const code = input.split("chat.whatsapp.com/")[1]?.split(/[?#\s]/)[0];

                        if (!code) return m.reply("Invite link grup tidak valid.");

                        const metadata = await socket.groupGetInviteInfo(code);

                        return m.reply(
                            `╭─〔 *JID INFO* 〕\n` +
                            `│\n` +
                            `│  Type  : *GROUP*\n` +
                            `│  Name  : *${metadata.subject || "-"}*\n` +
                            `│  Owner : ${metadata.owner || "-"}\n` +
                            `│  JID   : \`${metadata.id}\`\n` +
                            `│\n` +
                            `╰──────────────`
                        );
                    }

                    return m.reply(
                        "Input tidak dikenali.\n\n" +
                        "Contoh:\n" +
                        "• `.jid 628123456789`\n" +
                        "• `.jid https://wa.me/628123456789`\n" +
                        "• `.jid https://chat.whatsapp.com/xxxx`"
                    );
                } catch (error) {
                    return m.reply(
                        `Gagal mendapatkan JID.\n\n` +
                        `Error: ${error.message}`
                    );
                }

                break;
            }

            case "qrcsan":
            case "scanqr": {
                if (!(m.isImage || m.isSticker)) return m.reply("Reply to image/sticker");

                const buffer = await m.getBuffer();

                const { data, info } = await sharp(buffer)
                    .ensureAlpha()
                    .raw()
                    .toBuffer({ resolveWithObject: true });

                const qr = jsQR(
                    new Uint8ClampedArray(data),
                    info.width,
                    info.height,
                    { inversionAttempts: "attemptBoth" }
                );

                if (!qr?.data) return m.reply("QR code not found");

                await m.reply(qr.data);

                break;
            }

            case "s2img":
            case "toimg": {
                if (!m.isSticker) return m.reply("Reply to sticker");

                const image = await sharp(await m.getBuffer())
                    .png()
                    .toBuffer();

                await m.reply_m({
                    image,
                    mimetype: "image/png"
                });

                break;
            }

            case "watermark":
            case "wm": {
                if (!m.text && !m.isImage) return m.reply("Balas gambar dengan `/wm Anton`");
                if (m.text.length >= 13) return m.reply("Text tidak boleh lebih dari 13 karakter");

                const image = sharp(await m.getBuffer());

                const { width, height } = await image.metadata();

                if (!width || !height) {
                    return m.reply("Gagal membaca ukuran gambar");
                }

                const fontSize = Math.max(24, Math.round(Math.min(width, height) * 0.045));
                const estimatedTextWidth = m.text.length * fontSize * 0.58;

                const gapX = fontSize * 1.5;
                const gapY = fontSize * 1.5;

                const spacingX = estimatedTextWidth + gapX;
                const spacingY = fontSize + gapY;

                const extra = Math.ceil(Math.hypot(width, height));

                let texts = "";

                for (let y = -extra; y <= height + extra; y += spacingY) {
                    for (let x = -extra; x <= width + extra; x += spacingX) {
                        texts += `
                            <text
                                x="${x}"
                                y="${y}"
                                font-family="Arial, Helvetica, sans-serif"
                                font-size="${fontSize}px"
                                font-weight="700"
                                letter-spacing="-0.5"
                                fill="#FFFFFF"
                                fill-opacity="0.16"
                                stroke="#000000"
                                stroke-opacity="0.10"
                                stroke-width="0.8"
                                text-anchor="middle"
                                dominant-baseline="middle"
                                filter="url(#shadow)"
                            >${m.text}</text>
                        `;
                    }
                }

                const svg = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                        <defs>
                            <filter
                                id="shadow"
                                x="-20%"
                                y="-20%"
                                width="140%"
                                height="140%"
                            >
                                <feDropShadow
                                    dx="0.8"
                                    dy="0.8"
                                    stdDeviation="1"
                                    flood-color="#000000"
                                    flood-opacity="0.35"
                                />
                            </filter>
            
                        </defs>
                        <g transform="translate(${width / 2} ${height / 2}) rotate(-30) translate(${-width / 2} ${-height / 2})">
                            ${texts}
                        </g>
                    </svg>
                `;

                const image_buffer = await image
                    .composite([{
                        input: Buffer.from(svg),
                        left: 0,
                        top: 0
                    }])
                    .png()
                    .toBuffer();

                await m.reply_m({ image: image_buffer });
                break;
            }

            case "ocr": {
                let worker;

                if (!m.isImage) return m.reply("Reply to image");
                if (!worker) worker = await createWorker("eng");

                const { data } = await worker.recognize(await m.getBuffer());

                m.reply(data.text.trim());

                break;
            }

            case "s":
            case "sticker": {
                if (!(m.isImage || m.isVideo)) return m.reply("Reply to image/video");

                const sticker = await new Sticker(await m.getBuffer(), {
                    pack: "Created by",
                    author: config["bot.name"],
                    type: StickerTypes.FULL,
                    quality: 100
                }).toBuffer();

                await m.reply_m({ sticker });

                break;
            }

            case "brat": {
                if (!m.text) return m.reply("Example: /brat t:<theme color> blur:<int blur> Handsome Anton");

                const buffer = await bratGen(m.text, {
                    theme: "white",
                    BLUR: 2
                });

                const sticker = await new Sticker(buffer, {
                    pack: "Created by",
                    author: config["bot.name"],
                    type: StickerTypes.FULL,
                    quality: 100
                }).toBuffer();

                await m.reply_m({ sticker });

                break;
            }

            case "bratvid": {
                if (!m.text) return m.reply("Example: /brat t:<theme color> blur:<int blur> Handsome Anton");

                const buffer = await bratVid(m.text, {
                    fast_progress: true,
                    theme: "white",
                    brat: { BLUR: 2 }
                });

                const sticker = await new Sticker(buffer, {
                    pack: "Created by",
                    author: config["bot.name"],
                    type: StickerTypes.FULL,
                    quality: 100
                }).toBuffer();

                await m.reply_m({ sticker });

                break;
            }

            case "translate":
            case "tr": {
                let text = m.text?.trim() || "";
                let target;

                if (!text && m.isQuoted) {
                    target = "id";
                    text = m.quotedText?.trim() || "";
                }

                else {
                    const parts = text.split(/\s+/);
                    const first = parts.shift()?.toLowerCase();

                    if (!first) {
                        return m.reply(
                            "Reply pesan dengan .translate\n" +
                            "atau gunakan .translate <kode> <text>"
                        );
                    }

                    if (/^[a-z]{2,3}$/i.test(first)) {
                        target = first;

                        if (!parts.length && m.isQuoted) {
                            text = m.quotedText?.trim() || "";
                        } else {
                            text = parts.join(" ").trim();
                        }

                        if (!text) {
                            return m.reply("Text tidak ditemukan");
                        }
                    }

                    else {
                        return m.reply(
                            "Format:\n" +
                            ".translate\n" +
                            ".translate en\n" +
                            ".translate id Hello world\n" +
                            ".translate en Hello world"
                        );
                    }
                }

                if (!text) {
                    return m.reply("Text tidak ditemukan");
                }

                try {
                    const { sentences = [] } = await got.post("https://translate.google.com/translate_a/single?client=at&dt=t&dt=rm&dj=1", {
                        form: {
                            sl: "auto",
                            tl: target,
                            q: text
                        }
                    }).json();

                    const translated = sentences
                        .filter(({ trans }) => trans)
                        .map(({ trans }) => trans)
                        .join("");

                    if (!translated) {
                        return m.reply("Gagal mendapatkan hasil translate");
                    }

                    await m.reply(`Hasil: ${translated}`);
                } catch (error) {
                    await m.reply(`Gagal translate: ${error.message}`);
                }

                break;
            }

            case "facebook":
            case "fb": {
                if (!m.text) return m.reply("Coba: .fb <URL_VIDIO_FACEBOOK>");

                const data = await got.get(`https://facebook.anton-id.tech/api?url=${m.text}`).json();

                if (data.ok !== true || data.msg) return m.reply(data.msg);

                await m.reply_m({
                    video: {
                        url: data.result?.url
                    },
                    caption: data.result?.title || ""
                });

                break;
            }
        }
    }

    catch (error) {
        await socket.sendMessage(`${config["bot.phone"]}@s.whatsapp.net`, { text: error.message });
    }
}