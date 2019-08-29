export function setup(cb) {
  const measureWidthNode = document.getElementById("zoomMeasureId");
  function measure() {
    cb(
      Math.round((1000 * measureWidthNode.offsetWidth) / window.innerWidth) /
        1000
    );
  }

  window.addEventListener("orientationchange", measure);
  window.addEventListener("resize", measure);

  return () => {
    window.removeEventListener("orientationchange", measure);
    window.removeEventListener("resize", measure);
  };
}
