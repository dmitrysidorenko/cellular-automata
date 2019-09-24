import * as React from "react";
import { addPropertyControls, ControlType, StackProperties } from "framer";
import "./ButtonsSet.css";

// Open Preview: Command + P
// Learn more: https://framer.com/api
type Props = Partial<StackProperties>;
export function ButtonsSet(props: Props) {
  const { children, ...rest } = props;
  return (
    <div {...rest} className="buttons-set">
      {children}
    </div>
  );
}

addPropertyControls(ButtonsSet, {
  children: {
    type: ControlType.Array,
    propertyControl: {
      type: ControlType.ComponentInstance
    },
    maxCount: 5
  }
});
