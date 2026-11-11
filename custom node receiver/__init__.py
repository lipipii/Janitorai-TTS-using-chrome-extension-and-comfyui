import hashlib
from aiohttp import web
from server import PromptServer

_state = {"text": ""}


@PromptServer.instance.routes.post("/quote_receiver/set")
async def set_quote(request):
    data = await request.json()
    _state["text"] = data.get("text", "")
    if data.get("queue"):
        # Memberi sinyal ke UI ComfyUI untuk menekan Queue Prompt
        PromptServer.instance.send_sync("quote_receiver.trigger", {})
    return web.json_response({"ok": True})


class QuoteReceiver:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {}}

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "run"
    CATEGORY = "utils"

    @classmethod
    def IS_CHANGED(cls):
        return hashlib.md5(_state["text"].encode("utf-8")).hexdigest()

    def run(self):
        return (_state["text"],)


NODE_CLASS_MAPPINGS = {"QuoteReceiver": QuoteReceiver}
NODE_DISPLAY_NAME_MAPPINGS = {"QuoteReceiver": "Quote Receiver (Chrome)"}
WEB_DIRECTORY = "./web"