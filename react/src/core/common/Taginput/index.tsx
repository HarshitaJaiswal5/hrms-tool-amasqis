import React from "react";
import { TagsInput } from "react-tag-input-component";
import "./Taginput.css";

interface CommonTagsInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    className?: string;
}

const CommonTagsInput: React.FC<CommonTagsInputProps> = ({
    value,
    onChange,
    placeholder = "Add a tag",
}) => {
    return (
        <div className="custom-tags-container">
            <TagsInput
                value={value}
                onChange={onChange}
                placeHolder={placeholder}
                classNames={{
                    input: 'custom-tag-input',
                    tag: 'custom-tag-chip'
                }}
            />
        </div>
    );
};

export default CommonTagsInput;
