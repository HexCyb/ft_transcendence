# ft_transcendence

[![CI](https://github.com/HexCyb/ft_transcendence/actions/workflows/ci.yml/badge.svg)](https://github.com/HexCyb/ft_transcendence/actions/workflows/ci.yml)

A single-page **Pong** website written in TypeScript. Two players can share one keyboard, up to eight can play a knockout tournament, or you can face an AI opponent. It runs in Docker behind nginx over HTTPS and starts with one command.

> Originally completed at **42 Türkiye** as the last project of the common core. This repository is a 2026 rewrite, because the original code was lost. It covers the mandatory part plus two modules: the AI opponent and game customization.
> 42 Türkiye'de tamamladığım projenin 2026'da yeniden yazılmış hali; orijinal kod kayboldu.

## Run it

```sh
make            # builds the image and starts it
```

Open **https://localhost:8443**. The certificate is self-signed, so the browser warns once.

## Features

| | |
|---|---|
| **Single-page app** | A History API router: links change the URL without reloading, Back / Forward work, and deep links work (nginx falls back to `index.html`) |
| **Pong** | The 1972 rules: first to N points. A fixed 120 Hz physics step makes the game run the same on every screen. The ball speeds up on every hit, and its angle depends on where it touches the paddle |
| **1 vs 1** | One keyboard: `W` / `S` against `↑` / `↓`. `Space` pauses |
| **Tournament** | 2 to 8 aliases (unique, up to 16 characters), drawn at random. Byes are added when the count is not a power of two. The page shows the bracket, announces each next match and crowns a champion |
| **AI opponent** *(module)* | Looks at the game only once per second and predicts where the ball will arrive, wall bounces included. It plays through the same virtual keys and at the same paddle speed as a human |
| **Game customization** *(module)* | Points to win, ball speed and paddle size, saved in the browser and used by every mode |
| **Security** | HTTPS only (TLS 1.2 / 1.3). User text is never inserted as HTML (aliases become text nodes or canvas text). A strict Content-Security-Policy is set |

## How it works

```
browser ── https :8443 ──▶ nginx (container)  ──▶  index.html + /js/*.js + styles.css
                                                     │
                      router.ts ── History API ──────┤
                                                     ├── views/pages.ts       home · 1 vs 1 · vs AI · settings · 404
                                                     ├── views/tournament.ts  registration · bracket · matches
                                                     └── views/match.ts       canvas + keyboard → game/pong.ts
                                                                                          ▲
                                                                     game/ai.ts ──────────┘ (virtual keys)
```

- **`game/pong.ts`**: the engine. `requestAnimationFrame` draws every frame, and the physics advances in fixed `1/120 s` steps, so speed does not depend on the monitor.
- **`game/ai.ts`**: refreshes its view once per second, unfolds the ball's path between the walls to find the arrival point, then holds up / down until its paddle gets there.
- **`views/tournament.ts`**: a single-elimination bracket. Winners move to the next round automatically, and a player with a bye goes straight through.
- **`router.ts`**: every view returns a cleanup function, so leaving a page stops its game loop and keyboard listeners.

## Project structure

```
Makefile                  make · make down · make logs · make re
docker-compose.yml        one service, port 8443 → 443
frontend/
├── Dockerfile            node:22 builds the TypeScript, nginx:1.27 serves it
├── nginx.conf            TLS, security headers, SPA fallback
├── entrypoint.sh         self-signed certificate on first start
├── index.html  styles.css
└── src/
    ├── main.ts  router.ts  dom.ts  settings.ts
    ├── game/   pong.ts  ai.ts
    └── views/  pages.ts  match.ts  tournament.ts
```

## Continuous integration

Every push runs [GitHub Actions](https://github.com/HexCyb/ft_transcendence/actions/workflows/ci.yml) (`.github/workflows/ci.yml`):

- strict TypeScript check, then 12 unit tests (`node --test`) for the tournament bracket, byes, alias rules and the AI's wall-bounce prediction
- a production build
- builds the Docker image, checks that HTTPS answers on 8443 and that a deep link like `/tournament` falls back to `index.html`
