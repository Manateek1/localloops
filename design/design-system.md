# GreetMe visual system

GreetMe uses a warm paper surface, deep forest green for primary actions, softened sage for community and map surfaces, and a small sun-coral accent. The system favors friendly editorial type, rounded but quiet controls, clear event photography, and open spacing.

## Tokens

- Paper: `#f7f5ee`
- Surface: `#fffefa`
- Forest: `#0b4a37`
- Deep forest: `#073a2c`
- Ink: `#17231f`
- Muted ink: `#68716b`
- Sage: `#e9eee5`
- Border: `#e6e3d8`
- Sun coral: `#ee9367`
- Radius: 18–24px for feature surfaces; 12–16px for controls
- Type: system sans stack led by Avenir/Inter when installed; compact, readable UI labels

## Primary surfaces

- Explore: Map/List toggle, location search for U.S. towns and ZIP codes, event filters, an OpenStreetMap-based map, and nearby listings from configured public sources.
- Event detail: event image when supplied by the source, date and public place, RSVP, and broad-area ride coordination.
- Community and Inbox: member profiles, connection requests, and messaging backed by Supabase; profiles stay private until a member opts into discovery.
- GreetMe guide: the friendly sprout character anchors the visual identity. AI responses and voice are not enabled yet.

## Responsive behavior

The mobile layout follows the board’s bottom navigation and single-column content. Wider screens use a restrained top navigation and split map/list or profile/detail layouts while keeping the same type, color, and component hierarchy.
