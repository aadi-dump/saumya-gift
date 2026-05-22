# Saumya Gift App

A private K-pop-inspired gift website for May 24.

## Run Locally

Open `index.html` directly, or run a tiny static server:

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

## Demo Login

Until Supabase is configured, the app uses local demo auth:

- `achokshi15@gmail.com` / `may24`

Update these in `script.js`.

## Permanent Setup

For real permanence:

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the SQL editor.
3. Disable public signup in Supabase Auth settings.
4. Manually create only the approved user accounts.
5. Replace the placeholder emails in `script.js` and `supabase-schema.sql`.
6. Add your Supabase `url` and `anonKey` to `script.js`.

The frontend has no signup screen. The database policies also check the allowlist before reading or writing private data.

## YouTube Karaoke Mode

The karaoke catalog uses YouTube search links with `karaoke version` added to the search phrase. The app can also embed a specific YouTube video when you paste its URL into the karaoke form. It does not download, extract, or rehost YouTube audio.

## Karaoke Scoring

The app loads the open-source `pitchy` package from `esm.sh` in the browser and uses it to estimate vocal pitch clarity/stability during recording. If Pitchy cannot load, scoring falls back to the original energy/length method.

## Video Recording

The karaoke recorder supports audio-only and video+audio mode. Video mode records the singer through the browser camera and microphone; it does not record, download, or extract the YouTube embed. With Supabase configured, video performances upload to the private `karaoke-performances` bucket.
