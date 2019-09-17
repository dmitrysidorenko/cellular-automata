import React, { Component } from "react";
import { MapInteraction } from "./lib/react-map-interaction";

// If you want to have control over the scale and translation,
// then use the `scale`, `translation`, and `onChange` props.
export class Playground extends Component {
  constructor(props) {
    super(props);
    const { width, height } = props;
    let startX = 0;
    let startY = 0;
    if (width > 0 && height > 0) {
      const min = Math.min(width, height);
      const max = Math.max(width, height);
      const h = max - min / 2;
      if (width > height) {
        startX = h;
      } else {
        startY = h;
      }
    }
    // const offsetX =
    this.state = {
      scale: 1,
      translation: { x: startX, y: startY }
    };
  }

  componentDidUpdate(prevProps) {
    const { width: prevWidth, height: prewHeight } = prevProps;
    const { width, height } = this.props;
    // const { width, height } = prevProps;
    if (prevWidth === 0 && prewHeight === 0 && width !== height) {
      const min = Math.min(width, height);
      const max = Math.max(width, height);
      const h = (max - min) / 2;
      let startX = 0;
      let startY = 0;
      if (width > height) {
        startX = h;
      } else {
        startY = h;
      }
      this.setState({ translation: { x: startX, y: startY } });
    }
  }

  render() {
    const { children, width, height, ...rest } = this.props;
    const { scale, translation } = this.state;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const halfMin = Math.min(height, width) / 2;
    // console.log("scale, height, width, nw, nh", scale, height, width, nw, nh);
    // console.log("translation", translation, width, height, { scale, nw, nh });
    // console.log("tr", translation);
    return (
      <MapInteraction
        // onLongTap={this.props.onLongTap}
        scale={scale}
        translation={translation}
        minScale={1}
        maxScale={10}
        // translationBounds={{
        //   xMin: -1 * (scale * halfMin),
        //   xMax: width - scale * halfMin,
        //   yMin: -1 * (scale * halfMin),
        //   yMax: height - scale * halfMin
        // }}
        // disablePan
        onChange={({ scale, translation: { x, y } }) => {
          this.setState({
            scale,
            translation: { x, y }
          });
        }}
        {...rest}
      >
        {() => {
          // console.log("scale:", scale);
          return children({
            scale,
            translation //: { x: translation.x % width, y: translation.y % height }
          });
        }}
      </MapInteraction>
    );
  }
}
