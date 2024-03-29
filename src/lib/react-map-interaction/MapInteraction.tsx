import React, { Component } from "react";

import Controls from "./Controls";

import { clamp, midpoint, touchPt, touchDistance } from "./geometry";
import makePassiveEventOption from "./makePassiveEventOption";

// The amount that a value of a dimension will change given a new scale
const coordChange = (coordinate: number, scaleRatio: number) => {
  return scaleRatio * coordinate - coordinate;
};

// function isDescendant(parent, child) {
//   var node = child.parentNode;
//   while (node !== null) {
//     if (node === parent) {
//       return true;
//     }
//     node = node.parentNode;
//   }
//   return false;
// }

type Pointer = any;
type Translation = {
  x: number;
  y: number;
};
type TranslationBounds = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

type MapInteractionProps = {
  children: (props: {
    scale: number;
    translation: Translation;
  }) => React.ReactElement | React.ReactNode;
  scale: number;
  translation: Translation;
  defaultScale: number;
  defaultTranslation: Translation;
  disableZoom: boolean;
  disablePan: boolean;
  onChange: (e?: any) => void;
  translationBounds?: TranslationBounds;
  minScale: number;
  maxScale: number;
  showControls?: boolean;
  plusBtnContents?: React.ReactNode;
  minusBtnContents?: React.ReactNode;
  btnClass?: string;
  plusBtnClass?: string;
  minusBtnClass?: string;
  controlsClass?: string;
  longtapMinDuration?: number;
  longtapMaxzDuration?: number;
};

type MapInteractionState = {
  scale: number;
  translation: Translation;
  disallowChildClicks: boolean;
};

const getDesiredScale = (defaultScale: number = 1, scale?: number) => {
  let desiredScale;
  if (scale !== undefined) {
    desiredScale = scale;
  } else {
    desiredScale = defaultScale;
  }
  return desiredScale;
};

const getInitialState = (props: MapInteractionProps): MapInteractionState => {
  const {
    scale,
    minScale,
    maxScale,
    defaultScale,
    translation,
    defaultTranslation,
  } = props;
  const desiredScale = getDesiredScale(defaultScale, scale);

  return {
    scale: clamp(minScale, desiredScale, maxScale),
    translation: translation || defaultTranslation || { x: 0, y: 0 },
    disallowChildClicks: false,
  };
};

/*
  This contains logic for providing a map-like interaction to any DOM node.
  It allows a user to pinch, zoom, translate, etc, as they would an interactive map.
  It renders its children with the current state of the translation and does not do any scaling
  or translating on its own. This works on both desktop, and mobile.
*/
class MapInteraction extends Component<
  MapInteractionProps,
  MapInteractionState
