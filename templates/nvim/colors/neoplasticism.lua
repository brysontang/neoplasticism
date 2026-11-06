-- {{ meta.slug }}: after Mondrian. Three things get color: variables, functions, literals.
-- Everything else is white: the glue that holds the code together.
-- Generated from palette.toml by build.py. Edit templates/nvim/colors/neoplasticism.lua instead.
-- Install: add "{{ meta.publisher }}/{{ meta.slug }}" with your plugin manager (or run ./install.sh),
-- then :colorscheme neoplasticism

vim.cmd("highlight clear")
if vim.fn.exists("syntax_on") == 1 then vim.cmd("syntax reset") end
vim.o.termguicolors = true
vim.o.background = "dark"
vim.g.colors_name = "neoplasticism"

local c = {
  bg          = "{{ bg }}",
  fg          = "{{ fg }}",
  -- the three that get color
  variable    = "{{ variable }}",
  func        = "{{ function }}",
  literal     = "{{ literal }}",
  -- everything else
  keyword     = "{{ keyword }}",
  type        = "{{ type }}",
  comment     = "{{ comment }}",
  punctuation = "{{ punctuation }}",
  -- interface
  accent      = "{{ accent }}",
  focus       = "{{ focus }}",
  alert       = "{{ alert }}",
  error       = "{{ error }}",
  warning     = "{{ warning }}",
  info        = "{{ info }}",
  hint        = "{{ hint }}",
  added       = "{{ added }}",
  modified    = "{{ modified }}",
  removed     = "{{ removed }}",
  gray1       = "{{ gray1 }}", -- cursorline, floats
  gray2       = "{{ gray2 }}", -- borders, selection
  gray3       = "{{ gray3 }}", -- line numbers
  gray4       = "{{ gray4 }}", -- dim text
}

local hl = function(group, opts) vim.api.nvim_set_hl(0, group, opts) end
local groups = {}
local function set(list, opts) for _, g in ipairs(list) do groups[g] = opts end end

-- Base -----------------------------------------------------------------------
set({ "Normal", "NormalNC" },                { fg = c.fg, bg = c.bg })
set({ "NormalFloat" },                       { fg = c.fg, bg = c.gray1 })
set({ "FloatBorder", "WinSeparator" },       { fg = c.gray2, bg = c.bg })
set({ "LineNr", "SignColumn" },              { fg = c.gray3, bg = c.bg })
set({ "CursorLineNr" },                      { fg = c.fg })
set({ "CursorLine", "ColorColumn" },         { bg = c.gray1 })
set({ "Visual" },                            { bg = c.gray2 })
set({ "Search" },                            { fg = c.bg, bg = c.accent })
set({ "IncSearch", "CurSearch" },            { fg = c.bg, bg = c.alert })
set({ "MatchParen" },                        { fg = c.accent, bg = c.gray2 })
set({ "NonText", "Whitespace", "EndOfBuffer" }, { fg = c.gray2 })
set({ "StatusLine" },                        { fg = c.bg, bg = c.fg })
set({ "StatusLineNC" },                      { fg = c.gray4, bg = c.gray1 })
set({ "TabLine", "TabLineFill" },            { fg = c.gray4, bg = c.gray1 })
set({ "TabLineSel" },                        { fg = c.bg, bg = c.fg })
set({ "Pmenu" },                             { fg = c.fg, bg = c.gray1 })
set({ "PmenuSel" },                          { fg = c.bg, bg = c.focus })
set({ "PmenuSbar" },                         { bg = c.gray1 })
set({ "PmenuThumb" },                        { bg = c.gray3 })
set({ "Directory" },                         { fg = c.focus })
set({ "Title" },                             { fg = c.fg })
set({ "ErrorMsg" },                          { fg = c.error })
set({ "WarningMsg" },                        { fg = c.warning })
set({ "Question", "MoreMsg" },               { fg = c.info })
set({ "Folded" },                            { fg = c.gray4, bg = c.gray1, italic = true })

-- Syntax (fallback when treesitter is off) ------------------------------------
set({ "Comment" },                           { fg = c.comment, italic = true })
set({ "Keyword", "Statement", "Conditional", "Repeat", "Exception",
      "StorageClass", "Include", "Define", "PreProc" }, { fg = c.keyword })
set({ "Identifier" },                        { fg = c.variable })
set({ "Function" },                          { fg = c.func })
set({ "Type", "Structure", "Typedef" },      { fg = c.type, italic = true })
set({ "String", "Character" },               { fg = c.literal })
set({ "Number", "Float", "Boolean", "Constant" }, { fg = c.literal })
set({ "Operator", "Delimiter", "Special" },  { fg = c.punctuation })

