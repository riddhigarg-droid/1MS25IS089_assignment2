import os
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone
import asyncio
from backend.app.schemas.chat import Conversation, MessageItem

logger = logging.getLogger(__name__)

class ConversationStore:
    """
    Modular conversation store with in-memory caching and persistent JSON backup.
    Easily replaceable with PostgreSQL/SQLAlchemy in production.
    """

    def __init__(self, storage_path: str = "conversations_data.json"):
        self.storage_path = storage_path
        self._conversations: Dict[str, Conversation] = {}
        self._lock = asyncio.Lock()
        self._load()

    def _load(self):
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for cid, cdata in data.items():
                        self._conversations[cid] = Conversation(**cdata)
                logger.info(f"Loaded {len(self._conversations)} conversations from {self.storage_path}")
            except Exception as e:
                logger.warning(f"Could not load conversations from {self.storage_path}: {e}")

    def _save(self):
        try:
            data = {cid: conv.model_dump() for cid, conv in self._conversations.items()}
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Error saving conversations to {self.storage_path}: {e}")

    async def list_conversations(self) -> List[Conversation]:
        async with self._lock:
            # Sort by updated_at descending
            return sorted(
                list(self._conversations.values()),
                key=lambda c: c.updated_at,
                reverse=True
            )

    async def get_conversation(self, conv_id: str) -> Optional[Conversation]:
        async with self._lock:
            return self._conversations.get(conv_id)

    async def create_conversation(self, title: str = "New Research Chat") -> Conversation:
        async with self._lock:
            conv = Conversation(title=title)
            self._conversations[conv.id] = conv
            self._save()
            return conv

    async def add_message(self, conv_id: str, message: MessageItem) -> Optional[Conversation]:
        async with self._lock:
            conv = self._conversations.get(conv_id)
            if not conv:
                conv = Conversation(id=conv_id, title=message.content[:36] + ("..." if len(message.content) > 36 else ""))
                self._conversations[conv_id] = conv

            conv.messages.append(message)
            conv.updated_at = datetime.now(timezone.utc).isoformat()
            # Auto-title if still default
            if conv.title == "New Research Chat" and message.role == "user":
                clean_title = message.content.strip().split("\n")[0][:40]
                conv.title = clean_title + ("..." if len(message.content) > 40 else "")

            self._save()
            return conv

    async def update_title(self, conv_id: str, title: str) -> Optional[Conversation]:
        async with self._lock:
            conv = self._conversations.get(conv_id)
            if conv:
                conv.title = title
                conv.updated_at = datetime.now(timezone.utc).isoformat()
                self._save()
                return conv
            return None

    async def delete_conversation(self, conv_id: str) -> bool:
        async with self._lock:
            if conv_id in self._conversations:
                del self._conversations[conv_id]
                self._save()
                return True
            return False

    async def clear_messages(self, conv_id: str) -> Optional[Conversation]:
        async with self._lock:
            conv = self._conversations.get(conv_id)
            if conv:
                conv.messages.clear()
                conv.updated_at = datetime.now(timezone.utc).isoformat()
                self._save()
                return conv
            return None

conversation_store = ConversationStore()
