import * as React from "react";

export function CleanIcon() {
  return (
    <div
      style={{
        width: 20,
        height: 20
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
        <path
          d="M 0 0.279 C 19.206 0.024 21 0 21 0"
          transform="translate(-0.917 9.63) rotate(45 10.5 0.5)"
          fill="transparent"
          strokeWidth="4"
          stroke="rgb(255, 255, 255)"
          strokeLinecap="round"
        />
        <path
          d="M 0.279 0 C 0.024 19.206 0 21 0 21"
          transform="translate(9 0) rotate(45 0.5 10.5)"
          fill="transparent"
          strokeWidth="4"
          stroke="rgb(255, 255, 255)"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
