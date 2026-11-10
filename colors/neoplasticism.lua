-- neoplasticism: after Mondrian. Three things get color: variables, functions, literals.
-- Everything else is white: the glue that holds the code together.
-- Generated from palette.toml by build.py. Edit templates/nvim/colors/neoplasticism.lua instead.
-- Install: add "brysontang/neoplasticism" with your plugin manager (or run ./install.sh),
-- then :colorscheme neoplasticism

vim.cmd("highlight clear")
if vim.fn.exists("syntax_on") == 1 then vim.cmd("syntax reset") end
vim.o.termguicolors = true
vim.o.background = "dark"
vim.g.colors_name = "neoplasticism"

local c = {
  bg          = "#141414",
  fg          = "#ffffff",
  -- the three that get color
  variable    = "#e8df95",
  func        = "#8fd0ff",
  literal     = "#fdaeba",
  -- everything else
  keyword     = "#ffffff",
  type        = "#ffffff",
  comment     = "#ffffff",
  punctuation = "#ffffff",
  -- interface
  accent      = "#e8df95",
  focus       = "#8fd0ff",
  alert       = "#fdaeba",
  error       = "#fdaeba",
  warning     = "#e8df95",
  info        = "#8fd0ff",
  hint        = "#7f7f7f",
  added       = "#9be39d",
  modified    = "#8fd0ff",
  removed     = "#fdaeba",
  gray1       = "#212121", -- cursorline, floats
  gray2       = "#323232", -- borders, selection
  gray3       = "#525252", -- line numbers
  gray4       = "#7f7f7f", -- dim text
}

local hl = function(group, opts) vim.api.nvim_set_hl(0, group, opts) end
local groups = {}
local function set(list, opts) for _, g in ipairs(list) do groups[g] = opts end end

-- Italic belongs to types and comments, nothing else. Treesitter often captures one name
-- twice (@type, then @constant, for MAX_RETRIES), and Neovim merges the attributes of
-- both, so every upright group says nocombine to keep italic from leaking through.
local function plain(color) return { fg = color, nocombine = true } end
local function italic(color) return { fg = color, italic = true } end

-- Base -----------------------------------------------------------------------
set({ "Normal", "NormalNC" },                { fg = c.fg, bg = c.bg })
set({ "NormalFloat" },                       { fg = c.fg, bg = c.gray1 })
set({ "FloatBorder", "WinSeparator" },       { fg = c.gray2, bg = c.bg })
set({ "FloatShadow" },                       { bg = c.bg, blend = 80 })
set({ "FloatShadowThrough" },                { bg = c.bg, blend = 100 })
set({ "LineNr", "SignColumn" },              { fg = c.gray3, bg = c.bg })
set({ "CursorLineNr" },                      { fg = c.fg })
set({ "CursorLine", "CursorColumn", "ColorColumn" }, { bg = c.gray1 })
set({ "Visual" },                            { bg = c.gray2 })
set({ "Search" },                            { fg = c.bg, bg = c.accent })
set({ "IncSearch", "CurSearch" },            { fg = c.bg, bg = c.alert })
set({ "QuickFixLine" },                      { bg = c.gray2 })
set({ "MatchParen" },                        { fg = c.accent, bg = c.gray2 })
set({ "NonText", "Whitespace", "EndOfBuffer" }, { fg = c.gray2 })
set({ "Conceal", "SpecialKey" },             { fg = c.gray4 })
set({ "StatusLine" },                        { fg = c.bg, bg = c.fg })
set({ "StatusLineNC" },                      { fg = c.gray4, bg = c.gray1 })
set({ "WinBar" },                            { fg = c.fg, bg = c.bg })
set({ "WinBarNC" },                          { fg = c.gray4, bg = c.bg })
set({ "TabLine", "TabLineFill" },            { fg = c.gray4, bg = c.gray1 })
set({ "TabLineSel" },                        { fg = c.bg, bg = c.fg })
set({ "Pmenu" },                             { fg = c.fg, bg = c.gray1 })
set({ "PmenuSel" },                          { fg = c.bg, bg = c.focus })
set({ "PmenuMatch" },                        { fg = c.accent })
set({ "PmenuMatchSel" },                     { fg = c.bg, bold = true })
set({ "PmenuSbar" },                         { bg = c.gray1 })
set({ "PmenuThumb" },                        { bg = c.gray3 })
set({ "Directory" },                         { fg = c.focus })
set({ "Title", "ModeMsg" },                  { fg = c.fg })
set({ "ErrorMsg", "Error" },                 { fg = c.error })
set({ "WarningMsg" },                        { fg = c.warning })
set({ "Question", "MoreMsg" },               { fg = c.info })
set({ "Folded" },                            { fg = c.gray4, bg = c.gray1, italic = true })
set({ "SpellBad" },                          { undercurl = true, sp = c.error })
set({ "SpellCap" },                          { undercurl = true, sp = c.warning })
set({ "SpellLocal" },                        { undercurl = true, sp = c.info })
set({ "SpellRare" },                         { undercurl = true, sp = c.hint })

-- Syntax (fallback when treesitter is off) ------------------------------------
set({ "Comment" },                           italic(c.comment))
set({ "Keyword", "Statement", "Conditional", "Repeat", "Exception",
      "StorageClass", "Include", "Define", "PreProc" }, { fg = c.keyword })
set({ "Identifier" },                        { fg = c.variable })
set({ "Function" },                          { fg = c.func })
set({ "Type", "Structure", "Typedef" },      italic(c.type))
set({ "String", "Character" },               { fg = c.literal })
set({ "Number", "Float", "Boolean", "Constant" }, { fg = c.literal })
set({ "Operator", "Delimiter", "Special" },  { fg = c.punctuation })
set({ "Todo" },                              { fg = c.fg, bold = true })
set({ "Underlined" },                        { underline = true })

