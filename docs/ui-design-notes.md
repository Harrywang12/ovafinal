# Volley Ref Lab UI direction

The interface keeps the existing red and white identity, with warm off-white surfaces, charcoal text, Barlow Condensed headlines, and DM Sans body copy. Photography, ruled sections, and court graphics replace floating orbs, translucent cards, emoji features, and excessive entrance animations.

## Design references reviewed

- [USA Volleyball by Clique Studios](https://cliquestudios.com/work/usav): sports photography, purposeful navigation, audience-specific education, and an athletic visual identity.
- [REFSIX](https://refsix.com/home): referee-specific language, clear training features, performance visuals, and an association section.
- [League One Volleyball by ThreeDark](https://threedark.com/work/lovb): strong typography, full-size athlete photography, and intentional colour blocks.

These informed the visual direction; the implementation is original.

## Assets and content

- Existing local editorial photographs are retained across the homepage, sign-in, and training mastheads.
- The OVA logo was downloaded from the image referenced by the [official Ontario Volleyball Association website](https://www.ontariovolleyball.org/): https://cdn1.sportngin.com/attachments/logo_graphic/37e8-215516432/Primary_Preferred_small_small.png
- The endorsement wording was requested by the project owner.
- Barlow Condensed is self-hosted through `next/font/local` from the `@fontsource/barlow-condensed` package, which includes its font licence.
- Court diagrams are accessible SVGs. Rotation moves clockwise; the line-call preview demonstrates that a ball touching a boundary line is in.

## Verification

- ESLint and TypeScript checks pass.
- Next production build passes using temporary public Supabase configuration. The checkout is missing real Supabase environment values, so authenticated data flows could not be verified.
- Browser checks covered desktop, tablet, and narrow-phone widths, loaded homepage images, mobile navigation, sign-up field visibility, the rulebook PDF fallback, rotation controls, and line-call controls.
- No overflow or clipped text was found on the homepage at 320, 390, 768, or 1280 pixels.
