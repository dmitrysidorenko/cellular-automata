import * as React from "react";

export function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      style={{ transform: "rotate(90deg)" }}
    >
      <path
        d="M 2 18 L 2 2"
        fill="transparent"
        strokeWidth="4"
        stroke="rgb(255, 255, 255)"
        strokeLinecap="round"
      />
      <path
        d="M 18 18 L 18 2"
        fill="transparent"
        strokeWidth="4"
        stroke="rgb(255, 255, 255)"
        strokeLinecap="round"
      />
      <path
        d="M 10 18 L 10 2"
        fill="transparent"
        strokeWidth="4"
        stroke="rgb(255, 255, 255)"
        strokeLinecap="round"
      />
    </svg>
  );
}
