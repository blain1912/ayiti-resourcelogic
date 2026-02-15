import { type Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  Heading1, Heading2, Heading3,
  Undo2, Redo2, Pilcrow, Highlighter, Palette,
  IndentIncrease, IndentDecrease, Minus, Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RichTextToolbarProps {
  editor: Editor;
}

const FONT_FAMILIES = [
  { value: "default", label: "Par défaut" },
  { value: "serif", label: "Serif (Times)" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "'Courier New', monospace", label: "Courier" },
  { value: "'Garamond', serif", label: "Garamond" },
];

const FONT_SIZES_MAP: Record<string, string> = {
  "small": "0.875em",
  "normal": "1em",
  "large": "1.25em",
  "x-large": "1.5em",
};

const HIGHLIGHT_COLORS = [
  "#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca",
  "#e9d5ff", "#fed7aa", "#fce7f3", "#d1d5db",
];

const TEXT_COLORS = [
  "#000000", "#374151", "#dc2626", "#2563eb",
  "#16a34a", "#9333ea", "#d97706", "#0891b2",
];

function ToolBtn({
  onClick,
  active = false,
  disabled = false,
  tooltip,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "h-8 w-8 p-0",
              active && "bg-accent text-accent-foreground"
            )}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const RichTextToolbar = ({ editor }: RichTextToolbarProps) => {
  const [textColor, setTextColor] = useState("#000000");

  return (
    <div className="border-b bg-muted/30 p-1 space-y-1">
      {/* Row 1: Font, Format */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Font Family */}
        <Select
          value={editor.getAttributes("textStyle").fontFamily || "default"}
          onValueChange={(val) => {
            if (val === "default") {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(val).run();
            }
          }}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Police" />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs">
                <span style={{ fontFamily: f.value !== "default" ? f.value : undefined }}>
                  {f.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Block type */}
        <Select
          value={
            editor.isActive("heading", { level: 1 }) ? "h1" :
            editor.isActive("heading", { level: 2 }) ? "h2" :
            editor.isActive("heading", { level: 3 }) ? "h3" : "paragraph"
          }
          onValueChange={(val) => {
            if (val === "paragraph") editor.chain().focus().setParagraph().run();
            else if (val === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (val === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (val === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph" className="text-xs">
              <span className="flex items-center gap-1"><Pilcrow className="h-3 w-3" /> Paragraphe</span>
            </SelectItem>
            <SelectItem value="h1" className="text-xs">
              <span className="flex items-center gap-1"><Heading1 className="h-3 w-3" /> Titre 1</span>
            </SelectItem>
            <SelectItem value="h2" className="text-xs">
              <span className="flex items-center gap-1"><Heading2 className="h-3 w-3" /> Titre 2</span>
            </SelectItem>
            <SelectItem value="h3" className="text-xs">
              <span className="flex items-center gap-1"><Heading3 className="h-3 w-3" /> Titre 3</span>
            </SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        {/* Text formatting */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} tooltip="Gras (Ctrl+B)">
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} tooltip="Italique (Ctrl+I)">
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} tooltip="Souligné (Ctrl+U)">
          <Underline className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} tooltip="Barré">
          <Strikethrough className="h-4 w-4" />
        </ToolBtn>

        <Separator orientation="vertical" className="h-6" />

        {/* Text color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <div className="flex flex-col items-center">
                <Type className="h-3.5 w-3.5" />
                <div className="h-1 w-4 rounded-full mt-0.5" style={{ backgroundColor: textColor }} />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" side="bottom">
            <p className="text-xs font-medium mb-2">Couleur du texte</p>
            <div className="grid grid-cols-4 gap-1.5">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setTextColor(color);
                    editor.chain().focus().setColor(color).run();
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex gap-1.5 items-center">
              <Input
                type="color"
                value={textColor}
                onChange={(e) => {
                  setTextColor(e.target.value);
                  editor.chain().focus().setColor(e.target.value).run();
                }}
                className="h-7 w-10 p-0.5 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">Personnalisé</span>
            </div>
          </PopoverContent>
        </Popover>

        {/* Highlight */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive("highlight") && "bg-accent")}>
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" side="bottom">
            <p className="text-xs font-medium mb-2">Surlignage</p>
            <div className="grid grid-cols-4 gap-1.5">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-xs"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
            >
              Retirer le surlignage
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Row 2: Alignment, Lists, Undo/Redo */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Alignment */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} tooltip="Aligner à gauche">
          <AlignLeft className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} tooltip="Centrer">
          <AlignCenter className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} tooltip="Aligner à droite">
          <AlignRight className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} tooltip="Justifier">
          <AlignJustify className="h-4 w-4" />
        </ToolBtn>

        <Separator orientation="vertical" className="h-6" />

        {/* Lists */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} tooltip="Liste à puces">
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} tooltip="Liste numérotée">
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>

        <Separator orientation="vertical" className="h-6" />

        {/* Horizontal rule */}
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} tooltip="Ligne horizontale">
          <Minus className="h-4 w-4" />
        </ToolBtn>

        {/* Blockquote */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} tooltip="Citation">
          <IndentIncrease className="h-4 w-4" />
        </ToolBtn>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo / Redo */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} tooltip="Annuler (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} tooltip="Rétablir (Ctrl+Y)">
          <Redo2 className="h-4 w-4" />
        </ToolBtn>
      </div>
    </div>
  );
};
