import "@mdxeditor/editor/style.css";
import {
  applyListType$,
  BoldItalicUnderlineToggles,
  convertSelectionToNode$,
  CreateLink,
  currentBlockType$,
  currentListType$,
  headingsPlugin,
  lexical,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  Separator,
  toolbarPlugin,
  useCellValue,
  usePublisher,
} from "@mdxeditor/editor";
import type { RealmPlugin } from "@mdxeditor/editor";
import { $createHeadingNode } from "@lexical/rich-text";
import { CaretDownIcon } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@frontend/components/ui/dropdown-menu.tsx";

/*
 * Loaded with React.lazy from the campaign page: MDXEditor is large and no
 * other page uses it, so it stays out of the main bundle.
 */

export type NotesEditorProps = {
  /** Only read on mount. Remount (change `key`) to load other notes. */
  markdown: string;
  readOnly: boolean;
  /**
   * `normalized` is true for the editor's own rewrite of the starting markdown
   * into its canonical form, which isn't an edit by the user.
   */
  onChange?: (markdown: string, normalized: boolean) => void;
};

// Notes are user-entered, so links may only point at ordinary web or mail
// addresses, never `javascript:` or `data:` URLs.
function isSafeUrl(url: string): boolean {
  try {
    return ["http:", "https:", "mailto:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

const contentPlugins: RealmPlugin[] = [
  headingsPlugin({ allowedHeadingLevels: [2] }),
  listsPlugin(),
  linkPlugin({ validateUrl: isSafeUrl }),
  linkDialogPlugin(),
  markdownShortcutPlugin(),
];

const editablePlugins: RealmPlugin[] = [
  ...contentPlugins,
  toolbarPlugin({
    // The Figma toolbar uses the sidebar's color. MDXEditor's stylesheet is
    // unlayered, so it outranks Tailwind's utilities unless marked important.
    toolbarClassName: "bg-sidebar! rounded-[0.625rem]!",
    toolbarContents: () => (
      <>
        <BoldItalicUnderlineToggles />
        <Separator />
        <CreateLink />
        <BlockTypeMenu />
      </>
    ),
  }),
];

export function NotesEditor({
  markdown,
  readOnly,
  onChange,
}: NotesEditorProps) {
  return (
    <MDXEditor
      markdown={markdown}
      readOnly={readOnly}
      onChange={onChange}
      // Viewers can't change anything, so they get no toolbar at all.
      plugins={readOnly ? contentPlugins : editablePlugins}
      placeholder={readOnly ? "No notes yet." : "Type"}
      // Tailwind's preflight strips heading and list styles, and MDXEditor
      // leaves typography to the host page. Checklists keep MDXEditor's own
      // checkbox styling, so they're excluded from bullets.
      contentEditableClassName="min-h-[32rem] text-lg leading-7 [&_a]:text-primary [&_a]:underline [&_h2]:my-2 [&_h2]:text-xl [&_h2]:font-bold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-1 [&_ul]:pl-6 [&_ul:not(:has(>li[role=checkbox]))]:list-disc"
    />
  );
}

const BLOCK_TYPES = [
  { value: "paragraph", label: "Paragraph" },
  { value: "heading", label: "Heading" },
  { value: "bullet", label: "Bulleted List" },
  { value: "number", label: "Numbered List" },
  { value: "check", label: "Checklist" },
] as const;
type BlockTypeChoice = (typeof BLOCK_TYPES)[number]["value"];

/**
 * MDXEditor's own block type select covers paragraphs and headings but not
 * lists, so this one combines both in the single dropdown the design shows.
 */
function BlockTypeMenu() {
  const convertSelectionToNode = usePublisher(convertSelectionToNode$);
  const applyListType = usePublisher(applyListType$);
  const blockType = useCellValue(currentBlockType$);
  const listType = useCellValue(currentListType$);

  const current: BlockTypeChoice | undefined = listType
    ? listType
    : blockType === "paragraph"
      ? "paragraph"
      : blockType.startsWith("h")
        ? "heading"
        : undefined;

  const choose = (choice: BlockTypeChoice) => {
    if (choice === "bullet" || choice === "number" || choice === "check") {
      applyListType(choice);
      return;
    }
    // A list item can't become a heading directly, so leave the list first.
    if (listType) applyListType("");
    convertSelectionToNode(() =>
      choice === "heading"
        ? $createHeadingNode("h2")
        : lexical.$createParagraphNode(),
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="notes-block-type"
        className="border-primary text-primary ml-2 flex h-[1.375rem] cursor-pointer items-center gap-1 rounded-md border bg-background px-2 text-sm"
      >
        {BLOCK_TYPES.find((type) => type.value === current)?.label ??
          "Block Type"}
        <CaretDownIcon aria-hidden weight="fill" className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {BLOCK_TYPES.map(({ value, label }) => (
          <DropdownMenuItem
            key={value}
            className={value === current ? "bg-sidebar" : undefined}
            onSelect={() => choose(value)}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
