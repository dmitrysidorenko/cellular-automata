import React, { Component } from "react";
import { MapInteraction } from "./lib/react-map-interaction";

interface IPlaygroundProps {
  refApi: React.MutableRefObject<{
    scale: number;
    translation: { x: number; y: number };
  }>;
  minScale: number;
  maxScale: number;
}
export class Playground extends Component<
  React.PropsWithChildren<IPlaygroundProps>,
  {
    scale: number;
    translation: { x: number; y: number };
  }
> {
  constructor(props: IPlaygroundProps) {
    super(props);
    let startX = 0;
    let startY = 0;
    this.state = {
      scale: 1,
      translation: { x: startX, y: startY },
    };
  }

  componentDidMount() {
    this.props.refApi.current.scale = 1;
  }

  onChange = ({
    scale,
    translation: { x, y },
  }: {
    scale: number;
    translation: { x: number; y: number };
  }) => {
    this.props.refApi.current.scale = scale;
    this.props.refApi.current.translation.x = x;
    this.props.refApi.current.translation.y = y;
    this.setState({
      scale,
      translation: { x, y },
    });
  };

  render() {
    const { children, minScale, maxScale } = this.props;
    const { scale, translation } = this.state;
    return (
      <MapInteraction
        disablePan={false}
        disableZoom={false}
        scale={scale}
        defaultTranslation={translation}
        translation={translation}
        defaultScale={1}
        minScale={minScale}
        maxScale={maxScale}
        onChange={this.onChange}
      >
        {() => children}
      </MapInteraction>
    );
  }
}
