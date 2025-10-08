# TipTap Comment Editor

## Описание

Редактор комментариев на базе TipTap для приложения AnimeLib Desktop.

## Поддерживаемые форматы

- **Жирный текст** (Bold) - Ctrl+B
- *Курсив* (Italic) - Ctrl+I
- <u>Подчеркнутый</u> (Underline) - Ctrl+U
- ~~Зачеркнутый~~ (Strike)
- Цитаты (Blockquote)
- Спойлеры (Spoiler Inline)

## Формат вывода

Редактор генерирует JSON в формате TipTap/ProseMirror:

```json
{
  "comment": {
    "type": "doc",
    "content": [
      {
        "type": "blockquote",
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "text": "Текст - цитата"
              },
              {
                "type": "hardBreak"
              }
            ]
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "hardBreak"
          },
          {
            "type": "text",
            "marks": [
              {
                "type": "bold"
              }
            ],
            "text": "Текст - жирный"
          },
          {
            "type": "hardBreak"
          },
          {
            "type": "hardBreak"
          },
          {
            "type": "text",
            "marks": [
              {
                "type": "italic"
              }
            ],
            "text": "Текст - курсив"
          },
          {
            "type": "hardBreak"
          },
          {
            "type": "hardBreak"
          },
          {
            "type": "text",
            "marks": [
              {
                "type": "underline"
              }
            ],
            "text": "Текст - подчеркнутый"
          },
          {
            "type": "hardBreak"
          },
          {
            "type": "hardBreak"
          },
          {
            "type": "text",
            "marks": [
              {
                "type": "strike"
              }
            ],
            "text": "Текст - зачеркнутый"
          },
          {
            "type": "hardBreak"
          },
          {
            "type": "hardBreak"
          },
          {
            "type": "spoilerInline",
            "attrs": {
              "visibleText": "Название спойлера"
            },
            "content": [
              {
                "type": "text",
                "text": "Текст спойлер"
              }
            ]
          },
          {
            "type": "text",
            "text": " "
          }
        ]
      }
    ]
  },
  "post_type": "episodes",
  "post_id": 133488,
  "parent_comment": null,
  "root_id": null,
  "comment_level": 0
}
```

## Использование

```tsx
import CommentEditor, { CommentSubmitData } from './CommentEditor';

function MyComponent() {
  const handleSubmit = async (data: CommentSubmitData) => {
    // Отправка комментария на сервер
    await api.submitComment(data);
  };

  return (
    <CommentEditor
      episodeId={123}
      onSubmit={handleSubmit}
      parentComment={null}
      rootId={null}
      commentLevel={0}
    />
  );
}
```

## Кастомное расширение SpoilerInline

Расширение `SpoilerInline` - это кастомный Node для TipTap, который позволяет создавать спойлеры с видимым заголовком и скрытым содержимым.

### Структура

- `visibleText` - видимый заголовок спойлера
- `content` - скрытое содержимое спойлера (текст)

### Команды

- `insertSpoilerInline(visibleText: string, content: string)` - вставляет спойлер в позицию курсора

