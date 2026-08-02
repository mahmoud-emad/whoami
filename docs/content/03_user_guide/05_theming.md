# Theming

Both palettes live in config, under `theme.dark` and `theme.light`, and the Appearance tab edits
them.

## The colour slots

There are twelve colour slots per palette: background, text, borders, muted grey text, links, link
hover, box background, two accent backgrounds, form fields, `primary` and `info`. Each one has a
colour picker and a text field, and the text field accepts 6-digit hex or 8-digit hex with an alpha
suffix.

The last two are Vuetify's own. `primary` is behind every button, tab and switch on the site, and
`info` is the explanatory note at the top of each dashboard form — leave them out of your palette
and both stay Vuetify's factory blue, which means recolouring the site changes the page but not a
single control on it.

`error`, `success` and `warning` are deliberately not configurable: red, green and orange carry
meaning a palette should not be able to reassign.

## Which theme a visitor gets

`theme.defaultTheme` decides what a visitor gets before they touch anything, and ships as `light`.
Their own choice is remembered in local storage and always wins after that. The dark/light toggle in
the footer only appears when the two-theme switch in Site Settings is on.

## The contrast readout

Above each palette, the form shows a live contrast measurement of your text colours against your
background, with a pass or fail chip:

```
text-color on background     4.83:1  AA pass
gray-color on background     3.10:1  AA fail
```

The number is the WCAG 2.1 contrast ratio. The threshold is **4.5:1**, the WCAG AA minimum for
normal-size body text. Translucent colours are composited over the background before measuring, so
an alpha suffix does not hide a problem.

This matters because a palette that looks fine to you can be unreadable to somebody else. Low
contrast text is hardest on people with reduced vision, but it also fails for anyone on a dim phone
screen in daylight. It is the single most common accessibility defect on personal sites, and also
the easiest to avoid, because the fix is to darken one colour. This project shipped its own light
theme at 2.68:1 for a while, which is why the check is there.

If a colour cannot be read as hex, the chip says "not measurable" rather than guessing.

## See also

- [Managing content](01_managing_content.md)
- [The webring and Web Sign-In](06_indieweb.md)
