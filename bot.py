import asyncio
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
import uvicorn

# Загружаем переменные из .env
load_dotenv()

TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL")

if not TOKEN:
    raise ValueError("BOT_TOKEN не найден!")

if not WEBAPP_URL:
    raise ValueError("WEBAPP_URL не найден!")

print("✅ BOT_TOKEN найден")
print("🌐 WEBAPP_URL:", WEBAPP_URL)

# Telegram Bot
bot = Bot(token=TOKEN)
dp = Dispatcher()

# FastAPI
app = FastAPI()


# =========================
# WEB SERVER
# =========================

@app.get("/")
async def home():
    return {
        "status": "ok",
        "message": "🎮 Tetris Bot is running!"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }


# =========================
# TELEGRAM
# =========================

@dp.message(CommandStart())
async def start(message: types.Message):

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🎮 ИГРАТЬ В TETRIS",
                    web_app=WebAppInfo(url=WEBAPP_URL)
                )
            ]
        ]
    )

    await message.answer(
        "🧱 <b>TETRIS</b>\n\n"
        "Готов сыграть?\n"
        "Собери линии и набери максимальный счёт! 🔥",
        reply_markup=keyboard,
        parse_mode="HTML"
    )


@dp.message()
async def web_app_data(message: types.Message):

    if message.web_app_data:
        data = message.web_app_data.data

        await message.answer(
            f"🏆 Результат получен!\n\n"
            f"📊 {data}"
        )


# =========================
# BOT
# =========================

async def start_bot():
    print("🤖 Tetris Bot запущен!")
    await dp.start_polling(bot)


# =========================
# MAIN
# =========================

async def main():

    # Render автоматически создаёт переменную PORT
    port = int(os.getenv("PORT", "10000"))

    print(f"🌐 Web server запускается на порту {port}")

    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )

    server = uvicorn.Server(config)

    await asyncio.gather(
        start_bot(),
        server.serve()
    )


if __name__ == "__main__":
    asyncio.run(main())
