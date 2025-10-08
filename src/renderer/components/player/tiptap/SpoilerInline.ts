import { Node, mergeAttributes } from '@tiptap/core';

export interface SpoilerInlineOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spoilerInline: {
      /**
       * Insert a spoiler inline
       */
      insertSpoilerInline: (visibleText: string, content: string) => ReturnType;
    };
  }
}

export const SpoilerInline = Node.create<SpoilerInlineOptions>({
  name: 'spoilerInline',

  group: 'inline',

  inline: true,

  content: 'text*',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      visibleText: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-visible-text'),
        renderHTML: (attributes) => {
          if (!attributes.visibleText) {
            return {};
          }

          return {
            'data-visible-text': attributes.visibleText,
          };
        },
      },
      spoilerId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-spoiler-id'),
        renderHTML: (attributes) => {
          if (!attributes.spoilerId) {
            return {};
          }

          return {
            'data-spoiler-id': attributes.spoilerId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-spoiler]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-spoiler': '',
        class: 'spoiler-inline',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertSpoilerInline:
        (visibleText: string, content: string) =>
        ({ commands, state }) => {
          const { selection } = state;
          const { from, to } = selection;
          const spoilerId = `spoiler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          return commands.insertContentAt(
            { from, to },
            [
              {
                type: this.name,
                attrs: { visibleText, spoilerId },
                content: [{ type: 'text', text: content }],
              },
              { type: 'text', text: ' ' },
            ],
          );
        },
    };
  },
});

