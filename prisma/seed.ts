import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { randomUUID } from "crypto";
import type { Block } from "../src/lib/blocks";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

function block<T extends Block>(b: Omit<T, "id"> & { id?: string }): T {
  return { id: b.id ?? randomUUID(), ...b } as T;
}

const devInternBlocks: Block[] = [
  block({
    type: "attachment",
    title: "Условия задания",
    description:
      "Пайплайн для очистки и подсчёта UMUX-Lite скора. Полное описание — в PDF",
    required: false,
    config: {
      files: [
        { url: "/uploads/seed/TASK_umux_intern.pdf", name: "TASK_umux_intern.pdf" },
      ],
    },
  }),
  block({
    type: "link",
    title: "Ссылка на репозиторий с решением",
    description: "Публичный git-репозиторий (GitHub/GitLab) с кодом, README и результатом визуализации",
    required: true,
    config: { placeholder: "https://github.com/username/umux-pipeline" },
  }),
  block({
    type: "text",
    title: "Что не успели или сделали бы иначе",
    description: "Необязательный комментарий к решению",
    required: false,
    config: { multiline: true, placeholder: "" },
  }),
];

const researcherBlocks: Block[] = [
  block({
    type: "info",
    title: "Контекст задания",
    description:
      "Перед вами три скриншота главной страницы страховой компании СОГАЗ (десктоп и мобильная версия). Проведите экспресс-исследование: отметьте на скриншотах конкретные проблемы юзабилити и кликните на месте, где вы их видите — оставьте комментарий к каждой отметке",
    required: false,
    config: {},
  }),
  block({
    type: "image_annotate",
    title: "Разметка проблем на главной странице sogaz.ru",
    description:
      "Кликните по скриншоту в месте проблемы и опишите, что не так и почему это мешает пользователю",
    required: true,
    config: {
      images: [
        { url: "/uploads/seed/sogaz-01-hero.png", label: "Десктоп — верх страницы" },
        { url: "/uploads/seed/sogaz-02-full.png", label: "Десктоп — страница целиком" },
        { url: "/uploads/seed/sogaz-03-mobile.png", label: "Мобильная версия" },
      ],
    },
  }),
  block({
    type: "text",
    title: "Топ-3 приоритетные правки",
    description: "Что бы вы чинили в первую очередь и почему именно это?",
    required: true,
    config: { multiline: true, placeholder: "" },
  }),
];

const designerBlocks: Block[] = [
  block({
    type: "info",
    title: "Задание",
    description:
      "Пришлите портфолио и, при желании, ссылки на профили (Behance/Dribbble). Дополнительно можно оставить пару замечаний по дизайну главной страницы sogaz.ru — как будто это ваш реальный клиентский проект",
    required: false,
    config: {},
  }),
  block({
    type: "file_upload",
    title: "Портфолио",
    description: "PDF или архив с примерами работ",
    required: true,
    config: { accept: ".pdf,.zip", maxFiles: 3 },
  }),
  block({
    type: "link",
    title: "Профиль (Behance / Dribbble / сайт)",
    description: "Необязательно, если всё есть в портфолио",
    required: false,
    config: { placeholder: "https://behance.net/username" },
  }),
  block({
    type: "image_annotate",
    title: "Бонус: замечания по дизайну sogaz.ru",
    description: "Необязательно. Кликните по скриншоту и оставьте комментарий",
    required: false,
    config: {
      images: [{ url: "/uploads/seed/sogaz-01-hero.png", label: "Главная страница" }],
    },
  }),
];

const devInternDemoAnswers = [
  {
    blockId: devInternBlocks[1].id,
    type: "link",
    value: { url: "https://github.com/demo-candidate/umux-pipeline" },
  },
  {
    blockId: devInternBlocks[2].id,
    type: "text",
    value: {
      text: "Не успел добавить HTTP-эндпоинт на FastAPI — сделал только консольный запуск. С запасом времени вынес бы правила очистки данных в отдельный YAML вместо хардкода в коде.",
    },
  },
];

