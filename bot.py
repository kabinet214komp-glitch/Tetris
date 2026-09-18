import asyncio
import os

from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton

load_dotenv()

TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://YOUR-DOMAIN.com")

print("TOKEN найден:", TOKEN is not None)

bot = Bot(TOKEN)
dp = Dispatcher()


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


async def main():
    print("🤖 Tetris Bot запущен!")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())