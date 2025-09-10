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
  disabled?: boolean;
}

const CommonSelect: React.FC<SelectProps> = ({
  options,
  defaultValue,
  className,
  onChange,
  isSearchable = true,
  disabled = false,
}) => {
  const findOptionByLabel = (label: string): Option | null => {
    return options.find((opt) => opt.label === label) || null;
  };

  const findOptionByValue = (value: string): Option | null => {
    return options.find((opt) => opt.value === value) || null;
  };

  const getInitialValue = (): Option | null => {
    if (!defaultValue) return null;
    
    if (typeof defaultValue === "string") {
      // Try to find by label first, then by value
      return findOptionByLabel(defaultValue) || findOptionByValue(defaultValue) || null;
    }

    return defaultValue;
  };

  const [selectedOption, setSelectedOption] = useState<Option | null>(
    getInitialValue()
  );

  const handleChange = (option: Option | null) => {
    setSelectedOption(option);
    if (onChange) {
      onChange(option);
    }
  };

  useEffect(() => {
    const newValue = getInitialValue();
    setSelectedOption(newValue);
  }, [defaultValue, options]);

  return (
    <Select
      value={selectedOption}
      onChange={handleChange}
      options={options}
      isSearchable={isSearchable}
      className={className}
      isDisabled={disabled}
      placeholder="Select..."
      isClearable
      // Ensure we never render objects as children
      getOptionLabel={(option: Option) => option.label || ""}
      getOptionValue={(option: Option) => option.value || ""}
    />
  );
};

export default CommonSelect;
