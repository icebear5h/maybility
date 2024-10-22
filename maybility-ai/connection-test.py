from prisma import Prisma
from dotenv import load_dotenv
import asyncio

async def main() -> None:
    db = Prisma()
    await db.connect()
    await db.disconnect()