import React, { Component } from "react";
import { MapInteraction } from "./lib/react-map-interaction";

// If you want to have control over the scale and translation,
// then use the `scale`, `translation`, and `onChange` props.
export class Playground extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scale: 1,
      translation: { x: 0, y: 0 }
    };
  }

  render() {
    const { children, width, height, ...rest } = this.props;
    const { scale, translation } = this.state;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    // console.log("scale, height, width, nw, nh", scale, height, width, nw, nh);
    // console.log("translation", translation, width, height, { scale, nw, nh });
    return (
      <MapInteraction
        // onLongTap={this.props.onLongTap}
        scale={scale}
        translation={translation}
        minScale={1}
        maxScale={10}
        translationBounds={{
          xMin: -1 * (width * scale - width + halfWidth),
          xMax: width / 2,
          yMin: -1 * (height * scale - height + halfHeight),
          yMax: height / 2
        }}
        // disablePan
        onChange={({ scale, translation: { x, y } }) =>
          this.setState({
            scale: scale > 1 ? scale : 1,
            // scale,
            translation: { x, y } // { x: x < 0 ? x : 0, y: y < 0 ? y : 0 }
          })
        }
        {...rest}
      >
        {() => children({ scale, translation })}
      </MapInteraction>
    );
  }
}
