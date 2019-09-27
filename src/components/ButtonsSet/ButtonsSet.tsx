import * as React from "react";
import "./ButtonsSet.css";

export function ButtonsSet(props: any) {
  const { children, ...rest } = props;
  return (
    <div {...rest} className="buttons-set">
      {children}
    </div>
  );
}
