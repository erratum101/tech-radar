## Tech Radar — конструктор

### Локальная разработка

```bash
cd tech-radar
npm install
npm run dev
```

Откройте адрес, который покажет Vite (обычно `http://127.0.0.1:5173`).

### Шаринг с короткой ссылкой (прод / полный dev)

API сохраняет снимок радара и отдаёт короткий id; в ссылке будет `#radar=srv:<id>`. Параллельно разные пользователи работают у себя в браузере независимо — общий сервер только хранит **копии** по запросу «поделиться».

```bash
npm run dev:full
```

Это поднимает Vite и `server/index.js` (порт `3001`). Запросы с фронта на `/api` проксируются в API (см. `vite.config.js`). Локально данные пишутся в `server/data/radars.json`.

### Деплой на Vercel

**Вариант A (рекомендуется):** в настройках проекта Vercel → **Root Directory** → `tech-radar`. Тогда используется `tech-radar/vercel.json` и папка `api/`.

**Вариант B:** Root Directory пустой (корень репозитория) — в корне лежит `vercel.json`, который ставит зависимости и собирает проект из `tech-radar/` (`npm ci --prefix tech-radar`). API коротких ссылок в этом режиме не поднимется — для шаринга лучше вариант A.

1. Импортируйте репозиторий в [Vercel](https://vercel.com).
2. Укажите **Root Directory**: `tech-radar` (вариант A).
3. Framework Preset: **Vite** (или оставьте авто — подхватится `vercel.json`).
4. Для **коротких ссылок** подключите Redis:
   - Project → **Storage** / **Marketplace** → **Upstash Redis** (или другой Redis с REST API)
   - Переменные `KV_REST_API_URL` / `KV_REST_API_TOKEN` (или `UPSTASH_REDIS_REST_*`) подставятся в проект автоматически.
5. `VITE_SHARE_API_BASE` оставьте пустым — фронт ходит на `/api` того же домена.

Маршруты API (serverless в папке `api/`):

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/health` | Проверка API |
| POST | `/api/radars` | Сохранить снимок, вернуть `{ id }` |
| GET | `/api/radars/:id` | Загрузить снимок по id |

CLI (из папки `tech-radar`):

```bash
npm i -g vercel
vercel
vercel --prod
```

Без KV на Vercel кнопка «Поделиться» всё равно работает — приложение откатится на **длинную ссылку** с данными в URL.

### Продакшен на своём сервере (VPS / Nginx)

1. Соберите статику: `npm run build`, раздайте `dist/` через Nginx (или аналог).
2. Запустите API Node.js (тот же `node server/index.js` под systemd/pm2), данные — в `server/data/radars.json` (каталог создаётся автоматически, в git не коммитится).
3. Проксируйте `location /api/` на процесс API, например:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

4. Переменные: см. `.env.example`. Обычно `VITE_SHARE_API_BASE` оставляют пустым — тогда фронт бьёт в тот же домен по пути `/api`.

Если API недоступен при нажатии «поделиться», приложение **автоматически** формирует прежнюю длинную ссылку с данными в URL.
