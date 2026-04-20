"use client";

// Vector DURU logo — built from a 5×6 block grid per letter, rendered as
// SVG <rect> shapes. Vector geometry projects through drei's <Html transform>
// matrix without sub-pixel jitter, so columns stay perfectly aligned at any
// zoom. Visual style mimics the original "ANSI Shadow" double-line ASCII:
// solid mauve blocks with a darker mauve outline drawn as a 1-unit inset
// stroke, plus a faint outer glow.

type Letter = number[][]; // 1 = filled cell, 0 = empty

const D: Letter = [
  [1, 1, 1, 1, 1, 0],
  [1, 1, 0, 0, 1, 1],
  [1, 1, 0, 0, 1, 1],
  [1, 1, 0, 0, 1, 1],
  [1, 1, 1, 1, 1, 0],
];

const U: Letter = [
  [1, 1, 0, 0, 1, 1],
  [1, 1, 0, 0, 1, 1],
  [1, 1, 0, 0, 1, 1],
  [1, 1, 0, 0, 1, 1],
  [0, 1, 1, 1, 1, 0],
];

const R: Letter = [
  [1, 1, 1, 1, 1, 0],
  [1, 1, 0, 0, 1, 1],
  [1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 0, 0],
  [1, 1, 0, 1, 1, 0],
];

// 2×2 arrangement: DU on top row, RU on bottom row.
const LETTER_ROWS: Letter[][] = [
  [D, U],
  [R, U],
];
const ROW_COUNT = LETTER_ROWS.length;
const LETTERS_PER_ROW = LETTER_ROWS[0].length;
const ROWS_PER_LETTER = 5;
const LETTER_COLS = 6;
const COL_SEP = 1; // gap between letters in a row
const ROW_SEP = 1; // gap between letter rows
const COLS = LETTERS_PER_ROW * LETTER_COLS + (LETTERS_PER_ROW - 1) * COL_SEP;
const TOTAL_ROWS = ROW_COUNT * ROWS_PER_LETTER + (ROW_COUNT - 1) * ROW_SEP;

const CELL = 10; // SVG user units per cell
const W = COLS * CELL;
const H = TOTAL_ROWS * CELL;

interface DuruLogoProps {
  /** Pixel height. If omitted, the logo fills its parent container height. */
  height?: number;
}

export function DuruLogo({ height }: DuruLogoProps) {
  const cells: { x: number; y: number }[] = [];
  LETTER_ROWS.forEach((row, rowIdx) => {
    const rowOffset = rowIdx * (ROWS_PER_LETTER + ROW_SEP);
    row.forEach((letter, li) => {
      const colOffset = li * (LETTER_COLS + COL_SEP);
      letter.forEach((letterRow, ri) => {
        letterRow.forEach((cell, ci) => {
          if (cell)
            cells.push({
              x: (colOffset + ci) * CELL,
              y: (rowOffset + ri) * CELL,
            });
        });
      });
    });
  });

  const fill = height === undefined;
  const pxWidth = fill ? undefined : ((height ?? 0) * W) / H;
  return (
    <svg
      width={fill ? undefined : pxWidth}
      height={fill ? "100%" : height}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMinYMid meet"
      role="img"
      aria-label="DURU"
      shapeRendering="crispEdges"
      style={{
        display: "block",
        filter: "drop-shadow(0 0 6px rgba(203, 166, 247, 0.45))",
        ...(fill
          ? { width: "auto", height: "100%" }
          : { marginBottom: 14 }),
      }}
    >
      {cells.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y}
          width={CELL}
          height={CELL}
          fill="var(--mauve)"
        />
      ))}
    </svg>
  );
}
