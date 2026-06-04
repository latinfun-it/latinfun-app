"""Generate 3 alternative QUEBRADERA logo variants."""
import asyncio
import os
import base64
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")
api_key = os.getenv("EMERGENT_LLM_KEY")

VARIANTS = {
    "A_clean_modern": """Create a CLEAN MODERN LOGO of ONLY the single word "QUEBRADERA" written in ONE horizontal line.

CRITICAL:
- ONLY the word "QUEBRADERA" - nothing else (no images, no decorations, no objects, no people, no scenery)
- Pure WHITE background, completely empty
- 10 letters Q-U-E-B-R-A-D-E-R-A on ONE single horizontal line, perfectly spelled
- Wide horizontal banner format (3:1 ratio)

STYLE: Modern bold geometric sans-serif font (similar to Futura/Gotham Bold), CLEAN and PROFESSIONAL.
- Each letter filled with a smooth gradient using BRAZILIAN FLAG COLORS: vibrant GREEN on the left letters, transitioning to SUNNY YELLOW in the middle, ending in OCEAN BLUE on the right letters
- Subtle white highlight on top edge of each letter for a glossy 3D effect
- NO outline, NO shadow, NO decorations - just clean colored letters
- Logo must be readable from 100 meters away

The output is ONLY the typography, nothing else.""",

    "B_70s_tropicalia": """Create a RETRO 1970s TROPICALIA STYLE LOGO of ONLY the word "QUEBRADERA" on ONE horizontal line.

CRITICAL:
- ONLY the word "QUEBRADERA" - no other elements at all (no flowers, no people, no scenery, no decorations)
- Pure cream/beige background OR off-white
- 10 letters Q-U-E-B-R-A-D-E-R-A perfectly spelled in ONE horizontal row
- Wide banner format 3:1

STYLE: Vintage 70s psychedelic typography (like Brazilian Tropicalia album covers from Caetano Veloso, Gilberto Gil era).
- Letters with thick rounded curves, soft inflated bubble-letter style with retro vibe
- Color palette: warm earthy tones - terracotta orange, mustard yellow, deep teal, burnt sienna, cream
- Letters can be slightly tilted or wavy giving a groovy 70s feeling
- Each letter has a thin dark brown outline
- Slight grain/paper texture overlay for vintage authenticity
- Feels nostalgic, organic, hand-drawn

The output is ONLY the typography on a clean background, nothing else.""",

    "C_neon_baile_funk": """Create a NEON GLOWING LOGO of ONLY the word "QUEBRADERA" on ONE horizontal line.

CRITICAL:
- ONLY the word "QUEBRADERA" - completely empty surroundings (no images, no objects, no people)
- Solid DARK BLACK background, totally clean
- 10 letters Q-U-E-B-R-A-D-E-R-A on ONE horizontal row, perfect spelling
- Wide horizontal format 3:1

STYLE: Modern NEON SIGN typography, like Brazilian baile funk parties / favela night club aesthetics.
- Letters made of glowing neon tubes
- Bold geometric/condensed sans-serif shape with rounded tips
- Color: bright NEON PINK / MAGENTA outer glow, with cyan/turquoise inner highlights, plus electric yellow accents
- Strong realistic light bloom/halo radiating from each letter (soft glow effect)
- Dark reflections of the neon on the black surface below the letters
- Cyberpunk-meets-Rio aesthetic, ultra modern, vibrant

The output is ONLY the glowing neon typography on a black void, nothing else."""
}


async def generate(variant_name, prompt):
    chat = LlmChat(
        api_key=api_key,
        session_id=f"quebradera-{variant_name}",
        system_message="You are a professional graphic designer specialized in logo design and typography.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    msg = UserMessage(text=prompt)
    text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        print(f"[{variant_name}] FAILED - no image")
        return None
    out_path = f"/app/backend/static/quebradera_v_{variant_name}.png"
    image_bytes = base64.b64decode(images[0]["data"])
    with open(out_path, "wb") as f:
        f.write(image_bytes)
    print(f"[{variant_name}] Saved {len(image_bytes)} bytes")
    return out_path


async def main():
    results = await asyncio.gather(*[generate(k, v) for k, v in VARIANTS.items()])
    print("\nDone:", results)


if __name__ == "__main__":
    asyncio.run(main())
