import React, { useState, useEffect } from "react";
import { DateRangePicker } from "react-bootstrap-daterangepicker";
import moment from "moment";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-daterangepicker/daterangepicker.css";
import "./style.css";

interface DateRange {
  start: string;
  end: string;
}

interface PredefinedDateRangesProps {
  onChange?: (range: DateRange) => void;
  value?: DateRange;
}

const PredefinedDateRanges: React.FC<PredefinedDateRangesProps> = ({
  onChange,
  value,
}) => {
  const defaultStart = moment.utc("1970-01-01T00:00:00Z");
  const defaultEnd = moment.utc();

  const [range, setRange] = useState<DateRange>(() => {
    if (value) {
      return { start: value.start, end: value.end };
    } else {
      return {
        start: defaultStart.toISOString(),
        end: defaultEnd.toISOString(),
      };
    }
  });

  useEffect(() => {
    if (value) {
      setRange({
        start: value.start,
        end: value.end,
      });
    }
  }, [value]);

  const handleApply = (event: any, picker: any) => {
    const newRange = {
      start: picker.startDate.utc().toISOString(),
      end: picker.endDate.utc().toISOString(),
    };
    setRange(newRange);
    onChange?.(newRange);
  };

  const startMoment = moment.utc(range.start);
  const endMoment = moment.utc(range.end);

  const isAllTime =
    startMoment.isSame(defaultStart, "day") &&
    endMoment.isSame(defaultEnd, "day");

  const label = isAllTime
    ? "All Time"
    : `${startMoment.format("MM/DD/YYYY")} - ${endMoment.format("MM/DD/YYYY")}`;

  return (
    <div className="date-range-container" style={{ minWidth: "250px" }}>
      <DateRangePicker
        initialSettings={{
          startDate: startMoment.toDate(),
          endDate: endMoment.toDate(),
          ranges: {
            "All Time": [defaultStart.toDate(), defaultEnd.toDate()],
            "Today": [
              moment.utc().startOf("day").toDate(),
              moment.utc().endOf("day").toDate(),
            ],
            "Yesterday": [              
              moment.utc().subtract(1, "days").startOf("day").toDate(),
              moment.utc().subtract(1, "days").endOf("day").toDate(),
            ],
            "Last 7 Days": [
              moment.utc().subtract(6, "days").startOf("day").toDate(),
              moment.utc().endOf("day").toDate(),
            ],
            "Last 30 Days": [
              moment.utc().subtract(29, "days").startOf("day").toDate(),
              moment.utc().endOf("day").toDate(),
            ],
            "This Month": [
              moment.utc().startOf("month").toDate(),
              moment.utc().endOf("month").toDate(),
            ],
            "Last Month": [
              moment.utc().subtract(1, "month").startOf("month").toDate(),
              moment.utc().subtract(1, "month").endOf("month").toDate(),
            ],
          },
        }}
        onApply={handleApply}
      >
        {/* Replace select with button to avoid two dropdowns */}
        <button
          type="button"
          className="btn outline-grey"
          style={{
            minWidth: "250px",
            textAlign: "left",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            outlineWidth: "1px",
            border: "1px #EAE0E3 solid",
          }}
        >
          <span>{label}</span>
        </button>
      </DateRangePicker>
    </div>
  );
};

export default PredefinedDateRanges;
