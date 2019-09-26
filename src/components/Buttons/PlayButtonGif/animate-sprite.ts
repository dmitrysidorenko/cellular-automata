type FramesSettings = {
  framesize: {
    w: number;
    h: number;
  };
  frames: {
    x: number;
    y: number;
    ms: number;
  }[];
};

export default function animateSprite(
  div: HTMLElement,
  data: FramesSettings,
  pos: number = 0
): number | void {
  const now = Date.now();
  var stopAttribute = div.getAttribute("data-play");
  if (stopAttribute === "false" && pos !== 0) {
    console.log("animate");
    return;
  }
  const frames = data.frames;
  const frame = frames[pos];
  const x = frame.x;
  const y = frame.y;
  const ms = frame.ms;
  const offsets = "-" + x + "px -" + y + "px";
  div.style.backgroundPosition = offsets;
  // div.innerText = "Frame " + pos;
  const newPos = frames[pos + 1] ? pos + 1 : 0;
  const step = () => {
    if (Date.now() - now >= ms) {
      animateSprite(div, data, newPos);
    } else {
      requestAnimationFrame(step);
    }
  };
  return requestAnimationFrame(step);
}
