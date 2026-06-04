"""Generate QUEBRADERA brazilian-style album cover logo."""
import asyncio
import os
import base64
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")
api_key = os.getenv("EMERGENT_LLM_KEY")

PROMPT = """Create a clean LOGO of the single word "QUEBRADERA" written in ONE SINGLE HORIZONTAL LINE.

CRITICAL RULES:
- ONLY the word "QUEBRADERA" - nothing else, no other text, no symbols, no objects
- TRANSPARENT or pure WHITE background (clean, empty, NO scenery, NO instruments, NO flowers, NO people, NO landscape)
- The word MUST be on ONE SINGLE LINE horizontally (NOT stacked, NOT broken across two lines)
- All 10 letters Q-U-E-B-R-A-D-E-R-A in a single horizontal row, left to right
- The word fills the width edge to edge, centered vertically
- Aspect ratio: wide horizontal banner (3:1 or 4:1), suitable as a logo

TYPOGRAPHY STYLE:
- Bold, hand-painted graffiti / brush-script style lettering
- Vibrant gradient colors typical of Brazilian flag and tropical vibe: sunny YELLOW transitioning into hot PINK transitioning into vibrant BLUE/turquoise, with GREEN accents
- Thick black or dark outline around each letter for maximum readability
- Each letter has subtle internal decorative pattern (dots, small stars) but stays clean and readable
- Joyful, energetic, samba/carnival feeling - but ELEGANT and CLEAN (no clutter)
- Slight 3D/depth shadow under the letters for pop

The output must be just the word "QUEBRADERA" floating cleanly on a transparent or pure white background. Perfect spelling: Q-U-E-B-R-A-D-E-R-A. Logo-quality, ready to be placed on any product (CD cover, merchandising, social media)."""


async def main():
    chat = LlmChat(
        api_key=api_key,
        session_id="quebradera-logo-clean-001",
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
        out_path = f"/app/backend/static/quebradera_logo_{i}.png"
        image_bytes = base64.b64decode(img["data"])
        with open(out_path, "wb") as f:
            f.write(image_bytes)
        print(f"Saved: {out_path} ({len(image_bytes)} bytes)")


if __name__ == "__main__":
    asyncio.run(main())
