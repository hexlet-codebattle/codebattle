import React, { useId } from "react";

function RustOriginalIcon({ className = "", size = "120" }) {
  const uid = useId();
  const id = (name) => `rust-original-${uid}-${name}`;

  return (
    <svg
      version="1.1"
      height={size}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      className={`text-[#dea584] dark:text-neutral-100 ${className}`}
      style={{ stroke: "currentColor", fill: "none" }}
    >
      <g id={id("logo")} transform="translate(60, 60)">
        <path
          id={id("r")}
          transform="translate(0.5, 0.5)"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
          d="
          M -9,-15 H 4 C 12,-15 12,-7 4,-7 H -9 Z
          M -40,22 H 0 V 11 H -9 V 3 H 1 C 12,3 6,20 15,22 H 40
          V 3 H 34 V 5 C 34,13 24,12 24,7 C 23,2 19,-2 18,-2 C 33,-10 24,-26 12,-26 H -35
          V -15H -25 V 11 H -40 Z"
        />
        <g id={id("gear")} mask={`url(#${id("holes")})`}>
          <circle r="43" fill="none" stroke="currentColor" strokeWidth="9" />
          <g id={id("cogs")}>
            <polygon
              id={id("cog")}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
              points="46,3 51,0 46,-3"
            />
            {/* eslint-disable react/no-array-index-key */}
            {[...Array(31)].map((_, i) => (
              <use
                key={`cog-${i}`}
                xlinkHref={`#${id("cog")}`}
                transform={`rotate(${11.25 * (i + 1)})`}
              />
            ))}
            {/* eslint-enable react/no-array-index-key */}
          </g>
          <g id={id("mounts")}>
            <polygon
              id={id("mount")}
              stroke="currentColor"
              strokeWidth="6"
              strokeLinejoin="round"
              points="-7,-42 0,-35 7,-42"
            />
            {/* eslint-disable react/no-array-index-key */}
            {[...Array(4)].map((_, i) => (
              <use
                key={`mount-${i}`}
                xlinkHref={`#${id("mount")}`}
                transform={`rotate(${72 * (i + 1)})`}
              />
            ))}
            {/* eslint-enable react/no-array-index-key */}
          </g>
        </g>
        <mask id={id("holes")}>
          <rect x="-60" y="-60" width="120" height="120" fill="white" />
          <circle id={id("hole")} cy="-40" r="3" />
          {/* eslint-disable react/no-array-index-key */}
          {[...Array(4)].map((_, i) => (
            <use
              key={`hole-${i}`}
              xlinkHref={`#${id("hole")}`}
              transform={`rotate(${72 * (i + 1)})`}
            />
          ))}
          {/* eslint-enable react/no-array-index-key */}
        </mask>
      </g>
    </svg>
  );
}

export default RustOriginalIcon;
