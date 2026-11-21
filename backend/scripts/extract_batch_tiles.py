import json
import urllib.request
import urllib.error
import os

def fetch_api(slug):
    url = f"https://sportsurf.in/new/api/cms/pages/{slug}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return resp.status, data
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception as e:
        return str(e), None

def clean_title_for_tile(idx, heading, client_slug, img_path):
    # Mapping table with clean, professional titles matching both image names and page themes
    clean_titles = {
        0: "Immersive Learning",
        1: "Kindergarten Design",
        2: "Composite Skill Lab",
        3: "Library Innovations",
        4: "Furniture & Design Planning",
        5: "Selling or Buying a School",
        6: "Gamified Math Lab",
        7: "Interactive Walls",
        8: "16 Latest Interactive Panels for Classrooms",
        9: "20 AI Tools for Classroom",
        10: "The Best Curriculums for Your Kindergarten",
        11: "Gamified Science Lab",
        12: "Smart Sports for Schools",
        13: "Complete School Setup Guide",
        14: "Talk to Us: Digital Transformation",
        15: "Wondergartens"
    }
    return clean_titles.get(idx, heading.strip().title())

def main():
    home_path = 'D:/schoolmart/campusmart-base/backend/scripts/data/sportsurf_home_extracted.json'
    out_path = 'D:/schoolmart/campusmart-base/backend/scripts/data/sportsurf_batch_tiles_pages.json'

    print(f"Reading source home data from: {home_path}")
    with open(home_path, 'r', encoding='utf-8') as f:
        home_data = json.load(f)

    tiles = home_data['blocks']['tiles']['data']['tiles']
    print(f"Found {len(tiles)} homepage tiles.")

    compiled_pages = []

    for idx, tile in enumerate(tiles):
        path = tile.get('path', '')
        client_slug = path.replace('/p/', '').strip()
        api_slug = f"resource-{client_slug}"
        
        inner = tile.get('inner', {})
        heading = inner.get('heading', '') or tile.get('title', '')
        badge = inner.get('badge') or tile.get('subtitle') or 'Institutional Insight'
        img = tile.get('img', '')

        clean_title = clean_title_for_tile(idx, heading, client_slug, img)

        print(f"\nProcessing Tile [{idx + 1}/16]:")
        print(f"  Title: '{clean_title}'")
        print(f"  Client Slug: '{client_slug}'")
        print(f"  API Slug: '{api_slug}'")

        # 1. Fetch resource-<slug>
        status_res, payload_res = fetch_api(api_slug)
        print(f"  GET {api_slug} -> Status: {status_res}")

        # 2. Fetch <slug>
        status_raw, payload_raw = fetch_api(client_slug)
        print(f"  GET {client_slug} -> Status: {status_raw}")

        # Live data payload extraction
        live_blocks = {}
        live_page_meta = None
        if payload_res and isinstance(payload_res, dict):
            live_blocks = payload_res.get('blocks', {})
            live_page_meta = payload_res.get('page', {})
        elif payload_raw and isinstance(payload_raw, dict):
            live_blocks = payload_raw.get('blocks', {})
            live_page_meta = payload_raw.get('page', {})

        # Inner data consolidation
        inner_data = {
            "content": inner.get('content', ''),
            "description": inner.get('description', ''),
            "specs": inner.get('specs', []),
            "tags": inner.get('tags', []),
            "heading": heading.strip(),
            "originalHeading": inner.get('heading', ''),
            "heroImg": inner.get('heroImg', ''),
            "btn1Label": inner.get('btn1Label', ''),
            "btn1Path": inner.get('btn1Path', ''),
            "btn2Label": inner.get('btn2Label', ''),
            "btn2Path": inner.get('btn2Path', ''),
            "blocks": live_blocks,
            "livePage": live_page_meta,
            "apiFetchStatus": {
                api_slug: status_res,
                client_slug: status_raw
            }
        }

        # Build complete dataset item
        item = {
            "title": clean_title,
            "clientSlug": client_slug,
            "apiSlug": api_slug,
            "image": img,
            "badge": badge,
            "innerData": inner_data
        }

        compiled_pages.append(item)

    # Save to destination file
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(compiled_pages, f, indent=2, ensure_ascii=False)

    print(f"\n========================================================")
    print(f"Successfully compiled {len(compiled_pages)} pages dataset!")
    print(f"Saved cleanly to: {out_path}")
    print(f"File size: {os.path.getsize(out_path)} bytes")
    print(f"========================================================")

if __name__ == '__main__':
    main()
