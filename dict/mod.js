import "@antonthomzz/travex";

import config from "../config.json" with { type: "json" };

import got from "got";
import jsQR from "jsqr";
import Pino from "pino";
import sharp from "sharp";

import { bratGen } from "brat-canvas";
import { bratVid } from "brat-canvas/video";
import { createWorker } from "tesseract.js";
import { Sticker, StickerTypes } from "wa-sticker-formatter";

import {
    makeWASocket,
    Browsers,
    DisconnectReason,
    useMultiFileAuthState,
    downloadMediaMessage,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

Object.assign(globalThis, {
    config,

    got,
    jsQR,
    Pino,
    sharp,

    bratGen,
    bratVid,

    createWorker,

    Sticker,
    StickerTypes,

    makeWASocket,
    Browsers,
    DisconnectReason,
    useMultiFileAuthState,
    downloadMediaMessage,
    fetchLatestBaileysVersion
});