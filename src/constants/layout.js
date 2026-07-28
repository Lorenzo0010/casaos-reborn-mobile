/**
 * CasaOS Reborn Mobile — Layout Design Tokens
 * 
 * Single source of truth for all dimensional values in the app.
 * Import from here instead of using magic numbers.
 */

// ─── Base Spacing Scale ─────────────────────────────────────────────
export const SPACING = {
  xs: 4,       // micro internal spacing
  sm: 8,       // small gaps
  md: 12,      // gap between header action buttons
  base: 16,    // UNIVERSAL spacing: card gap, screen padding, margins
  lg: 24,      // large section padding (tablet screen padding)
  xl: 32,      // internal pill padding
};

// ─── Header / Title Pill ────────────────────────────────────────────
export const HEADER = {
  pillHeight: 56,
  pillRadius: 32,
  pillPaddingH: SPACING.xl,       // horizontal padding inside the pill
  titleFontSize: 24,

  actionSize: 44,                  // circular action button size
  actionRadius: 22,                // half of actionSize
  actionGap: SPACING.md,           // gap between action buttons AND between pill and first button

  topGap: SPACING.base,            // gap between safe area top and pill
  contentGap: SPACING.base,        // gap between pill bottom and first content item (= base)

  // Derived: total offset from safe area top to first content
  // totalOffset = topGap + pillHeight + contentGap
  get totalOffset() {
    return this.topGap + this.pillHeight + this.contentGap;
  },

  fadeHeight: 120,                  // gradient fade behind header
  backIconSize: 28,

  // Pill visual style
  elevation: 8,
  shadowOpacity: 0.3,
  shadowRadius: 8,
  borderWidth: 1,
};

// ─── Cards ──────────────────────────────────────────────────────────
export const CARD = {
  borderRadius: 16,               // unified across ALL screens
  padding: SPACING.base,
  gap: SPACING.base,              // vertical gap between cards (= base)
  borderWidth: 1,
  elevation: 3,
  shadowOpacity: 0.1,
  shadowRadius: 8,
};

// ─── Bottom Navbar ──────────────────────────────────────────────────
export const NAVBAR = {
  height: 64,
  radius: 32,
  bottomGap: SPACING.base,
  maxWidthPhone: 260,
  maxWidthTablet: 360,
  sideMargin: 48,                 // total horizontal margin (24 each side)
};

// ─── Bottom Fade ────────────────────────────────────────────────────
export const FADE = {
  height: 60,
};

// ─── Content Padding ────────────────────────────────────────────────
// Bottom padding = enough to clear navbar + gap + fade
export const CONTENT = {
  paddingBottom: 120,
};

// ─── Tablet / Responsive ────────────────────────────────────────────
export const TABLET = {
  breakpoint: 768,
  wideBreakpoint: 1024,
  maxContentWidth: 900,
  columnGap: SPACING.base,
  screenPadding: SPACING.lg,     // tablet gets more breathing room
};

// ─── Helper: get screen padding based on width ──────────────────────
export const getScreenPadding = (windowWidth) =>
  windowWidth >= TABLET.breakpoint ? TABLET.screenPadding : SPACING.base;

// ─── Helper: get number of columns based on width ───────────────────
export const getColumns = (windowWidth) => {
  if (windowWidth >= TABLET.wideBreakpoint) return 3;
  if (windowWidth >= TABLET.breakpoint) return 2;
  return 1;
};

// ─── Helper: check if tablet ────────────────────────────────────────
export const isTabletWidth = (windowWidth) =>
  windowWidth >= TABLET.breakpoint;

// ─── Helper: get navbar bar width ───────────────────────────────────
export const getNavbarWidth = (windowWidth) => {
  const maxWidth = windowWidth >= TABLET.breakpoint
    ? NAVBAR.maxWidthTablet
    : NAVBAR.maxWidthPhone;
  return Math.min(windowWidth - NAVBAR.sideMargin, maxWidth);
};
