import React, { useEffect, useState, useMemo} from "react";
import Select from "react-select";

export type Option = {
  value: string;
  label: string;
};

export interface SelectProps {
  options: Option[];
  defaultValue?: Option | string; // Accept both Option objects and string labels
  className?: string;
  onChange?: (selectedOption: Option | null) => void;
  isSearchable?: boolean;
  disabled?: boolean; // <-- Add disabled here
}

const CommonSelect: React.FC<SelectProps> = ({
  options,
  defaultValue,
  className,
  onChange,
  isSearchable = true,
  disabled = false, // <-- Default false
}) => {
  const findOptionByLabel = (label: string): Option | null => {
    return options.find((opt) => opt.label === label) || null;
  };

  const getInitialValue = (): Option | null => {
    if (!defaultValue) return null;
    if (typeof defaultValue === "string") {
      return findOptionByLabel(defaultValue);
    }
    return defaultValue;
  };

  const [selectedOption, setSelectedOption] = useState<Option | null>(
    getInitialValue()
  );

  const handleChange = (option: Option | null) => {
    setSelectedOption(option);
    onChange?.(option);
  };

  useEffect(() => {
    setSelectedOption(getInitialValue());
  }, [defaultValue, options]);

  return (
    <Select
      classNamePrefix="react-select"
      className={className}
      options={options}
      value={selectedOption}
      onChange={handleChange}
      placeholder="Select"
      isSearchable={isSearchable}
      isDisabled={disabled} // <-- pass it here to react-select
    />
  );
};

export default CommonSelect;
