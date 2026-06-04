"""Generate QUEBRADERA brazilian-style album cover logo."""
import asyncio
import os
import base64
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")
api_key = os.getenv("EMERGENT_LLM_KEY")

PROMPT = """Create a vibrant, joyful Brazilian-style music album cover featuring the word "QUEBRADERA" 
as the centerpiece typography. The design should evoke a party, samba, carnival, and tropical beach vibe.

Style requirements:
- Bold, hand-painted/graffiti-style large lettering with the word "QUEBRADERA" prominently displayed
- Brazilian flag color palette: vivid green, sunny yellow, ocean blue, plus accents of hot pink, orange, and white
- Tropical elements scattered around: palm leaves, hibiscus flowers, musical notes, percussion instruments (tamborim, surdo, agogô), confetti, tropical fruits (pineapple, mango)
- Energetic, festive composition with rhythmic visual movement
- Square 1:1 aspect ratio (CD album cover format)
- Background: sunset/beach gradient or carnival street vibe
- The typography "QUEBRADERA" must be perfectly spelled, large, bold, eye-catching, with vibrant gradient colors (yellow-to-pink-to-blue)
- Joyful, party atmosphere - feels like a Rio de Janeiro carnival/baile funk celebration
- Professional album cover quality, high resolution
- The text "QUEBRADERA" must be the absolute focal point, readable from far away

Aesthetic: Brazilian funk meets samba, graphic design influenced by 1970s tropicalia album covers, modern vibrant illustration style, photorealistic textures mixed with painted elements.

DO NOT include any other words/text besides "QUEBRADERA". Make it ONE single bold visual statement."""


async def main():
    chat = LlmChat(
        api_key=api_key,
        session_id="quebradera-cover-001",
        system_message="You are a professional graphic designer specialized in music album covers and Brazilian tropical aesthetics.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    msg = UserMessage(text=PROMPT)
    text, images = await chat.send_message_multimodal_response(msg)
    print(f"Text response: {text[:200] if text else '(no text)'}")
    if not images:
        print("ERROR: No images generated")
        return
    print(f"Generated {len(images)} image(s)")
    for i, img in enumerate(images):
        out_path = f"/app/backend/static/quebradera_cover_{i}.png"
        image_bytes = base64.b64decode(img["data"])
        with open(out_path, "wb") as f:
            f.write(image_bytes)
        print(f"Saved: {out_path} ({len(image_bytes)} bytes)")


if __name__ == "__main__":
    asyncio.run(main())
