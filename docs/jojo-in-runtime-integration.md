# Integrate with jojo-in-runtime (Works + Logs, iframe)

Portfolio repo: [`MikHaiLz404/my-journey`](https://github.com/MikHaiLz404/my-journey) (live: [jojo-in-runtime.vercel.app](https://jojo-in-runtime.vercel.app)).

Diorama stays a **separate Vite + Three.js deploy**. The portfolio hosts it via **iframe** (option C).

| Surface | Role |
| ------- | ---- |
| **Works** | Project card + detail page with full-bleed iframe of the live tray |
| **Logs** | Separate write-up (Thai ok) about building / using the tray — link back to the Work |

Live app: `https://japan-2026-diorama.vercel.app/`  
Embed URL: `https://japan-2026-diorama.vercel.app/?embed=1`

`?embed=1` turns on compact chrome and an **Open fullscreen** chip. CSP `frame-ancestors` allows `jojo-in-runtime.vercel.app` (and Vercel previews).

Implementation PR on the portfolio: branch `cursor/japan-diorama-works-logs-429b` in `my-journey` (local Works/Logs fallbacks + `embed_url` iframe).

### Notion Connections (seed / MCP)

Works + Logs live in the **portfolio CMS** Notion workspace (not the personal trip-plan workspace).

When sharing those databases via **⋯ → Connections → Connect to**:

- Do **not** look for a connection named `cursor`
- Pick **`Notion MCP`** (the bot Cursor uses for this workspace)
- If **`Notion MCP` is also missing**, the DB is in a different Notion workspace than the one Cursor authenticated — open Works/Logs in the workspace that powers `jojo-in-runtime`, or seed with the same `NOTION_TOKEN` as that Vercel project and share the DBs with **that** integration’s name instead

---

## 1. Works entry

Add a project next to Nice to Z You / Invictus. Suggested fields:

```ts
{
  slug: "japan-2026-diorama",
  title: "Japan 2026 Diorama",
  category: "Interactive", // or "Web" — add filter chip if Works only has Game / TV Series
  role: "Creator",
  description:
    "Mobile-first Three.js miniature trip tray for Japan 2026. Tap a city block to zoom into lodging and activities; visited stops stay bright.",
  tags: ["THREE.JS", "WEBGL", "TYPESCRIPT", "TRIPSY"],
  featured: true,
  icon: "travel_explore",
  image: "/works/japan-2026-diorama.png", // screenshot or cover art
  year: 2026,
  embedUrl: "https://japan-2026-diorama.vercel.app/?embed=1",
  liveUrl: "https://japan-2026-diorama.vercel.app/",
  repoUrl: "https://github.com/MikHaiLz404/japan-2026-diorama",
}
```

### Detail page iframe (preferred)

Works already iframes media (YouTube). For WebGL, use a tall frame — not a short 16:9 tile:

```tsx
<section className="mb-16">
  <div className="relative w-full h-[min(78vh,720px)] rounded-xl overflow-hidden border border-primary/20 bg-surface-container">
    <iframe
      src="https://japan-2026-diorama.vercel.app/?embed=1"
      title="Japan 2026 Diorama"
      className="absolute inset-0 h-full w-full border-0"
      allow="fullscreen"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  </div>
  <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-secondary">
    Interactive · tap a city ·{" "}
    <a
      href="https://japan-2026-diorama.vercel.app/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      Open fullscreen
    </a>
  </p>
</section>
```

Keep nav/footer of jojo-in-runtime outside the iframe. Do **not** nest this iframe inside Logs — Logs should stay a text post with a link.

---

## 2. Logs entry (separate)

Publish a Log (Notion → site, same pipeline as other logs). Suggested meta:

- **Slug:** `japan-2026-diorama`
- **Title (EN):** `Japan 2026 diorama — trip tray ในพอร์ตโฟลิโอ`
- **Title (TH):** `ทำถาดทริปญี่ปุ่น 2026 เป็นไดโอราม่า Three.js`
- **Category:** Tech (or Personal)
- **Cover:** screenshot of the tray
- **Canonical Work:** `/works/japan-2026-diorama`

### Draft body (Thai)

```markdown
ทริปญี่ปุ่น 2026 ยังวิ่งอยู่เลยอยากได้แผนที่ที่รู้สึกเหมือนถาดของเล่นมากกว่า Google Maps

เลยทำ miniature tray ด้วย Three.js — กดเมืองแล้วซูมเข้าไปดูที่พักกับกิจกรรม
สถานที่ที่ผ่านแล้วสว่าง ที่ยังไม่ถึงจะจาง ข้อมูลดึงจาก Tripsy แล้ว bake เป็น fixture

ฝั่งพอร์ตโฟลิโอใส่ไว้ใน Works เป็น iframe
เปิดเต็มจอได้ที่ https://japan-2026-diorama.vercel.app/

โค้ด: https://github.com/MikHaiLz404/japan-2026-diorama
```

---

## 3. Repo ownership

| Repo | Owns |
| ---- | ---- |
| `japan-2026-diorama` | 3D scene, Tripsy refresh, `?embed=1`, CSP |
| `jojo-in-runtime` | Works card/detail, Logs post, iframe host chrome |

Do not merge the Three.js app into the Next.js monorepo for v1 — WebGL wants its own full viewport and build.

---

## 4. Checklist on jojo-in-runtime

1. Add Works project + cover image under `/public/works/`
2. Detail page renders the iframe snippet above
3. Publish Logs post; link to `/works/japan-2026-diorama`
4. Preview on a `*.vercel.app` deploy — CSP already allows Vercel preview hosts
5. Smoke-test mobile: orbit / pinch / city menu inside the iframe
