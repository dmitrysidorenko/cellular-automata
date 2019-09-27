import * as React from "react";
// import animate from "./animate-sprite";
// import "./PlayButtonGif.css";
import Button from '../PlasticButton'


export function PlayButtonGif(props: any) {
  const { running, suspend, ...rest } = props;
  return (
    <Button size="medium" type={running ? 'danger' : suspend ? "secondary" : "primary"}
      {...rest}>
      {running || suspend ? 'Pause' : 'Play'}
    </Button>
  );
}

export default PlayButtonGif;
