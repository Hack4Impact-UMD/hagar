import "@mdxeditor/editor/style.css";
import {
  addImportVisitor$,
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
  quotePlugin,
  realmPlugin,
  Separator,
  thematicBreakPlugin,
  toolbarPlugin,
  useCellValue,
  usePublisher,
} from "@mdxeditor/editor";
import type { MdastImportVisitor, RealmPlugin } from "@mdxeditor/editor";
import { $createHeadingNode } from "@lexical/rich-text";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useState } from "react";
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
  /**
   * Called when the notes contain markdown the editor can't read. The notes
   * are then shown as plain text instead, and must not be saved over.
   */
  onUnreadable?: () => void;
};

// Markdown links the user adds may only point at ordinary web or mail
// addresses, never `javascript:` or `data:` URLs. Lexical also rewrites any
// other link it renders to `about:blank`.
function isSafeUrl(url: string): boolean {
  try {
    return ["http:", "https:", "mailto:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

// MDXEditor's markdown node type, which it doesn't export by name.
type MdastNode = Parameters<
  Extract<MdastImportVisitor<never>["testNode"], (...args: never[]) => unknown>
>[0];

/** The text inside a markdown node, without any of its markup. */
function plainText(node: MdastNode): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  if ("children" in node) return node.children.map(plainText).join("");
  return "";
}

/**
 * Notes are user-entered, so HTML in them must never become real elements.
 * MDXEditor's fallback for HTML tags copies every attribute onto the element,
 * so `<a href="javascript:…">` would run script when clicked. This visitor
 * runs just before that fallback (priority -100) and keeps only the text.
 * Underline is unaffected: MDXEditor turns `<u>` into formatting at a higher
 * priority and ignores its attributes.
 */
const htmlAsTextVisitor: MdastImportVisitor<MdastNode> = {
  testNode: (node) =>
    node.type === "html" ||
    node.type === "mdxJsxTextElement" ||
    node.type === "mdxJsxFlowElement",
  visitNode: ({ mdastNode, lexicalParent, actions }) => {
    // Inline tags keep their content, formatting included, in place.
    if (mdastNode.type === "mdxJsxTextElement") {
      actions.visitChildren(mdastNode, lexicalParent);
      return;
    }
    // Raw HTML shows as the text it was written as; block tags as their text.
    const text =
      mdastNode.type === "html" ? mdastNode.value : plainText(mdastNode);
    const node = lexical.$createTextNode(text);
    if (!lexical.$isElementNode(lexicalParent)) return;
    if (lexical.$isRootNode(lexicalParent)) {
      lexicalParent.append(lexical.$createParagraphNode().append(node));
    } else {
      lexicalParent.append(node);
    }
  },
  priority: -50,
};

const htmlAsTextPlugin = realmPlugin({
  init: (realm) => realm.pubIn({ [addImportVisitor$]: htmlAsTextVisitor }),
});

const contentPlugins: RealmPlugin[] = [
  htmlAsTextPlugin(),
  headingsPlugin({ allowedHeadingLevels: [2] }),
  listsPlugin(),
  // Not in the toolbar, but common in markdown, and typing `> ` or `---`
  // creates them. Without these plugins, notes containing them can't load.
  quotePlugin(),
  thematicBreakPlugin(),
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
  onUnreadable,
}: NotesEditorProps) {
  // MDXEditor stops at the first markdown it can't read and shows only what
  // came before it, or nothing. Saving that would erase the rest, so the
  // original text is shown instead.
  const [unreadable, setUnreadable] = useState(false);
  if (unreadable) return <UnreadableNotes markdown={markdown} />;

  return (
    <MDXEditor
      markdown={markdown}
      readOnly={readOnly}
      onChange={onChange}
      onError={() => {
        setUnreadable(true);
        onUnreadable?.();
      }}
      // Viewers can't change anything, so they get no toolbar at all.
      plugins={readOnly ? contentPlugins : editablePlugins}
      placeholder={readOnly ? "No notes yet." : "Type"}
      // Tailwind's preflight strips heading and list styles, and MDXEditor
      // leaves typography to the host page. Checklists keep MDXEditor's own
      // checkbox styling, so they're excluded from bullets.
      contentEditableClassName="min-h-[32rem] text-lg leading-7 [&_a]:text-primary [&_a]:underline [&_blockquote]:text-muted-foreground [&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_hr]:my-4 [&_h2]:my-2 [&_h2]:text-xl [&_h2]:font-bold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-1 [&_ul]:pl-6 [&_ul:not(:has(>li[role=checkbox]))]:list-disc"
    />
  );
}

/** The notes as plain text, for markdown the editor can't read. */
function UnreadableNotes({ markdown }: { markdown: string }) {
  return (
    <div data-testid="notes-unreadable" className="flex flex-col gap-3 p-3">
      <p role="alert" className="text-muted-foreground text-sm">
        These notes use formatting the editor can&apos;t show, so they&apos;re
        displayed as plain text and can&apos;t be edited here.
      </p>
      <pre className="font-sans text-lg leading-7 break-words whitespace-pre-wrap">
        {markdown}
      </pre>
    </div>
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