> {
  static defaultProps = {
    minScale: 0.05,
    maxScale: 3,
    showControls: false,
    translationBounds: {},
    disableZoom: false,
    disablePan: false,
    longtapMinDuration: 1000,
    longtapMaxDuration: 3000,
  };

  state = getInitialState(this.props);
  startPointerInfo?: any;
  containerNodeRef = React.createRef<HTMLDivElement>();
  containerNode: HTMLDivElement | null = this.containerNodeRef.current || null;

  componentDidMount() {
    this.containerNode = this.containerNodeRef.current;
    const passiveOption = makePassiveEventOption(false);

    this.containerNode &&
      this.containerNode.addEventListener("wheel", this.onWheel, passiveOption);

    /*
      Setup events for the gesture lifecycle: start, move, end touch
    */

    // start gesture
    this.containerNode &&
      this.containerNode.addEventListener(
        "touchstart",
        this.onTouchDown,
        passiveOption
      );
    this.containerNode &&
      this.containerNode.addEventListener(
        "mousedown",
        this.onMouseDown,
        passiveOption
      );

    // // move gesture
    window.addEventListener("touchmove", this.onTouchMove, passiveOption);
    window.addEventListener("mousemove", this.onMouseMove, passiveOption);

    // /*
    //   end gesture

    //   These events that signify an end to a drag (touchend, mouseup)
    //   are attached to the window for two reasons. 1) the UX requires it, and 2)
    //   we use stop propagation on these events in `handleTouchOrClickCapture`. We
    //   want the event handlers here to not be short circuited by that stop prop, so
    //   we attach at the window level and use `capture` to ensure they get called first.
    // */
    const touchAndMouseEndOptions = { capture: true, ...passiveOption };
    window.addEventListener(
      "touchend",
      this.onTouchEnd,
      touchAndMouseEndOptions
    );
    window.addEventListener("mouseup", this.onMouseUp, touchAndMouseEndOptions);
  }

  UNSAFE_componentWillReceiveProps(newProps: MapInteractionProps) {
    const scale =
      newProps.scale !== undefined ? newProps.scale : this.state.scale;
    const translation = newProps.translation || this.state.translation;

    // if parent has overridden state then abort current user interaction
    if (
      translation.x !== this.state.translation.x ||
      translation.y !== this.state.translation.y ||
      scale !== this.state.scale
    ) {
      this.setPointerState();
    }

    this.setState({
      scale: clamp(newProps.minScale, scale, newProps.maxScale),
      translation: this.clampTranslation(translation, newProps),
    });
  }

  componentWillUnmount() {
    this.containerNode &&
      this.containerNode.removeEventListener("wheel", this.onWheel);

    // Remove touch events
    this.containerNode &&
      this.containerNode.removeEventListener("touchstart", this.onTouchDown);
    window.removeEventListener("touchmove", this.onTouchMove);
    window.removeEventListener("touchend", this.onTouchEnd);

    // Remove mouse events
    this.containerNode &&
      this.containerNode.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
  }

  updateParent = () => {
    if (!this.props.onChange) {
      return;
    }
    const { scale, translation } = this.state;
    this.props.onChange({ scale, translation });
  };

  /*
    Event handlers

    All touch/mouse handlers preventDefault because we add
    both touch and mouse handlers in the same session to support devicse
    with both touch screen and mouse inputs. The browser may fire both
    a touch and mouse event for a *single* user action, so we have to ensure
    that only one handler is used by canceling the event in the first handler.

    https://developer.mozilla.org/en-US/docs/Web/API/Touch_events/Supporting_both_TouchEvent_and_MouseEvent
  */

  onMouseDown = (e: any) => {
    // console.log("onMouseDown", e);
    // e.preventDefault();
    this.setPointerState([e]);
  };

  onTouchDown = (e: any) => {
    // e.preventDefault();
    this.setPointerState(e.touches);
  };

  onMouseUp = (e: any) => {
    this.setPointerState();
  };

  onTouchEnd = (e: any) => {
    this.setPointerState(e.touches);
  };

  onMouseMove = (e: any) => {
    if (!this.startPointerInfo || this.props.disablePan) {
      return;
    }
    e.preventDefault();
    this.onDrag(e);
  };

  onTouchMove = (e: any) => {
    if (!this.startPointerInfo) {
      return;
    }

    e.preventDefault();

    const { disablePan, disableZoom } = this.props;

    const isPinchAction =
      e.touches.length === 2 && this.startPointerInfo.pointers.length > 1;
    if (isPinchAction && !disableZoom) {
      this.scaleFromMultiTouch(e);
    } else if (e.touches.length === 1 && this.startPointerInfo && !disablePan) {
      this.onDrag(e.touches[0]);
    }
  };

  // handles both touch and mouse drags
  onDrag = (pointer: Pointer) => {
    const { translation, pointers } = this.startPointerInfo;
    const startPointer = pointers[0];
    const dragX = pointer.clientX - startPointer.clientX;
    const dragY = pointer.clientY - startPointer.clientY;
    const newTranslation = {
      x: translation.x + dragX,
      y: translation.y + dragY,
    };

    this.setState(
      {
        translation: this.clampTranslation(newTranslation),
        disallowChildClicks: Boolean(Math.abs(dragX) + Math.abs(dragY) > 2),
      },
      () => this.updateParent()
    );
  };

  onWheel = (e: any) => {
    if (this.props.disableZoom) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const scaleChange = 2 ** (e.deltaY * 0.002);

    const newScale = clamp(
      this.props.minScale,
      this.state.scale + (1 - scaleChange),
      this.props.maxScale
    );

    const mousePos = this.clientPosToTranslatedPos({
      x: e.clientX,
      y: e.clientY,
    });

    this.scaleFromPoint(newScale, mousePos);
  };

  setPointerState = (pointers?: Pointer[]) => {
    if (!pointers || pointers.length === 0) {
      this.startPointerInfo = undefined;
      return;
    }

    this.startPointerInfo = {
      timestamp: Date.now(),
      pointers,
      scale: this.state.scale,
      translation: this.state.translation,
    };
  };

  clampTranslation = (
    desiredTranslation: Translation,
    props: MapInteractionProps = this.props
  ) => {
    const { x, y } = desiredTranslation;
    let { xMax, xMin, yMax, yMin } =
      props.translationBounds as TranslationBounds;
    xMin = xMin !== undefined ? xMin : -Infinity;
    yMin = yMin !== undefined ? yMin : -Infinity;
    xMax = xMax !== undefined ? xMax : Infinity;
    yMax = yMax !== undefined ? yMax : Infinity;

    return {
      x: clamp(xMin, x, xMax),
      y: clamp(yMin, y, yMax),
    };
  };

  translatedOrigin = (translation: Translation = this.state.translation) => {
    const clientOffset =
      this.containerNode && this.containerNode.getBoundingClientRect();
    return {
      x: ((clientOffset && clientOffset.left) || 0) + translation.x,
      y: ((clientOffset && clientOffset.top) || 0) + translation.y,
    };
  };

  clientPosToTranslatedPos = (
    tr: Translation,
    translation = this.state.translation
  ) => {
    const { x, y } = tr;
    const origin = this.translatedOrigin(translation);
    return {
      x: x - origin.x,
      y: y - origin.y,
    };
  };

  scaleFromPoint = (newScale: number, focalPt: Translation) => {
    const { translation, scale } = this.state;
    const scaleRatio = newScale / (scale !== 0 ? scale : 1);

    const focalPtDelta = {
      x: coordChange(focalPt.x, scaleRatio),
      y: coordChange(focalPt.y, scaleRatio),
    };

    const newTranslation = {
      x: translation.x - focalPtDelta.x,
      y: translation.y - focalPtDelta.y,
    };

    this.setState(
      {
        scale: newScale,
        translation: this.clampTranslation(newTranslation),
      },
      () => this.updateParent()
    );
  };

  scaleFromMultiTouch = (e: any) => {
    const startTouches = this.startPointerInfo.pointers;
    const newTouches = e.touches;

    // calculate new scale
    const dist0 = touchDistance(startTouches[0], startTouches[1]);
    const dist1 = touchDistance(newTouches[0], newTouches[1]);
    const scaleChange = dist1 / dist0;

    const startScale = this.startPointerInfo.scale;
    const targetScale = startScale + (scaleChange - 1) * startScale;
    const newScale = clamp(
      this.props.minScale,
      targetScale,
      this.props.maxScale
    );

    // calculate mid points
    const newMidPoint = midpoint(
      touchPt(newTouches[0]),
      touchPt(newTouches[1])
    );
    const startMidpoint = midpoint(
      touchPt(startTouches[0]),
      touchPt(startTouches[1])
    );

    const dragDelta = {
      x: newMidPoint.x - startMidpoint.x,
      y: newMidPoint.y - startMidpoint.y,
    };

    const scaleRatio = newScale / startScale;

    const focalPt = this.clientPosToTranslatedPos(
      startMidpoint,
      this.startPointerInfo.translation
    );
    const focalPtDelta = {
      x: coordChange(focalPt.x, scaleRatio),
      y: coordChange(focalPt.y, scaleRatio),
    };

    const newTranslation = {
      x: this.startPointerInfo.translation.x - focalPtDelta.x + dragDelta.x,
      y: this.startPointerInfo.translation.y - focalPtDelta.y + dragDelta.y,
    };

    this.setState(
      {
        scale: newScale,
        translation: this.clampTranslation(newTranslation),
      },
      () => this.updateParent()
    );
  };

  discreteScaleStepSize = () => {
    const { minScale, maxScale } = this.props;
    const delta = Math.abs(maxScale - minScale);
    return delta / 10;
  };

  changeScale = (delta: number) => {
    if (this.containerNode) {
      const targetScale = this.state.scale + delta;
      const { minScale, maxScale } = this.props;
      const scale = clamp(minScale, targetScale, maxScale);

      const rect = this.containerNode.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      const focalPoint = this.clientPosToTranslatedPos({ x, y });
      this.scaleFromPoint(scale, focalPoint);
    }
  };

  renderControls = () => {
    const step = this.discreteScaleStepSize();
    return (
      <Controls
        onClickPlus={() => this.changeScale(step)}
        onClickMinus={() => this.changeScale(-step)}
        plusBtnContents={this.props.plusBtnContents}
        minusBtnContents={this.props.minusBtnContents}
        btnClass={this.props.btnClass}
        plusBtnClass={this.props.plusBtnClass}
        minusBtnClass={this.props.minusBtnClass}
        controlsClass={this.props.controlsClass}
        scale={this.state.scale}
        minScale={this.props.minScale}
        maxScale={this.props.maxScale}
        disableZoom={this.props.disableZoom}
      />
    );
  };

  render() {
    const { showControls, children } = this.props;
    const { scale } = this.state;
    // Defensively clamp the translation. This should not be necessary if we properly set state elsewhere.
    const translation = this.clampTranslation(this.state.translation);

    // If we are in the middle of a drag then stop click/touch
    // events from propagating down. We do this so content inside
    // of the map is not clickable or touchable during a drag.
    const handleTouchOrClickCapture = (e: React.SyntheticEvent) => {
      if (this.state.disallowChildClicks) {
        e.stopPropagation();
        this.setState({ disallowChildClicks: false });
      }
    };
    // console.dir(this.containerNode);
    return (
      <div
        ref={this.containerNodeRef}
        style={{
          height: "100%",
          width: "100%",
          position: "relative", // for absolutely positioned children
          touchAction: "none",
        }}
        onClickCapture={handleTouchOrClickCapture}
        onTouchEndCapture={handleTouchOrClickCapture}
      >
        {children({
          translation,
          scale,
          // offsetHeight: getOffsetHeight(this.containerNode),
          // offsetWidth: getOffsetWidth(this.containerNode)
        })}
        {(showControls || undefined) && this.renderControls()}
      </div>
    );
  }
}
// const getOffsetHeight = (el: HTMLElement) => (el && el.clientHeight) || 0;
// const getOffsetWidth = (el: HTMLElement) => (el && el.offsetWidth) || 0;

export default MapInteraction;
