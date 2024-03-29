import { useRef, useEffect } from "react";

export function getRealMouseCoords(
  el: HTMLElement,
  event: React.MouseEvent<HTMLCanvasElement>
) {
  var totalOffsetX = 0;
  var totalOffsetY = 0;
  var canvasX = 0;
  var canvasY = 0;
  let currentElement: HTMLElement = el;

  do {
    totalOffsetX += currentElement.offsetLeft; // - currentElement.scrollLeft;
    totalOffsetY += currentElement.offsetTop; // - currentElement.scrollTop;
  } while ((currentElement = currentElement.offsetParent as HTMLElement));

  canvasX = event.pageX - totalOffsetX;
  canvasY = event.pageY - totalOffsetY;

  return { x: canvasX, y: canvasY };
}

export function useInterval(callback: () => void, delay: number) {
  const savedCallback = useRef<() => void>();

  // Remember the latest function.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current && savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export function downloadCanvasAsImage(canvas: HTMLCanvasElement) {
  let downloadLink = document.createElement("a");
  downloadLink.setAttribute("download", "CanvasAsImage.png");
  canvas.toBlob(function (blob) {
    if (blob) {
      let url = URL.createObjectURL(blob);
      downloadLink.setAttribute("href", url);
      downloadLink.click();
    }
  });
}
