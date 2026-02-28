const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const fs = require("fs-extra")
const axios = require("axios")

const config = require("./config.json")
let db = require("./database.json")

async function saveDB() {
    await fs.writeJSON("./database.json", db, { spaces: 2 })
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth")
    const sock = makeWASocket({ auth: state })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        const sender = msg.key.participant || msg.key.remoteJid
        const from = msg.key.remoteJid
        const text = msg.message.conversation || ""

        if (!db.points[sender]) db.points[sender] = 0
        db.points[sender] += 1
        if (!db.warnings[sender]) db.warnings[sender] = 0

        if (!text.startsWith(config.prefix)) return
        const command = text.slice(1).split(" ")[0].toLowerCase()

        // 🛡️ أوامر الإدارة
        if (command === "طرد") await sock.groupParticipantsUpdate(from, [sender], "remove")
        if (command === "تحذير") {
            db.warnings[sender] += 1
            await sock.sendMessage(from, { text: `عدد التحذيرات: ${db.warnings[sender]}` })
            if (db.warnings[sender] >= 3) await sock.groupParticipantsUpdate(from, [sender], "remove")
        }

        if (command === "نقاط") await sock.sendMessage(from, { text: `نقاطك: ${db.points[sender]}` })

        // 👋 أوامر الترحيب
        if (command === "قوانين") {
            await sock.sendMessage(from, { text: "قوانين القروب: ممنوع السبام، الروابط، الكلام المسيء." })
        }

        // 🎮 أوامر ترفيه
        if (command === "لعبة") {
            const options = ["حجر", "ورقة", "مقص"]
            const choice = options[Math.floor(Math.random() * 3)]
            await sock.sendMessage(from, { text: `اخترت: ${choice}` })
        }

        if (command === "تحدي") {
            const num = Math.floor(Math.random() * 100)
            await sock.sendMessage(from, { text: `تحدي اليوم: احصل على رقم ${num}` })
        }

        // 🤖 أوامر ذكاء اصطناعي
        if (command === "ترجمة") {
            const msgParts = text.split(" ").slice(1).join(" ")
            await sock.sendMessage(from, { text: `ترجمة افتراضية: ${msgParts} (لن يتم الترجمة الفعلية بدون API)` })
        }

        await saveDB()
    })

    sock.ev.on("group-participants.update", async (update) => {
        if (db.settings.welcome && update.action === "add") {
            await sock.sendMessage(update.id, { text: "مرحبًا بك في القروب 👋" })
        }
        if (db.settings.goodbye && update.action === "remove") {
            await sock.sendMessage(update.id, { text: "وداعًا 👋" })
        }
    })
}

startBot()