const researcherDemoAnswers = [
  {
    blockId: researcherBlocks[1].id,
    type: "image_annotate",
    value: {
      pins: [
        {
          imageIndex: 0,
          x: 28,
          y: 90,
          comment:
            "Cookie-баннер перекрывает часть контента, а кнопка «Принять» слабо контрастирует с фоном",
        },
        {
          imageIndex: 1,
          x: 18,
          y: 62,
          comment:
            "У карточек «Квартира», «ОСАГО» и других не подгружаются иконки — вместо них битые placeholder'ы",
        },
        {
          imageIndex: 2,
          x: 88,
          y: 55,
          comment:
            "На мобильной версии карточки категорий обрезаются по правому краю — есть горизонтальный скролл",
        },
      ],
    },
  },
  {
    blockId: researcherBlocks[2].id,
    type: "text",
    value: {
      text: "1) Убрать перекрытие контента cookie-баннером — сейчас он блокирует часть интерфейса.\n2) Починить подгрузку иконок категорий, сейчас везде показываются битые placeholder'ы.\n3) Проверить адаптивную вёрстку на мобильных — карточки обрезаются и появляется горизонтальный скролл.",
    },
  },
];

const designerDemoAnswers = [
  {
    blockId: designerBlocks[1].id,
    type: "file_upload",
    value: {
      files: [
        { url: "/uploads/seed/TASK_umux_intern.pdf", name: "portfolio-example.pdf" },
      ],
    },
  },
  {
    blockId: designerBlocks[2].id,
    type: "link",
    value: { url: "https://behance.net/demo-designer" },
  },
  {
    blockId: designerBlocks[3].id,
    type: "image_annotate",
    value: {
      pins: [
        {
          imageIndex: 0,
          x: 30,
          y: 20,
          comment:
            "Хиро-баннер визуально сильный, но заголовок конкурирует по вниманию с рекламным слайдером рядом — стоит развести зоны",
        },
      ],
    },
  },
];

async function main() {
  const templates = [
    {
      name: "Backend-стажёр: UMUX-пайплайн",
      roleLabel: "Стажёр-разработчик",
      description:
        "Собрать бэкенд-пайплайн для очистки и агрегации ответов опросника UMUX-Lite",
      blocks: devInternBlocks,
      demoAnswers: devInternDemoAnswers,
    },
    {
      name: "UX-исследователь: экспресс-аудит sogaz.ru",
      roleLabel: "Исследователь (middle/senior)",
      description:
        "Провести экспресс-исследование главной страницы sogaz.ru по скриншотам и найти проблемы юзабилити",
      blocks: researcherBlocks,
      demoAnswers: researcherDemoAnswers,
    },
    {
      name: "Дизайнер: портфолио + мини-ревью",
      roleLabel: "Дизайнер",
      description: "Прислать портфолио и, по желанию, прокомментировать дизайн главной sogaz.ru",
      blocks: designerBlocks,
      demoAnswers: designerDemoAnswers,
    },
  ];

  for (const t of templates) {
    const existing = await prisma.template.findFirst({ where: { name: t.name } });
    if (existing) {
      console.log(`skip (already exists): ${t.name}`);
      continue;
    }
    const created = await prisma.template.create({
      data: {
        name: t.name,
        roleLabel: t.roleLabel,
        description: t.description,
        blocks: JSON.stringify(t.blocks),
      },
    });
    const submission = await prisma.submission.create({
      data: {
        templateId: created.id,
        candidateName: "Демо-кандидат",
        status: "submitted",
        submittedAt: new Date(),
      },
    });
    for (const a of t.demoAnswers) {
      await prisma.answer.create({
        data: {
          submissionId: submission.id,
          blockId: a.blockId,
          type: a.type,
          value: JSON.stringify(a.value),
        },
      });
    }
    console.log(`created: ${t.name}`);
    console.log(`  candidate link: /t/${submission.token}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
