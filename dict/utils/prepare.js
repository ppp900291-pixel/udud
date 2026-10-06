import "../mod.js";

const fake_quoted = {
    key: {
        remoteJid: "0@s.whatsapp.net",
        fromMe: false,
        participant: "0@s.whatsapp.net"
    },
    message: {
        conversation: `༼⁠ ⁠つ⁠ ⁠◕⁠‿⁠◕⁠ ⁠༽⁠つ ${config["bot.name"]}`
    }
};

const media_type = {
    imageMessage: "image",
    videoMessage: "video",
    audioMessage: "audio",
    stickerMessage: "sticker",
    documentMessage: "document"
};

export default async function prepare(socket, m) {
    m.jid = m.key.remoteJid;
    m.fromMe = m.key.fromMe;

    m.body = [
        m.message?.conversation,
        m.message?.extendedTextMessage?.text,
        m.message?.imageMessage?.caption,
        m.message?.videoMessage?.caption,
        m.message?.documentMessage?.caption,
        m.message?.buttonsResponseMessage?.selectedButtonId,
    ].find(value => typeof value === "string" && value.trim())?.trim() || "";

    m.args = m.body
        .slice(1)
        .trim()
        .split(/\s+/);

    m.command = m.args
        .shift()
        .toLowerCase();

    m.text = m.args.join(" ");
    m.quoted = m.traverse(".quotedMessage", { group: 1 });

    m.reply = text => socket.sendMessage(
        m.jid,
        { text },
        { quoted: fake_quoted }
    );

    m.reply_m = media => socket.sendMessage(
        m.jid,
        media,
        { quoted: m }
    );

    m.isQuoted = !!m.quoted;

    m.mediaSource =
        m.quoted ||
        m.message;

    m.mediaKey = Object.keys(media_type)
        .find(key => m.mediaSource?.[key]) ||
        null;

    m.media = m.mediaKey
        ? m.mediaSource[m.mediaKey]
        : null;

    m.type =
        media_type[m.mediaKey] ||
        null;

    m.isMedia = !!m.media;
    m.isImage = m.type === "image";
    m.isVideo = m.type === "video";
    m.isAudio = m.type === "audio";
    m.isSticker = m.type === "sticker";
    m.isDocument = m.type === "document";
    m.isAnimated = m.isSticker && !!m.media?.isAnimated;
    m.isViewOnce = !!m.media?.viewOnce;

    let mediaBuffer = null;

    m.getBuffer = async () => {
        if (!m.isMedia) return null;

        return mediaBuffer ??= await downloadMediaMessage(
            m.quoted ? { message: m.quoted } : m,
            "buffer",
            {}, {}
        );
    };

    return m;
}