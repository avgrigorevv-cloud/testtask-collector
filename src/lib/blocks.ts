export type BlockType =
  | "attachment"
  | "info"
  | "link"
  | "text"
  | "file_upload"
  | "image_annotate";

export type BlockBase = {
  id: string;
  type: BlockType;
  title: string;
  description?: string;
  required: boolean;
};

export type AttachmentBlock = BlockBase & {
  type: "attachment";
  config: {
    files: { url: string; name: string }[];
  };
};

export type InfoBlock = BlockBase & {
  type: "info";
  config: Record<string, never>;
};

export type LinkBlock = BlockBase & {
  type: "link";
  config: {
    placeholder?: string;
  };
};

export type TextBlock = BlockBase & {
  type: "text";
  config: {
    multiline?: boolean;
    placeholder?: string;
  };
};

export type FileUploadBlock = BlockBase & {
  type: "file_upload";
  config: {
    accept?: string;
    maxFiles?: number;
  };
};

export type ImageAnnotateBlock = BlockBase & {
  type: "image_annotate";
  config: {
    images: { url: string; label?: string }[];
  };
};

export type Block =
  | AttachmentBlock
  | InfoBlock
  | LinkBlock
  | TextBlock
  | FileUploadBlock
  | ImageAnnotateBlock;

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  attachment: "Прикреплённый файл (инструкция)",
  info: "Информационный блок (без ответа)",
  link: "Ссылка",
  text: "Текстовый ответ",
  file_upload: "Загрузка файла",
  image_annotate: "Разметка скриншотов",
};

export const DISPLAY_BLOCK_TYPES: BlockType[] = ["attachment", "info"];

export const INPUT_BLOCK_TYPES: BlockType[] = [
  "link",
  "text",
  "file_upload",
  "image_annotate",
];

const NON_ANSWERABLE_TYPES: BlockType[] = ["attachment", "info"];

export function isDisplayOnlyBlock(type: BlockType): boolean {
  return NON_ANSWERABLE_TYPES.includes(type);
}

export function defaultConfigFor(type: BlockType): Block["config"] {
  switch (type) {
    case "attachment":
      return { files: [] };
    case "info":
      return {};
    case "link":
      return { placeholder: "https://github.com/..." };
    case "text":
      return { multiline: true, placeholder: "" };
    case "file_upload":
      return { accept: ".pdf,.zip,.png,.jpg", maxFiles: 5 };
    case "image_annotate":
      return { images: [] };
  }
}

export function newBlock(type: BlockType): Block {
  const base = {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    required: !isDisplayOnlyBlock(type),
  };
  return { ...base, type, config: defaultConfigFor(type) } as Block;
}

export type Pin = {
  imageIndex: number;
  x: number;
  y: number;
  comment: string;
};

export type ImageAnnotateAnswerValue = {
  pins: Pin[];
};

export type LinkAnswerValue = { url: string };
export type TextAnswerValue = { text: string };
export type FileUploadAnswerValue = {
  files: { url: string; name: string }[];
};
