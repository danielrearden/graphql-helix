import * as React from "react";
import { ToolbarButton } from "graphiql/dist/components/ToolbarButton";

type ToolbarDropDownOption = {
  title: string;
  value: string;
};

const ToolbarDropDownMenu = (props: { children: React.ReactNode }) => {
  return <div className="toolbar-drop-down-menu">{props.children}</div>;
};

const ToolbarDropDownMenuItem = <TOption extends ToolbarDropDownOption>(props: {
  item: TOption;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      className="toolbar-drop-down-menu-item"
      title={props.item.title}
      onClick={props.onClick}
    >
      {props.item.title}
    </button>
  );
};

export const ToolbarDropDown = <TOption extends ToolbarDropDownOption>(props: {
  options: Array<TOption>;
  activeOptionIndex: number;
  placeholder?: string;
  onSelectOption: (optionIndex: number) => void;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedOption = props.options[props.activeOptionIndex] ?? null;
  console.log(props.options);
  return (
    <div className="toolbar-drop-down">
      <ToolbarButton
        title={selectedOption?.title ?? props.placeholder ?? "Select value"}
        label={selectedOption?.title ?? props.placeholder ?? "Select Value"}
        onClick={() => {
          setIsOpen((isOpen) => !isOpen);
        }}
      />
      {isOpen ? (
        <ToolbarDropDownMenu>
          {props.options.map((item, index) => (
            <ToolbarDropDownMenuItem
              key={item.value}
              item={item}
              isActive={index === props.activeOptionIndex}
              onClick={() => {
                props.onSelectOption(index);
                setIsOpen(false);
              }}
            />
          ))}
        </ToolbarDropDownMenu>
      ) : null}
    </div>
  );
};
