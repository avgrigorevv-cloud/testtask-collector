# Публикация расширения

Один и тот же zip подходит для Opera, Edge и Chrome (все три на движке Chromium, манифест V3):
`npm run pack-extension` создает `dist/screenshots-with-marks-<версия>.zip`.
Готовый скриншот для карточки (1280×800): `store-assets/screenshot-1280x800.png`.

| Магазин | Браузеры | Стоимость |
|---|---|---|
| Opera Add-ons | Opera, Яндекс Браузер (ставит дополнения из каталога Opera, проверьте на своей версии) | бесплатно |
| Edge Add-ons | Edge | бесплатно |
| Chrome Web Store | Chrome и остальные на Chromium | 5 $ разово |

## Opera Add-ons (бесплатно)

1. Зарегистрируйтесь на https://addons.opera.com/developer/ (аккаунт Opera, взноса нет).
2. «Upload new extension», загрузите `dist/screenshots-with-marks-1.0.0.zip`.
3. Заполните карточку (Opera просит описание на английском; названия полей могут слегка
   отличаться):

**Name:** Screenshots with marks

**Summary:** Screenshot a page, add numbered marks, areas and spacing measurements, and copy it to the clipboard in one click.

**Description:**
Take a screenshot of the visible part of any page and annotate it right on top of the page.

- Click to drop a numbered mark, drag to draw an area, and write a comment for each one.
- Measure spacing like in developer tools: hover an element to see dotted guides and pixel distances to its parent, or Shift+click a second element to measure the gap between two elements. Hold Option/Alt to measure without leaving the marking mode.
- Crop the frame, then reset everything with one button.
- Copy the result to the clipboard in one click: a single image with marks, measurements and the list of comments, ready to paste into slides, docs, Figma or chat.

Everything works locally in your browser, nothing is sent to the internet. Optional: save screenshots to your own self-hosted server (open source).

**Category:** Developer Tools (или Productivity). **Language:** English (+ Russian).

**Screenshots:** `store-assets/screenshot-1280x800.png`.

**Privacy:** данные не собираются. Политика: `PRIVACY.md` (после слияния в `main`:
https://github.com/avgrigorevv-cloud/testtask-collector/blob/main/PRIVACY.md).
**Source code:** https://github.com/avgrigorevv-cloud/testtask-collector

После одобрения у карточки будет страница с кнопкой «Add to Opera», ее же открывают
в Яндекс Браузере. Проверка в Opera обычно занимает от нескольких часов до пары дней.

## Chrome Web Store (5 $)

Один раз: зарегистрируйтесь на https://chrome.google.com/webstore/devconsole (взнос 5 $),
затем «Новый элемент» и загрузите `dist/screenshots-with-marks-<версия>.zip`
(`npm run pack-extension`). Проверка занимает от нескольких часов до нескольких дней.
Яндекс.Браузер ставит расширения из Chrome Web Store, Edge можно опубликовать отдельно
в Microsoft Edge Add-ons тем же zip.

## Поля листинга

**Название:** Скриншоты с метками

**Краткое описание (до 132 символов):**
Скриншот страницы с метками, областями и замером отступов. Копируется в буфер одной кнопкой.

**Подробное описание:**
Делает скриншот видимой части страницы и открывает редактор: ставьте метки с
комментариями, выделяйте области, измеряйте отступы между элементами как в режиме
разработчика, обрезайте кадр. Готовую картинку (с метками, замерами и списком
комментариев) можно скопировать в буфер обмена одной кнопкой и вставить в презентацию,
документ, Figma или чат. Все работает локально в браузере, ничего не отправляется в
интернет. Необязательно: сохранение на собственный сервер.

**Категория:** Инструменты (Developer Tools). **Язык:** русский.

## Вкладка «Конфиденциальность»

- Единственное назначение: скриншот страницы с аннотациями и копирование в буфер обмена.
- `activeTab`: снять скриншот текущей вкладки по клику пользователя.
- `scripting`: показать редактор скриншота поверх страницы.
- `storage`: запомнить адрес и сессию необязательного собственного сервера.
- Удаленный код: не используется.
- Сбор данных: не собираются. Данные не передаются, кроме необязательной отправки на
  сервер, который пользователь указал сам.
- Ссылка на политику: https://github.com/avgrigorevv-cloud/testtask-collector/blob/main/PRIVACY.md
  (работает после слияния ветки в `main`).

## Графика

Иконка 128×128 уже в `extension/icons/128.png`. Для листинга нужен минимум один скриншот
1280×800 (сделайте расширением на любой странице).
