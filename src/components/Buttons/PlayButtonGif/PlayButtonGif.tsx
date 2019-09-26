import * as React from "react";
import animate from "./animate-sprite";
import "./PlayButtonGif.css";

const frameTime = 200;
const json = {
  framesize: {
    w: 150,
    h: 150
  },
  frames: [
    { x: 0, y: 0, ms: frameTime },
    { x: 150, y: 0, ms: frameTime },
    { x: 300, y: 0, ms: frameTime },
    { x: 450, y: 0, ms: frameTime }
  ]
};

const frames = [[0, 1, 0], [0, 0, 1], [1, 1, 1]];

const cn = o =>
  Object.keys(o)
    .filter(k => o[k])
    .join(" ");

export function PlayButtonGif(props) {
  const canvasRef = React.useRef(null);
  const { running, suspend, ...rest } = props;
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current && running && animate(ref.current, json, 0);
  }, [running]);
  return (
    <button
      className={cn({
        "play-button-gif": true,
        play: running,
        suspend: suspend
      })}
      {...rest}
    >
      <div
        className="icon"
        ref={ref}
        data-play={running ? "true" : "false"}
        data-cold={suspend ? "true" : "false"}
      />
    </button>
  );
}

export default PlayButtonGif;
