// {{ meta.slug }} for Blink Shell
// Generated from palette.toml by build.py. Edit templates/blink/neoplasticism.js instead.
// Install: Settings > Appearance > Themes > Add, then paste the raw GitHub URL of this file:
//   https://raw.githubusercontent.com/{{ meta.publisher }}/{{ meta.slug }}/main/dist/blink/neoplasticism.js

black        = '{{ ansi.black }}';
red          = '{{ ansi.red }}';
green        = '{{ ansi.green }}';
yellow       = '{{ ansi.yellow }}';
blue         = '{{ ansi.blue }}';
magenta      = '{{ ansi.magenta }}';
cyan         = '{{ ansi.cyan }}';
white        = '{{ ansi.white }}';
lightBlack   = '{{ ansi.bright_black }}';
lightRed     = '{{ ansi.bright_red }}';
lightGreen   = '{{ ansi.bright_green }}';
lightYellow  = '{{ ansi.bright_yellow }}';
lightBlue    = '{{ ansi.bright_blue }}';
lightMagenta = '{{ ansi.bright_magenta }}';
lightCyan    = '{{ ansi.bright_cyan }}';
lightWhite   = '{{ ansi.bright_white }}';

t.prefs_.set('color-palette-overrides',
  [black, red, green, yellow,
   blue, magenta, cyan, white,
   lightBlack, lightRed, lightGreen, lightYellow,
   lightBlue, lightMagenta, lightCyan, lightWhite]);

t.prefs_.set('cursor-color', 'rgba({{ accent | rgb }}, 0.75)');
t.prefs_.set('foreground-color', '{{ fg }}');
t.prefs_.set('background-color', '{{ bg }}');
