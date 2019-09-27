import * as React from "react";
import "./PlasticButton.css";

const cn = (o: {[key:string]: boolean}) =>
  Object.keys(o)
    .filter(k => o[k])
    .join(" ");

const cl2cn = (s:string): {[key:string]: boolean} => s.split(/\s/).reduce((acc, c) => ({...acc, [c]: true}), {})

export type ButtonType = 'regular' | 'primary' | 'secondary' | 'danger'
export type ButtonSize = 'small' | 'medium' | 'large'

export type PlasticButtonProps = {
  type?: ButtonType,
  size?: ButtonSize,
  className?: string
  children: React.ReactElement | string,
  onClick?: (e:React.SyntheticEvent) => void
}
export function PlasticButton(props: PlasticButtonProps): React.ReactElement {
  const { className = '', children, type = 'regular', size = 'medium', ...rest } = props;
  const cl = cn({
    ...cl2cn(className),
    PlasticButton: true,
    primary: type  === 'primary',
    secondary: type  === 'secondary',
    danger: type  === 'danger',
    regular: size === 'small',
    small: size === 'small',
    medium: size === 'medium',
    large: size === 'large',
  })

  return (
    <button
      className={cl}
      {...rest}
    >
      {children}
    </button>
  );
}

export default PlasticButton;
