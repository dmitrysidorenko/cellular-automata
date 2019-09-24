import React, { ReactElement, SyntheticEvent } from "react";
import { addPropertyControls, ControlType } from "framer";
import "./IconButton.css";

// Open Preview: Command + P
// Learn more: https://framer.com/api

type Props = {
  icon: React.ReactNode;
  tint: string;
  borderColor: string;
  onClick?: (e: SyntheticEvent) => void;
  width?: number;
  height?: number;
  radius?: number;
};
export function IconButton(props: Props): ReactElement {
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

// Learn more: https://framer.com/api/property-controls/
addPropertyControls(IconButton, {
  icon: {
    title: "Icon",
    type: ControlType.ComponentInstance
  },
  tint: {
    title: "Tint",
    type: ControlType.Color,
    defaultValue: "#000000"
  },
  borderColor: {
    title: "BorderColor",
    type: ControlType.Color,
    defaultValue: "#ffffff"
  }
});
