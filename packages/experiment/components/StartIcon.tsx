// The website's graffiti restacked into a square: "a2" over "f0", drawn with
// the letters, chrome, and extrusion of packages/website/public/a2f0.svg. The
// taskbar renders one, so its ids stay unique in the page.

const LETTERS = {
  a: "M244 291 401 263 452 289 438 427 493 474 402 499 373 470 293 504 201 465 185 396 205 326Z M284 348 264 412 290 438 354 414 367 334Z",
  two: "M469 293 504 243 643 233 708 271 714 337 679 379 563 451 674 438 703 400 740 480 669 507 468 516 442 461 582 356 616 328 603 300 548 307 525 341Z",
  f: "M788 232 824 210 954 190 940 247 914 270 859 264 846 308 920 289 908 341 887 358 829 372 803 514 739 542 700 514 762 386 697 402 682 361 706 338 778 319Z",
  zero: "M968 263 1070 247 1145 290 1162 391 1116 488 1001 514 913 469 900 372 921 300Z M1004 322 978 386 995 440 1054 423 1080 360 1062 309Z",
};

// "f0" moves from beside "a2" to under it.
const SECOND_ROW = "translate(-482 270)";

// The artwork's extrusion, (38, 48) deep, in fewer steps: each step's dark
// outline covers the gap to the next at this size.
const EXTRUSION_STEPS = 12;
const EXTRUSION = Array.from({ length: EXTRUSION_STEPS }, (_, index) => {
  const depth = (EXTRUSION_STEPS - index) / EXTRUSION_STEPS;
  return `translate(${(38 * depth).toFixed(2)} ${(48 * depth).toFixed(2)})`;
});

export default function StartIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      viewBox="160 225 644 644"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="start-icon-silver" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fafafa" />
          <stop offset=".22" stopColor="#c8c8c8" />
          <stop offset=".43" stopColor="#797979" />
          <stop offset=".46" stopColor="#e8e8e8" />
          <stop offset=".68" stopColor="#adadad" />
          <stop offset="1" stopColor="#414141" />
        </linearGradient>
        <linearGradient id="start-icon-depth" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#626262" />
          <stop offset=".48" stopColor="#292929" />
          <stop offset="1" stopColor="#0f0f0f" />
        </linearGradient>
        <g id="start-icon-word" fillRule="evenodd">
          <path d={LETTERS.a} />
          <path d={LETTERS.two} />
          <path d={LETTERS.f} transform={SECOND_ROW} />
          <path d={LETTERS.zero} transform={SECOND_ROW} />
        </g>
      </defs>
      <use
        href="#start-icon-word"
        transform={EXTRUSION[0]}
        fill="#0c0c0c"
        stroke="#9b9b9b"
        strokeWidth="17"
      />
      {EXTRUSION.map((transform) => (
        <use
          key={transform}
          href="#start-icon-word"
          transform={transform}
          fill="url(#start-icon-depth)"
          stroke="#101010"
          strokeWidth="12"
        />
      ))}
      <use
        href="#start-icon-word"
        fill="url(#start-icon-silver)"
        stroke="#090909"
        strokeWidth="15"
      />
    </svg>
  );
}
