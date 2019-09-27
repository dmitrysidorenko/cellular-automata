import React, { ReactElement, SyntheticEvent } from "react";
import "./IconButton.css";


export type IconButtonProps = {
  icon: React.ReactNode;
  tint: string;
  borderColor: string;
  onClick?: (e: SyntheticEvent) => void;
  width?: number;
  height?: number;
  radius?: number;
};
export function IconButton(props: IconButtonProps): ReactElement {
  const {
    icon,
    tint,
    borderColor,
    width = 48,
    height = 48,
    radius = 0,
    onClick,
    ...rest
  } = props;

  return (
    <button
      {...rest}
      className="icon-button"
      onClick={onClick}
      style={{
        borderColor,
        borderRadius: radius,
        background: tint,
        width,
        height
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          display: "inline-flex",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        {icon}
      </div>
    </button>
  );
}

IconButton.defaultProps = {
  tint: "#000000",
  borderColor: "#ffffff",
  width: 48,
  height: 48,
  radius: 12
};

