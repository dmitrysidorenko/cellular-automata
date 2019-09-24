import React, { ReactElement } from "react";
import "./Page.css";

type Props = {
  children: ReactElement[];
};

export const Page = (props: Props): ReactElement => (
  <div className="page">{props.children}</div>
);

export default Page;