-- Treesitter -----------------------------------------------------------------
-- Keywords: white
set({ "@keyword", "@keyword.function", "@keyword.return", "@keyword.conditional",
      "@keyword.repeat", "@keyword.exception", "@keyword.operator",
      "@keyword.coroutine", "@keyword.import", "@keyword.modifier",
      "@keyword.type", "@keyword.storage" }, { fg = c.keyword })

-- Variables: yellow
set({ "@variable", "@variable.parameter", "@constant" }, { fg = c.variable })
set({ "@variable.builtin" },                 { fg = c.variable, italic = true })

-- Properties: yellow, regular weight
set({ "@property", "@variable.member", "@field" }, { fg = c.variable })

-- Functions: blue
set({ "@function", "@function.method", "@constructor" }, { fg = c.func })
set({ "@function.call", "@function.method.call", "@function.builtin" }, { fg = c.func })

-- Types: white italic
set({ "@type", "@type.builtin", "@type.definition", "@module" }, { fg = c.type, italic = true })

-- Strings and numbers: red
set({ "@string", "@string.escape", "@string.regexp", "@character" }, { fg = c.literal })
set({ "@number", "@number.float", "@boolean", "@constant.builtin" }, { fg = c.literal })

-- Comments: white italic
set({ "@comment" },                          { fg = c.comment, italic = true })

-- Punctuation and operators: white
set({ "@punctuation", "@punctuation.bracket", "@punctuation.delimiter",
      "@punctuation.special", "@operator", "@tag.delimiter" }, { fg = c.punctuation })
set({ "@tag" },                              { fg = c.func })
set({ "@tag.attribute" },                    { fg = c.variable })

-- LSP semantic tokens ----------------------------------------------------------
-- This is what separates a declaration from a use. When a name is declared,
-- the language server marks it. No weight change for now; these hooks are here
-- if you ever want declarations to look different from uses.
set({ "@lsp.typemod.variable.declaration",
      "@lsp.typemod.parameter.declaration",
      "@lsp.typemod.property.declaration" }, { fg = c.variable, nocombine = true })
set({ "@lsp.typemod.function.declaration",
      "@lsp.typemod.method.declaration" },   { fg = c.func })
set({ "@lsp.type.function", "@lsp.type.method" }, { fg = c.func })
set({ "@lsp.type.variable", "@lsp.type.parameter" }, { fg = c.variable })
set({ "@lsp.type.property" },                { fg = c.variable })
set({ "@lsp.type.type", "@lsp.type.class", "@lsp.type.interface",
      "@lsp.type.enum", "@lsp.type.typeParameter", "@lsp.type.namespace" }, { fg = c.type, italic = true })

-- Diagnostics ----------------------------------------------------------------
set({ "DiagnosticError" },                   { fg = c.error })
set({ "DiagnosticWarn" },                    { fg = c.warning })
set({ "DiagnosticInfo" },                    { fg = c.info })
set({ "DiagnosticHint" },                    { fg = c.hint })
set({ "DiagnosticUnderlineError" },          { undercurl = true, sp = c.error })
set({ "DiagnosticUnderlineWarn" },           { undercurl = true, sp = c.warning })
set({ "DiagnosticUnderlineInfo" },           { undercurl = true, sp = c.info })
set({ "DiagnosticUnderlineHint" },           { undercurl = true, sp = c.hint })

-- Diffs and git ----------------------------------------------------------------
set({ "DiffAdd" },                           { bg = "{{ diff_add_bg }}" })
set({ "DiffDelete" },                        { bg = "{{ diff_delete_bg }}" })
set({ "DiffChange" },                        { bg = "{{ diff_change_bg }}" })
set({ "DiffText" },                          { bg = "{{ diff_text_bg }}" })
set({ "Added", "GitSignsAdd", "diffAdded" }, { fg = c.added })
set({ "Removed", "GitSignsDelete", "diffRemoved" }, { fg = c.removed })
set({ "Changed", "GitSignsChange", "diffChanged" }, { fg = c.modified })

for group, opts in pairs(groups) do hl(group, opts) end

-- Terminal buffers (:terminal) -------------------------------------------------
local ansi = { "{{ ansi.black }}", "{{ ansi.red }}", "{{ ansi.green }}", "{{ ansi.yellow }}",
               "{{ ansi.blue }}", "{{ ansi.magenta }}", "{{ ansi.cyan }}", "{{ ansi.white }}",
               "{{ ansi.bright_black }}", "{{ ansi.bright_red }}", "{{ ansi.bright_green }}", "{{ ansi.bright_yellow }}",
               "{{ ansi.bright_blue }}", "{{ ansi.bright_magenta }}", "{{ ansi.bright_cyan }}", "{{ ansi.bright_white }}" }
for i, color in ipairs(ansi) do vim.g["terminal_color_" .. (i - 1)] = color end