-- Treesitter -----------------------------------------------------------------
-- Keywords: white
set({ "@keyword", "@keyword.function", "@keyword.return", "@keyword.conditional",
      "@keyword.repeat", "@keyword.exception", "@keyword.operator",
      "@keyword.coroutine", "@keyword.import", "@keyword.modifier",
      "@keyword.type", "@keyword.storage", "@label" }, plain(c.keyword))

-- Variables and properties: yellow. Builtins (this, self) are names like any other.
set({ "@variable", "@variable.builtin", "@variable.parameter", "@variable.parameter.builtin",
      "@constant", "@constant.macro",
      "@property", "@variable.member", "@field", "@tag.attribute",
      "@label.yaml" }, plain(c.variable)) -- YAML anchors are names

-- Functions: blue. Decorators and attributes are calls too.
set({ "@function", "@function.method", "@function.call", "@function.method.call",
      "@function.builtin", "@function.macro",
      "@attribute", "@attribute.builtin", "@tag", "@tag.builtin" }, plain(c.func))

-- Types: white italic. A class stays a type where it is used as a value: new Map().
set({ "@type", "@type.builtin", "@type.definition", "@module", "@module.builtin",
      "@constructor" }, italic(c.type))

-- Strings and numbers: red
set({ "@string", "@string.escape", "@string.regexp", "@string.special", "@character",
      "@number", "@number.float", "@boolean", "@constant.builtin" }, plain(c.literal))
set({ "@string.special.url" },               { underline = true })
-- Shell arguments are unquoted strings; an HTML entity is a character.
set({ "@variable.parameter.bash", "@character.special.html" }, plain(c.literal))

-- Comments: white italic
set({ "@comment" },                          italic(c.comment))

-- Punctuation and operators: white. Lua calls its table braces a constructor.
set({ "@punctuation", "@punctuation.bracket", "@punctuation.delimiter",
      "@punctuation.special", "@operator", "@tag.delimiter", "@character.special",
      "@constructor.lua" }, plain(c.punctuation))

-- Markup: prose is white; code and link targets take the focus color.
set({ "@markup.heading", "@markup.list", "@markup.quote", "@markup.link",
      "@markup.link.label", "@markup.raw.block" }, plain(c.fg))
set({ "@markup.raw", "@markup.link.url" },   plain(c.focus))

-- LSP semantic tokens ----------------------------------------------------------
-- The language server knows what treesitter can only guess, so its answer wins.
set({ "@lsp.type.variable", "@lsp.type.parameter", "@lsp.type.property",
      "@lsp.type.enumMember",
      "@lsp.typemod.variable.declaration", "@lsp.typemod.parameter.declaration",
      "@lsp.typemod.property.declaration" }, plain(c.variable))
set({ "@lsp.type.function", "@lsp.type.method", "@lsp.type.decorator", "@lsp.type.macro",
      "@lsp.typemod.function.declaration", "@lsp.typemod.method.declaration" }, plain(c.func))
set({ "@lsp.type.type", "@lsp.type.class", "@lsp.type.struct", "@lsp.type.interface",
      "@lsp.type.enum", "@lsp.type.typeParameter", "@lsp.type.namespace" }, italic(c.type))
set({ "LspInlayHint" },                      { fg = c.gray4, bg = c.gray1 })
set({ "LspCodeLens" },                       { fg = c.gray4 })

-- Diagnostics ----------------------------------------------------------------
set({ "DiagnosticError" },                   { fg = c.error })
set({ "DiagnosticWarn" },                    { fg = c.warning })
set({ "DiagnosticInfo" },                    { fg = c.info })
set({ "DiagnosticHint" },                    { fg = c.hint })
set({ "DiagnosticOk" },                      { fg = c.added })
set({ "DiagnosticUnderlineError" },          { undercurl = true, sp = c.error })
set({ "DiagnosticUnderlineWarn" },           { undercurl = true, sp = c.warning })
set({ "DiagnosticUnderlineInfo" },           { undercurl = true, sp = c.info })
set({ "DiagnosticUnderlineHint" },           { undercurl = true, sp = c.hint })
set({ "DiagnosticUnderlineOk" },             { undercurl = true, sp = c.added })
set({ "DiagnosticDeprecated" },              { strikethrough = true, sp = c.gray4 })
set({ "DiagnosticUnnecessary" },             { fg = c.gray4 })

-- Diffs and git ----------------------------------------------------------------
set({ "DiffAdd" },                           { bg = "#183317" })
set({ "DiffDelete" },                        { bg = "#3a1714" })
set({ "DiffChange" },                        { bg = "#1a243d" })
set({ "DiffText" },                          { bg = "#26376e" })
set({ "Added", "GitSignsAdd", "diffAdded" }, { fg = c.added })
set({ "Removed", "GitSignsDelete", "diffRemoved" }, { fg = c.removed })
set({ "Changed", "GitSignsChange", "diffChanged" }, { fg = c.modified })

for group, opts in pairs(groups) do hl(group, opts) end

-- Terminal buffers (:terminal) -------------------------------------------------
local ansi = { "#262626", "#fdaeba", "#9be39d", "#e8df95",
               "#8fd0ff", "#d35cff", "#8ae8e1", "#d9d9d9",
               "#7f7f7f", "#ffd0d6", "#bcf2bd", "#f7eea7",
               "#bfe3ff", "#e48aff", "#b4f3ee", "#ffffff" }
for i, color in ipairs(ansi) do vim.g["terminal_color_" .. (i - 1)] = color end
