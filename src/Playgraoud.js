import React, { Component } from "react";
import { MapInteraction } from "./lib/react-map-interaction";

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

  componentDidMount() {
    this.props.refApi.current = {
      setScale: scale => {
        this.setState({ scale });
      }
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
    return (
      <MapInteraction
        scale={scale}
        translation={translation}
        minScale={1}
        maxScale={10}
        onChange={({ scale, translation: { x, y } }) => {
          this.setState({
            scale,
            translation: { x, y }
          });
        }}
        {...rest}
      >
        {() => {
          return children({
            scale,
            translation
          });
        }}
      </MapInteraction>
    );
  }
}
